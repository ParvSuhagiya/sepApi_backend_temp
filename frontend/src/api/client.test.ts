import { HttpResponse, http } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { leads, outreach, search } from './client';
import { ApiError } from './errors';
import { ENV } from '../env';
import {
  jsonError,
  jsonOk,
  leadsSuccess,
  outreachSuccess,
  searchSuccess,
} from '../test/fixtures';
import '../test/msw';
import { server } from '../test/msw';

const api = (path: string) => `${ENV.apiUrl}${path}`;
const PROFILE = { skills: 'x', city: 'Pune', hours: 10, budget: 0 };
const LEADS_INPUT = { offer: 'x'.repeat(30), city: 'Ahmedabad', max_leads: 10 };

describe('api client', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('returns parsed search results on success', async () => {
    server.use(http.post(api('/api/search'), () => jsonOk(searchSuccess)));
    const data = await search({ ...PROFILE, skills: 'tailoring' });
    expect(data.meta.request_id).toBe('req-1');
    expect(data.opportunities).toHaveLength(1);
  });

  it('maps the backend error envelope', async () => {
    server.use(
      http.post(api('/api/search'), () => jsonError('unauthorized', 'no', 401)),
    );
    await expect(search(PROFILE)).rejects.toMatchObject({
      code: 'unauthorized',
      status: 401,
      requestId: 'req-test',
    });
    try {
      await search(PROFILE);
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).message).toMatch(/access code/i);
    }
  });

  it('uses Retry-After for 429 messages', async () => {
    server.use(
      http.post(api('/api/search'), () =>
        jsonError('rate_limited', 'slow', 429, { 'Retry-After': '120' }),
      ),
    );
    try {
      await search(PROFILE);
      expect.unreachable();
    } catch (err) {
      const apiError = err as ApiError;
      expect(apiError.message).toMatch(/120 seconds/);
      expect(apiError.retryAfter).toBe(120);
    }
  });

  it('maps budget_exhausted to the daily-capacity copy', async () => {
    server.use(http.post(api('/api/leads'), () => jsonError('budget_exhausted', 'tired', 429)));
    try {
      await leads(LEADS_INPUT);
      expect.unreachable();
    } catch (err) {
      expect((err as ApiError).message).toMatch(/daily capacity/i);
    }
  });

  it('maps 413 to the too-large copy', async () => {
    server.use(http.post(api('/api/search'), () => jsonError('invalid_input', 'too large', 413)));
    try {
      await search(PROFILE);
      expect.unreachable();
    } catch (err) {
      expect((err as ApiError).message).toMatch(/too large/i);
    }
  });

  it('maps 422 field errors to inline messages', async () => {
    server.use(
      http.post(api('/api/search'), () =>
        jsonError('invalid_input', 'Invalid request: city, skills.', 422),
      ),
    );
    try {
      await search(PROFILE);
      expect.unreachable();
    } catch (err) {
      const apiError = err as ApiError;
      expect(apiError.fields).toEqual(['city', 'skills']);
      expect(apiError.message).toContain('Invalid request');
    }
  });

  it('maps feature_disabled 404 for leads', async () => {
    server.use(http.post(api('/api/leads'), () => jsonError('feature_disabled', 'off', 404)));
    try {
      await leads(LEADS_INPUT);
      expect.unreachable();
    } catch (err) {
      expect((err as ApiError).message).toMatch(/switched off/i);
    }
  });

  it('retries once on 502 then succeeds', async () => {
    let calls = 0;
    server.use(
      http.post(api('/api/search'), () => {
        calls += 1;
        return calls === 1 ? jsonError('upstream_failure', 'y', 502) : jsonOk(searchSuccess);
      }),
    );
    await expect(search(PROFILE)).resolves.toMatchObject({
      meta: { request_id: 'req-1' },
    });
    expect(calls).toBe(2);
  });

  it('retries once on network failure', async () => {
    let calls = 0;
    server.use(
      http.post(api('/api/search'), () => {
        calls += 1;
        return calls === 1 ? HttpResponse.error() : jsonOk(searchSuccess);
      }),
    );
    const data = await search(PROFILE);
    expect(data.meta.request_id).toBe('req-1');
    expect(calls).toBe(2);
  });

  it('does not retry outreach', async () => {
    let calls = 0;
    server.use(
      http.post(api('/api/outreach'), () => {
        calls += 1;
        return jsonError('upstream_failure', 'y', 502);
      }),
    );
    await expect(outreach(PROFILE, { name: 'S' })).rejects.toMatchObject({ status: 502 });
    expect(calls).toBe(1);
  });

  it('exposes a retrying flag via onRetry', async () => {
    let calls = 0;
    const seen: boolean[] = [];
    server.use(
      http.post(api('/api/search'), () => {
        calls += 1;
        return calls === 1 ? jsonError('upstream_failure', 'y', 502) : jsonOk(searchSuccess);
      }),
    );
    await search(PROFILE, { onRetry: () => seen.push(true) });
    expect(seen).toEqual([true]);
  });

  it('shows a friendly message for 500 without raw text', async () => {
    server.use(
      http.post(api('/api/outreach'), () =>
        jsonError('internal', 'db exploded at TABLE users', 500),
      ),
    );
    try {
      await outreach(PROFILE, { name: 'S' });
      expect.unreachable();
    } catch (err) {
      expect((err as ApiError).message).toBe(
        "We couldn't finish this search. Please try again in a minute.",
      );
    }
  });

  it('times out after 60s without raw errors', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, options?: { signal?: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            options?.signal?.addEventListener('abort', () => {
              reject(new DOMException('Aborted', 'AbortError'));
            });
          }),
      ),
    );
    // Outreach never retries, so exactly one 60s timer governs this test.
    const pending = outreach(PROFILE, { name: 'S' });
    const assertion = expect(pending).rejects.toMatchObject({ code: 'network_error' });
    await vi.advanceTimersByTimeAsync(60_000);
    await assertion;
  });

  it('sends X-Access-Code only when configured', async () => {
    vi.stubEnv('VITE_ACCESS_CODE', 'secret-code');
    vi.resetModules();
    try {
      const fresh = (await import('./client')) as typeof import('./client');
      let seen: string | null | 'unset' = 'unset';
      server.use(
        http.post(api('/api/search'), ({ request }) => {
          seen = request.headers.get('X-Access-Code');
          return jsonOk(searchSuccess);
        }),
      );
      await fresh.search(PROFILE);
      expect(seen).toBe('secret-code');
    } finally {
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });

  it('omits X-Access-Code when unconfigured', async () => {
    let seen: string | null | 'unset' = 'unset';
    server.use(
      http.post(api('/api/search'), ({ request }) => {
        seen = request.headers.get('X-Access-Code');
        return jsonOk(searchSuccess);
      }),
    );
    await search(PROFILE);
    expect(seen).toBeNull();
  });

  it('posts leads and outreach payloads', async () => {
    server.use(
      http.post(api('/api/leads'), () => jsonOk(leadsSuccess)),
      http.post(api('/api/outreach'), () => jsonOk(outreachSuccess)),
    );
    await expect(leads(LEADS_INPUT)).resolves.toMatchObject({ schema_version: '1.0' });
    await expect(outreach(PROFILE, { name: 'S' })).resolves.toMatchObject({
      safety_note: expect.any(String),
    });
  });
});
