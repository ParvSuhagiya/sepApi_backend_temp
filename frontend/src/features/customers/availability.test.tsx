import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { useState, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { ENV } from '../../env';
import { jsonError, jsonOk, leadsSuccess } from '../../test/fixtures';
import '../../test/msw';
import { server } from '../../test/msw';
import { useCustomerAvailability } from './availability';

const api = (path: string) => `${ENV.apiUrl}${path}`;

function wrapper({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useCustomerAvailability', () => {
  it('is available when the probe succeeds', async () => {
    server.use(http.post(api('/api/leads'), () => jsonOk(leadsSuccess)));
    const { result } = renderHook(() => useCustomerAvailability(), { wrapper });
    await waitFor(() => expect(result.current.checking).toBe(false));
    expect(result.current.available).toBe(true);
  });

  it('hides the mode on 404 feature_disabled', async () => {
    server.use(
      http.post(api('/api/leads'), () => jsonError('feature_disabled', 'off', 404)),
    );
    const { result } = renderHook(() => useCustomerAvailability(), { wrapper });
    await waitFor(() => expect(result.current.checking).toBe(false));
    expect(result.current.available).toBe(false);
  });

  it('hides the mode when the route is missing entirely', async () => {
    server.use(
      http.post(api('/api/leads'), () => HttpResponse.json({ detail: 'gone' }, { status: 404 })),
    );
    const { result } = renderHook(() => useCustomerAvailability(), { wrapper });
    await waitFor(() => expect(result.current.checking).toBe(false));
    expect(result.current.available).toBe(false);
  });

  it('stays visible on upstream or rate-limit wobbles', async () => {
    server.use(http.post(api('/api/leads'), () => jsonError('upstream_failure', 'y', 502)));
    const { result } = renderHook(() => useCustomerAvailability(), { wrapper });
    await waitFor(() => expect(result.current.checking).toBe(false));
    expect(result.current.available).toBe(true);
  });

  it('stays visible on network failure and reports checking while pending', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.post(api('/api/leads'), async () => {
        await gate;
        return jsonOk(leadsSuccess);
      }),
    );
    const { result } = renderHook(() => useCustomerAvailability(), { wrapper });
    expect(result.current.checking).toBe(true);
    expect(result.current.available).toBe(true);
    release();
    await waitFor(() => expect(result.current.checking).toBe(false));
    expect(result.current.available).toBe(true);
  });
});
