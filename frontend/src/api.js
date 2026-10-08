/**
 * Backend API client. Never surfaces raw upstream text: every failure is
 * mapped to a friendly message. Retries once on network failure or 502
 * (Render cold start) for /api/search.
 */

const BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/+$/, "");
const ACCESS_CODE = import.meta.env.VITE_ACCESS_CODE || "";
const TIMEOUT_MS = 60_000;

export class ApiError extends Error {
  constructor({ code, status, message, requestId, retryAfter }) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.requestId = requestId;
    this.retryAfter = retryAfter;
  }
}

function headers() {
  const out = { "Content-Type": "application/json" };
  if (ACCESS_CODE) out["X-Access-Code"] = ACCESS_CODE;
  return out;
}

function friendlyMessage(status, payload, retryAfter) {
  const serverMessage = payload?.error?.message;
  if (status === 429) {
    const wait = Number(retryAfter);
    const when = Number.isFinite(wait) && wait > 0 ? ` Please try again in about ${wait} seconds.` : " Please try again later.";
    return `Too many requests.${when}`;
  }
  if (status === 401) return "This demo needs an access code. Please check the code and try again.";
  if (status === 422) return serverMessage || "Please check the highlighted fields and try again.";
  if (status === 500 || status === 502 || status === 503) {
    return "We couldn't finish this search. Please try again in a minute.";
  }
  return serverMessage || "Something went wrong. Please try again.";
}

async function request(path, body, { retry = false } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (retry) {
      // Single automatic retry on network failure (cold start / flaky net).
      return request(path, body, { retry: false });
    }
    throw new ApiError({
      code: "network_error",
      status: 0,
      message: "Could not reach the server. Check your connection and try again.",
      requestId: null,
      retryAfter: null,
    });
  }
  clearTimeout(timer);

  if (response.ok) return response.json();

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  const retryAfter = response.headers.get("Retry-After");
  if ((response.status === 502 || response.status === 503) && retry) {
    return request(path, body, { retry: false });
  }
  throw new ApiError({
    code: payload?.error?.code || "request_failed",
    status: response.status,
    message: friendlyMessage(response.status, payload, retryAfter),
    requestId: payload?.error?.request_id ?? null,
    retryAfter: retryAfter ? Number(retryAfter) : null,
  });
}

export function search(profile) {
  return request("/api/search", profile, { retry: true });
}

export function outreach(profile, target) {
  return request("/api/outreach", { profile, target }, { retry: false });
}

export const __internals = { friendlyMessage, BASE_URL };
