import { useQuery } from '@tanstack/react-query';
import { ApiError } from '../../api/errors';
import { leads } from '../../api/client';

/**
 * Minimal valid probe: the smallest `max_leads` keeps server work low, and
 * the fixed payload is served from the leads response cache (when enabled)
 * on repeat loads. Mostly letters so it passes the backend text check.
 */
const PROBE_INPUT = {
  offer:
    'Restaurant management software helping local restaurants handle billing orders and staff duties',
  city: 'Ahmedabad',
  max_leads: 5,
} as const;

export interface CustomerAvailability {
  /** False only on a confirmed 404 (feature_disabled or missing route). */
  available: boolean;
  /** True while the single probe is in flight. */
  checking: boolean;
}

/**
 * Capability check for customer mode. Optimistic: the tab stays visible
 * while checking and on any non-404 outcome (rate limits, upstream wobbles,
 * network errors all mean the mode exists). Only a 404 hides the tab, so a
 * disabled deployment never shows anything broken.
 */
export function useCustomerAvailability(): CustomerAvailability {
  const query = useQuery({
    queryKey: ['customer-availability'],
    queryFn: async (): Promise<boolean> => {
      try {
        await leads({ ...PROBE_INPUT });
        return true;
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return false;
        return true;
      }
    },
    staleTime: Infinity,
    gcTime: 60 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  if (query.data === false) return { available: false, checking: false };
  return { available: true, checking: query.isPending };
}
