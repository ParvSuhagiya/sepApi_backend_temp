/**
 * Runtime validation of every API response. Objects are non-strict, so the
 * app degrades gracefully when the backend adds fields; missing required
 * fields or wrong types become a friendly schema-drift error instead of a
 * crash. Request bodies reuse the generated OpenAPI types.
 */
import { z } from 'zod';

export const errorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    request_id: z.string(),
  }),
});

const opportunitySchema = z.object({
  title: z.string(),
  type: z.enum(['job', 'freelance', 'local business', 'online selling', 'content']),
  why: z.string(),
  income_estimate: z.string(),
  demand: z.number(),
  competition: z.number(),
  fit: z.number(),
  cost_ease: z.number(),
  trust: z.number(),
  evidence: z.array(z.string()),
  plan_7_days: z.array(z.string()),
  earn_score: z.number(),
  score_breakdown: z.record(z.string(), z.number()),
  adjustments: z.array(z.string()),
});

const geoPrecisionSchema = z.enum(['city', 'approximate']).nullable().optional();

const jobSchema = z.object({
  title: z.string(),
  company: z.string(),
  location: z.string(),
  via: z.string().optional(),
  salary: z.string().nullable().optional(),
  desc: z.string().optional(),
  link: z.string().nullable().optional(),
  flags: z.array(z.string()).optional(),
  risk: z.enum(['Low', 'Medium', 'High']).optional(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  geo_precision: geoPrecisionSchema,
});

const placeSchema = z.object({
  name: z.string(),
  rating: z.number().nullable().optional(),
  reviews: z.number().nullable().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  type: z.string().nullable().optional(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
});

const cityCenterSchema = z
  .object({ lat: z.number(), lng: z.number() })
  .nullable()
  .optional();

export const searchResponseSchema = z.object({
  opportunities: z.array(opportunitySchema),
  jobs: z.array(jobSchema),
  local: z.array(placeSchema),
  trend: z.array(z.object({ date: z.string(), value: z.number() })),
  trend_keyword: z.string().nullable(),
  trend_growth: z.record(z.string(), z.number()),
  forum: z.array(
    z.object({ title: z.string(), link: z.string(), snippet: z.string() }),
  ),
  stats: z.object({ credits_used: z.number(), cache_hits: z.number() }),
  meta: z.object({
    request_id: z.string(),
    duration_ms: z.number(),
    degraded: z.array(z.string()),
    partial: z.array(z.string()),
    notes: z.array(z.string()),
    city_center: cityCenterSchema,
  }),
});

const leadSchema = z.object({
  name: z.string(),
  address: z.string().nullable().optional(),
  rating: z.number().nullable().optional(),
  user_ratings_total: z.number().nullable().optional(),
  business_type: z.string().nullable().optional(),
  match_score: z.number(),
  match_reasons: z.array(z.string()),
  research_notes: z.string().nullable().optional(),
  why_fit: z.string().nullable().optional(),
  pitch_angle: z.string().nullable().optional(),
  suggested_first_question: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  maps_url: z.string().nullable().optional(),
  price_level: z.number().nullable().optional(),
  score_breakdown: z.record(z.string(), z.number()),
  likely_has_software: z.boolean(),
  adjustments: z.array(z.string()),
});

export const leadsResponseSchema = z.object({
  schema_version: z.string(),
  offer_summary: z.string(),
  leads: z.array(leadSchema),
  market_notes: z.array(z.string()),
  meta: z.object({
    credits_used: z.number(),
    cache_hits: z.number(),
    degraded: z.array(z.string()),
    partial: z.array(z.string()),
    notes: z.array(z.string()),
    timings_ms: z.record(z.string(), z.number()),
  }),
  disclaimer: z.string(),
});

export const outreachResponseSchema = z.object({
  message: z.string(),
  safety_note: z.string(),
});

export const healthSchema = z.object({
  ok: z.boolean(),
  version: z.string(),
});

export type SearchResponse = z.infer<typeof searchResponseSchema>;
export type LeadsResponse = z.infer<typeof leadsResponseSchema>;
export type OutreachResponse = z.infer<typeof outreachResponseSchema>;
export type HealthStatus = z.infer<typeof healthSchema>;
export type Lead = z.infer<typeof leadSchema>;
export type Opportunity = z.infer<typeof opportunitySchema>;
export type JobResult = z.infer<typeof jobSchema>;
export type PlaceResult = z.infer<typeof placeSchema>;
