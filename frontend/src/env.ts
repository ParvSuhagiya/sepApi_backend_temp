/** Typed access to the only allowed env vars. Never put API keys here. */
export const ENV = {
  apiUrl: (import.meta.env.VITE_API_URL ?? 'http://localhost:8000').replace(/\/+$/, ''),
  accessCode: import.meta.env.VITE_ACCESS_CODE ?? '',
} as const;
