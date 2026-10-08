/**
 * Backend API client. Never surfaces raw upstream text: every failure is
 * mapped to a friendly message via the error copy map. Retries once on
 * network failure or 502 (Render cold start) for search/leads only.
 */
import { ENV } from '../env';
import type { components } from './openapi-types';
import { ApiError, schemaDriftMessage, toFriendlyError } from './errors';
import {
  healthSchema,
  leadsResponseSchema,
  outreachResponseSchema,
  searchResponseSchema,
  type HealthStatus,
  type LeadsResponse,
  type OutreachResponse,
  type SearchResponse,
} from './schemas';
import type { z } from 'zod';

const TIMEOUT_MS = 60_000;

export type SearchInput = components['schemas']['Profile'];
export type LeadsInput = components['schemas']['OfferInput'];

export interface OutreachTarget {
  name?: string;
  type?: string;
  address?: string;
  rating?: number | null;
  product_summary?: string;
}

export interface RequestOptions {
  retry?: boolean;
  signal?: AbortSignal;
  onRetry?: () => void;
}

async function parseJsonSafe(response: Response): Promise<unknown> {
  try {
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
}

function errorFromStatus(
  status: number,
  payload: unknown,
  retryAfter: string | null,
): ApiError {
  const envelope =
    typeof payload === 'object' && payload !== null && 'error' in payload
      ? (payload as { error?: { code?: unknown; message?: unknown; request_id?: unknown } })
          .error
      : undefined;
  const code = typeof envelope?.code === 'string' ? envelope.code : 'request_failed';
  const serverMessage =
    typeof envelope?.message === 'string' ? envelope.message : null;
  const requestId = typeof envelope?.request_id === 'string' ? envelope.request_id : null;
  const wait = retryAfter ? Number(retryAfter) : null;
  const friendly = toFriendlyError({
    status,
    code,
    serverMessage,
    retryAfter: Number.isFinite(wait) ? wait : null,
  });
  return new ApiError({
    code,
    status,
    message: friendly.message,
    requestId,
    retryAfter: Number.isFinite(wait) ? wait : null,
    fields: friendly.fields,
  });
}

async function request<T>(
  path: string,
  body: unknown,
  schema: z.ZodType<T>,
  { retry = false, signal, onRetry }: RequestOptions = {},
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const onExternalAbort = () => controller.abort();
  signal?.addEventListener('abort', onExternalAbort, { once: true });
  let response: Response;
  try {
    response = await fetch(`${ENV.apiUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(ENV.accessCode ? { 'X-Access-Code': ENV.accessCode } : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onExternalAbort);
    if (signal?.aborted) {
      throw new ApiError({
        code: 'cancelled',
        status: 0,
        message: '',
        requestId: null,
        retryAfter: null,
      });
    }
    if (retry) {
      onRetry?.();
      return request(path, body, schema, { retry: false, signal, onRetry });
    }
    throw new ApiError({
      code: 'network_error',
      status: 0,
      message: 'Could not reach the server. Check your connection and try again.',
      requestId: null,
      retryAfter: null,
    });
  }
  clearTimeout(timer);
  signal?.removeEventListener('abort', onExternalAbort);

  if (response.ok) {
    const parsed = schema.safeParse(await parseJsonSafe(response));
    if (parsed.success) return parsed.data;
    throw new ApiError({
      code: 'schema_error',
      status: response.status,
      message: schemaDriftMessage(),
      requestId: null,
      retryAfter: null,
    });
  }

  const payload = await parseJsonSafe(response);
  const retryAfter = response.headers.get('Retry-After');
  if ((response.status === 502 || response.status === 503) && retry) {
    onRetry?.();
    return request(path, body, schema, { retry: false, signal, onRetry });
  }
  throw errorFromStatus(response.status, payload, retryAfter);
}

async function requestGet<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${ENV.apiUrl}${path}`, {
      headers: ENV.accessCode ? { 'X-Access-Code': ENV.accessCode } : {},
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!response.ok) {
      throw errorFromStatus(
        response.status,
        await parseJsonSafe(response),
        response.headers.get('Retry-After'),
      );
    }
    const parsed = schema.safeParse(await parseJsonSafe(response));
    if (!parsed.success) {
      throw new ApiError({
        code: 'schema_error',
        status: response.status,
        message: schemaDriftMessage(),
        requestId: null,
        retryAfter: null,
      });
    }
    return parsed.data;
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof ApiError) throw err;
    throw new ApiError({
      code: 'network_error',
      status: 0,
      message: 'Could not reach the server. Check your connection and try again.',
      requestId: null,
      retryAfter: null,
    });
  }
}

export function search(
  profile: SearchInput,
  options: RequestOptions = {},
): Promise<SearchResponse> {
  return request('/api/search', profile, searchResponseSchema, { retry: true, ...options });
}

export function leads(
  offerInput: LeadsInput,
  options: RequestOptions = {},
): Promise<LeadsResponse> {
  return request('/api/leads', offerInput, leadsResponseSchema, { retry: true, ...options });
}

export function outreach(
  profile: SearchInput,
  target: OutreachTarget,
  options: RequestOptions = {},
): Promise<OutreachResponse> {
  return request('/api/outreach', { profile, target }, outreachResponseSchema, options);
}

export function health(): Promise<HealthStatus> {
  return requestGet('/api/health', healthSchema);
}
