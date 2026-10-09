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
import { useSearch } from '../../api/hooks';
import type { SearchResponse } from '../../api/schemas';
import type { SearchInput } from '../../api/client';

export type SearchStatus = 'idle' | 'loading' | 'success' | 'error';

interface SearchSnapshot {
  status: SearchStatus;
  profile: SearchInput | null;
  result: SearchResponse | null;
  error: ApiError | null;
}

export interface SearchSession extends SearchSnapshot {
  retrying: boolean;
  run: (profile: SearchInput) => void;
  retry: () => void;
  cancel: () => void;
}

const IDLE: SearchSnapshot = { status: 'idle', profile: null, result: null, error: null };

const SearchSessionContext = createContext<SearchSession | null>(null);

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
 * Income-search session kept above the router, so switching tabs or modes
 * never loses the last profile, result, or error.
 */
export function SearchSessionProvider({ children }: { children: ReactNode }) {
  const search = useSearch();
  const [snapshot, setSnapshot] = useState<SearchSnapshot>(IDLE);
  const requestRef = useRef(0);
  const settledRef = useRef<SearchSnapshot>(IDLE);
  const lastProfileRef = useRef<SearchInput | null>(null);

  const run = useCallback(
    (profile: SearchInput) => {
      const id = (requestRef.current += 1);
      lastProfileRef.current = profile;
      setSnapshot((prev) => ({ status: 'loading', profile, result: prev.result, error: null }));
      search.mutate(profile, {
        onSuccess: (data) => {
          if (requestRef.current !== id) return;
          const next: SearchSnapshot = { status: 'success', profile, result: data, error: null };
          settledRef.current = next;
          setSnapshot(next);
        },
        onError: (error) => {
          if (requestRef.current !== id) return;
          if (error instanceof ApiError && error.code === 'cancelled') {
            setSnapshot(settledRef.current);
            return;
          }
          const next: SearchSnapshot = {
            status: 'error',
            profile,
            result: settledRef.current.result,
            error: toApiError(error),
          };
          settledRef.current = next;
          setSnapshot(next);
        },
      });
    },
    [search.mutate],
  );

  const retry = useCallback(() => {
    const profile = lastProfileRef.current;
    if (profile) run(profile);
  }, [run]);

  const cancel = useCallback(() => {
    search.cancel();
  }, [search.cancel]);

  const value = useMemo<SearchSession>(
    () => ({ ...snapshot, retrying: search.retrying, run, retry, cancel }),
    [snapshot, search.retrying, run, retry, cancel],
  );
  return <SearchSessionContext.Provider value={value}>{children}</SearchSessionContext.Provider>;
}

export function useSearchSession(): SearchSession {
  const session = useContext(SearchSessionContext);
  if (!session) throw new Error('useSearchSession must be used inside SearchSessionProvider');
  return session;
}
