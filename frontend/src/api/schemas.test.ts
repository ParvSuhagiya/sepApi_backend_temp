import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { leads, search } from './client';
import { ENV } from '../env';
import { jsonOk, leadsSuccess, searchSuccess } from '../test/fixtures';
import '../test/msw';
import { server } from '../test/msw';

const api = (path: string) => `${ENV.apiUrl}${path}`;
const input = { skills: 'tailoring', city: 'Pune', hours: 10, budget: 0 };
const offerInput = { offer: 'x'.repeat(30), city: 'Ahmedabad', max_leads: 10 };

describe('schema drift', () => {
  it('strips extra backend fields gracefully', async () => {
    server.use(
      http.post(
        api('/api/search'),
        () =>
          jsonOk({
            ...searchSuccess,
            future_field: 'new stuff',
            local: [
              { ...searchSuccess.local[0], lat: 1.1, lng: 2.2, brand_new: true },
            ],
          }),
      ),
    );
    const data = await search(input);
    expect(data.meta.request_id).toBe('req-1');
    expect(data.local[0]).not.toHaveProperty('brand_new');
    expect(data.local[0]).not.toHaveProperty('future_field');
  });

  it('accepts missing optional fields', async () => {
    server.use(
      http.post(
        api('/api/search'),
        () =>
          jsonOk({
            ...searchSuccess,
            trend_keyword: null,
            local: [{ name: 'Bare Shop' }],
          }),
      ),
    );
    const data = await search(input);
    expect(data.local[0]?.name).toBe('Bare Shop');
    expect(data.local[0]?.phone).toBeUndefined();
  });

  it('fails friendly when a required field is missing', async () => {
    server.use(
      http.post(
        api('/api/search'),
        () =>
          jsonOk({
            ...searchSuccess,
            opportunities: [{ ...searchSuccess.opportunities[0], title: undefined }],
          }),
      ),
    );
    try {
      await search(input);
      expect.unreachable();
    } catch (err) {
      const apiError = err as { code: string; message: string };
      expect(apiError.code).toBe('schema_error');
      expect(apiError.message).toMatch(/unexpected response/i);
    }
  });

  it('fails friendly on an unknown enum value', async () => {
    server.use(
      http.post(
        api('/api/search'),
        () =>
          jsonOk({
            ...searchSuccess,
            jobs: [
              {
                title: 'X',
                company: 'Y',
                location: 'Z',
                via: '',
                salary: null,
                desc: 'd',
                link: null,
                flags: [],
                risk: 'Extreme',
                lat: null,
                lng: null,
                geo_precision: null,
              },
            ],
          }),
      ),
    );
    try {
      await search(input);
      expect.unreachable();
    } catch (err) {
      expect((err as { code: string }).code).toBe('schema_error');
    }
  });

  it('survives a non-JSON error body', async () => {
    server.use(
      http.post(api('/api/search'), () => new HttpResponse('gateway melted', { status: 502 })),
    );
    try {
      await search(input, { retry: false });
      expect.unreachable();
    } catch (err) {
      const apiError = err as { code: string; message: string };
      expect(apiError.code).toBe('request_failed');
      expect(apiError.message).toMatch(/try again in a minute/i);
    }
  });
});

describe('lead forward-compat fields', () => {
  it('keeps website, research, snippets and coords when the backend sends them', async () => {
    server.use(
      http.post(api('/api/leads'), () =>
        jsonOk({
          ...leadsSuccess,
          leads: [
            {
              ...leadsSuccess.leads[0],
              website: 'https://sharma.example',
              research: 'partial',
              pain_snippets: ['bill was wrong'],
              lat: 23.0225,
              lng: 72.5714,
            },
          ],
        }),
      ),
    );
    const data = await leads(offerInput);
    expect(data.leads[0]?.website).toBe('https://sharma.example');
    expect(data.leads[0]?.research).toBe('partial');
    expect(data.leads[0]?.pain_snippets).toEqual(['bill was wrong']);
    expect(data.leads[0]?.lat).toBe(23.0225);
  });

  it('accepts leads without the extras', async () => {
    server.use(http.post(api('/api/leads'), () => jsonOk(leadsSuccess)));
    const data = await leads(offerInput);
    expect(data.leads[0]?.website).toBeUndefined();
    expect(data.leads[0]?.research).toBeUndefined();
  });
});
