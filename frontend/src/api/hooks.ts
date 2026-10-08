import { useMutation, useQuery } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';
import {
  health as fetchHealth,
  leads as fetchLeads,
  outreach as fetchOutreach,
  search as fetchSearch,
  type LeadsInput,
  type OutreachTarget,
  type SearchInput,
} from './client';
import { ApiError } from './errors';
import type { LeadsResponse, OutreachResponse, SearchResponse } from './schemas';

export type { LeadsResponse, OutreachResponse, SearchResponse };

interface CancellableOptions {
  signal: AbortSignal;
  onRetry: () => void;
}

/**
 * POST mutation with AbortController cancellation, a `retrying` flag for the
 * cold-start message, and silent handling of user cancellation.
 */
function useCancellableMutation<TData, TVariables>(
  fn: (input: TVariables, options: CancellableOptions) => Promise<TData>,
) {
  const [retrying, setRetrying] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const mutation = useMutation({
    mutationFn: (input: TVariables) => {
      const controller = new AbortController();
      abortRef.current = controller;
      return fn(input, {
        signal: controller.signal,
        onRetry: () => setRetrying(true),
      });
    },
    onSettled: () => setRetrying(false),
    onError: (error) => {
      if (error instanceof ApiError && error.code === 'cancelled') {
        mutation.reset();
      }
    },
  });

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { ...mutation, retrying, cancel };
}

export function useSearch() {
  return useCancellableMutation<SearchResponse, SearchInput>((input, options) =>
    fetchSearch(input, { retry: true, ...options }),
  );
}

export function useLeads() {
  return useCancellableMutation<LeadsResponse, LeadsInput>((input, options) =>
    fetchLeads(input, { retry: true, ...options }),
  );
}

export function useOutreach() {
  return useCancellableMutation<
    OutreachResponse,
    { profile: SearchInput; target: OutreachTarget }
  >((input, options) => fetchOutreach(input.profile, input.target, options));
}

/** Fetched once on load; drives the footer API-status dot, never blocks. */
export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
    staleTime: Infinity,
    gcTime: 10 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });
}
