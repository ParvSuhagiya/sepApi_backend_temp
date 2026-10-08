/**
 * Every user-visible error comes from this map — never raw upstream or
 * server text. The backend `request_id` travels alongside as a "Support
 * code" the user can copy.
 */

export class ApiError extends Error {
  code: string;
  status: number;
  requestId: string | null;
  retryAfter: number | null;
  fields: string[];

  constructor({
    code,
    status,
    message,
    requestId,
    retryAfter,
    fields = [],
  }: {
    code: string;
    status: number;
    message: string;
    requestId: string | null;
    retryAfter: number | null;
    fields?: string[];
  }) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.requestId = requestId;
    this.retryAfter = retryAfter;
    this.fields = fields;
  }
}

/** Pull field names out of "Invalid request: city, skills." */
export function parseFieldErrors(serverMessage: string | null): string[] {
  if (!serverMessage) return [];
  const match = serverMessage.match(/^invalid request:\s*(.+?)\.?$/i);
  if (!match?.[1]) return [];
  return match[1]
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
}

export interface FriendlyError {
  message: string;
  fields: string[];
}

export function toFriendlyError({
  status,
  code,
  serverMessage,
  retryAfter,
}: {
  status: number;
  code: string;
  serverMessage: string | null;
  retryAfter: number | null;
}): FriendlyError {
  if (status === 429 && code === 'budget_exhausted') {
    return {
      message: "We've reached today's daily capacity. Please try again tomorrow.",
      fields: [],
    };
  }
  if (status === 429) {
    const wait = Number(retryAfter);
    const when =
      Number.isFinite(wait) && wait > 0
        ? ` Please try again in about ${wait} seconds.`
        : ' Please try again later.';
    return { message: `Too many requests.${when}`, fields: [] };
  }
  if (status === 401) {
    return {
      message: 'This demo needs an access code. Please check the code and try again.',
      fields: [],
    };
  }
  if (status === 413) {
    return {
      message: 'That request was too large. Please shorten your input and try again.',
      fields: [],
    };
  }
  if (status === 422) {
    return {
      message: serverMessage || 'Please check the highlighted fields and try again.',
      fields: parseFieldErrors(serverMessage),
    };
  }
  if (status === 404 && code === 'feature_disabled') {
    return {
      message: 'The customer finder is currently switched off. Please try the income search instead.',
      fields: [],
    };
  }
  if (status === 500 || status === 502 || status === 503) {
    return {
      message: "We couldn't finish this search. Please try again in a minute.",
      fields: [],
    };
  }
  return { message: serverMessage || 'Something went wrong. Please try again.', fields: [] };
}

/** Friendly copy when a 200 response fails Zod validation (schema drift). */
export function schemaDriftMessage(): string {
  return 'We got an unexpected response. Please try again in a minute.';
}
