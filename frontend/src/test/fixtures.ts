import { HttpResponse, http } from 'msw';
import { ENV } from '../env';

const api = (path: string) => `${ENV.apiUrl}${path}`;

export function errorEnvelope(code: string, message: string, requestId = 'req-test') {
  return { error: { code, message, request_id: requestId } };
}

export function jsonOk(data: Record<string, unknown>, status = 200, headers?: Record<string, string>) {
  return HttpResponse.json(data, { status, headers });
}

export function jsonError(
  code: string,
  message: string,
  status: number,
  headers?: Record<string, string>,
) {
  return HttpResponse.json(errorEnvelope(code, message), { status, headers });
}

export const searchSuccess = {
  opportunities: [
    {
      title: 'Tailoring from home',
      type: 'local business',
      why: 'Fits stitching skills.',
      income_estimate: '₹8,000/month (estimate)',
      demand: 70,
      competition: 40,
      fit: 90,
      cost_ease: 85,
      trust: 75,
      evidence: ['Local demand noted', 'Forum mentions steady rates'],
      plan_7_days: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
      earn_score: 78,
      score_breakdown: { demand: 21.0 },
      adjustments: [],
    },
  ],
  jobs: [],
  local: [
    {
      name: 'Sharma Tailoring',
      rating: 4.5,
      reviews: 120,
      phone: '+91 98220 12345',
      address: 'MG Road Pune',
      type: 'Tailor',
      lat: 18.5204,
      lng: 73.8567,
    },
  ],
  trend: [],
  trend_keyword: null,
  trend_growth: {},
  forum: [],
  stats: { credits_used: 0, cache_hits: 1 },
  meta: {
    request_id: 'req-1',
    duration_ms: 120,
    degraded: [],
    partial: [],
    notes: [],
    city_center: null,
  },
};

export const leadsSuccess = {
  schema_version: '1.0',
  offer_summary: 'Restaurant billing software',
  leads: [
    {
      name: 'Sharma Restaurant',
      address: 'MG Road Ahmedabad',
      rating: 4.2,
      user_ratings_total: 320,
      business_type: 'Restaurant',
      match_score: 82,
      match_reasons: ['Rated 4.2 from 320 reviews'],
      research_notes: 'bill was wrong',
      why_fit: 'Rated 4.2 from 320 reviews.',
      pitch_angle: 'Cut billing errors.',
      suggested_first_question: 'How do you bill today?',
      phone: '919822012345',
      maps_url: 'https://maps.google.com/?q=sharma',
      price_level: 2,
      score_breakdown: { mid_level: 100 },
      likely_has_software: false,
      adjustments: [],
    },
  ],
  market_notes: ['Several vendors sell billing software.'],
  meta: {
    credits_used: 7,
    cache_hits: 0,
    degraded: [],
    partial: [],
    notes: [],
    timings_ms: { plan: 1 },
  },
  disclaimer: 'Lead scores are signals.',
};

export const outreachSuccess = {
  message: 'Hello, I do tailoring work in Pune.',
  safety_note: 'Verify the business before paying or sharing documents.',
};

export const healthSuccess = { ok: true, version: '1.0.0' };

export function postHandler(path: string, responder: () => Response) {
  return http.post(api(path), responder);
}
