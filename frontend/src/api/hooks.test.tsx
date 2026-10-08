import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { useState, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { ApiError } from './errors';
import { useHealth, useLeads, useSearch } from './hooks';
import { ENV } from '../env';
import { jsonError, jsonOk, leadsSuccess, searchSuccess } from '../test/fixtures';
import '../test/msw';
import { server } from '../test/msw';

const api = (path: string) => `${ENV.apiUrl}${path}`;
const PROFILE = { skills: 'x', city: 'Pune', hours: 10, budget: 0 };
const LEADS_INPUT = { offer: 'x'.repeat(30), city: 'Ahmedabad', max_leads: 10 };

function wrapper({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useSearch', () => {
  it('resolves with parsed data', async () => {
    server.use(http.post(api('/api/search'), () => jsonOk(searchSuccess)));
    const { result } = renderHook(() => useSearch(), { wrapper });
    expect(result.current.retrying).toBe(false);
    result.current.mutate({ skills: 'tailoring', city: 'Pune', hours: 10, budget: 0 });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.opportunities).toHaveLength(1);
    expect(result.current.retrying).toBe(false);
  });

  it('surfaces ApiError on failure', async () => {
    server.use(http.post(api('/api/search'), () => jsonError('upstream_failure', 'y', 502)));
    const { result } = renderHook(() => useSearch(), { wrapper });
    result.current.mutate(PROFILE);
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
  });

  it('swallows user cancellation back to idle', async () => {
    server.use(
      http.post(api('/api/search'), async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return jsonOk(searchSuccess);
      }),
    );
    const { result } = renderHook(() => useSearch(), { wrapper });
    result.current.mutate(PROFILE);
    await waitFor(() => expect(result.current.isPending).toBe(true));
    result.current.cancel();
    await waitFor(() => expect(result.current.isIdle).toBe(true));
    expect(result.current.error).toBeNull();
  });
});

describe('useLeads', () => {
  it('resolves with parsed leads', async () => {
    server.use(http.post(api('/api/leads'), () => jsonOk(leadsSuccess)));
    const { result } = renderHook(() => useLeads(), { wrapper });
    result.current.mutate(LEADS_INPUT);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.leads).toHaveLength(1);
  });
});

describe('useHealth', () => {
  it('fetches once on load and never blocks', async () => {
    let calls = 0;
    server.use(
      http.get(api('/api/health'), () => {
        calls += 1;
        return jsonOk({ ok: true, version: '1.0.0' });
      }),
    );
    const { result, rerender } = renderHook(() => useHealth(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ ok: true, version: '1.0.0' });
    rerender();
    rerender();
    expect(calls).toBe(1);
  });
});
