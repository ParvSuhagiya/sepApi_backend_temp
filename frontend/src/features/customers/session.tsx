import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ApiError } from '../../api/errors';
import { useLeads } from '../../api/hooks';
import type { LeadsResponse } from '../../api/schemas';
import type { LeadsInput } from '../../api/client';

export type LeadsStatus = 'idle' | 'loading' | 'success' | 'error';

interface LeadsSnapshot {
  status: LeadsStatus;
  input: LeadsInput | null;
  result: LeadsResponse | null;
  error: ApiError | null;
}

export interface LeadsSession extends LeadsSnapshot {
  retrying: boolean;
  run: (input: LeadsInput) => void;
  retry: () => void;
  cancel: () => void;
}

const IDLE: LeadsSnapshot = { status: 'idle', input: null, result: null, error: null };

const LeadsSessionContext = createContext<LeadsSession | null>(null);

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  return new ApiError({
    code: 'request_failed',
    status: 0,
    message: 'Something went wrong. Please try again.',
    requestId: null,
    retryAfter: null,
  });
}

/**
 * Customer-search session kept above the router, so switching tabs or modes
 * never loses the last offer, result, or error. Mirrors the income-search
 * session; the two sessions are independent.
 */
export function LeadsSessionProvider({ children }: { children: ReactNode }) {
  const leads = useLeads();
  const [snapshot, setSnapshot] = useState<LeadsSnapshot>(IDLE);
  const requestRef = useRef(0);
  const settledRef = useRef<LeadsSnapshot>(IDLE);
  const lastInputRef = useRef<LeadsInput | null>(null);

  const run = useCallback(
    (input: LeadsInput) => {
      const id = (requestRef.current += 1);
      lastInputRef.current = input;
      setSnapshot((prev) => ({ status: 'loading', input, result: prev.result, error: null }));
      leads.mutate(input, {
        onSuccess: (data) => {
          if (requestRef.current !== id) return;
          const next: LeadsSnapshot = { status: 'success', input, result: data, error: null };
          settledRef.current = next;
          setSnapshot(next);
        },
        onError: (error) => {
          if (requestRef.current !== id) return;
          if (error instanceof ApiError && error.code === 'cancelled') {
            setSnapshot(settledRef.current);
            return;
          }
          const next: LeadsSnapshot = {
            status: 'error',
            input,
            result: settledRef.current.result,
            error: toApiError(error),
          };
          settledRef.current = next;
          setSnapshot(next);
        },
      });
    },
    [leads.mutate],
  );

  const retry = useCallback(() => {
    const input = lastInputRef.current;
    if (input) run(input);
  }, [run]);

  const cancel = useCallback(() => {
    leads.cancel();
  }, [leads.cancel]);

  const value = useMemo<LeadsSession>(
    () => ({ ...snapshot, retrying: leads.retrying, run, retry, cancel }),
    [snapshot, leads.retrying, run, retry, cancel],
  );
  return <LeadsSessionContext.Provider value={value}>{children}</LeadsSessionContext.Provider>;
}

export function useLeadsSession(): LeadsSession {
  const session = useContext(LeadsSessionContext);
  if (!session) throw new Error('useLeadsSession must be used inside LeadsSessionProvider');
  return session;
}

/**
 * Optional session read for pure view components. Returns null outside the
 * provider instead of throwing, so the view still renders without context.
 */
export function useOptionalLeadsSession(): LeadsSession | null {
  return useContext(LeadsSessionContext);
}
