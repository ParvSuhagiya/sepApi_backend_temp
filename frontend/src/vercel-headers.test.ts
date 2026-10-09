import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

interface VercelHeader {
  key: string;
  value: string;
}

interface VercelConfig {
  rewrites?: Array<{ source: string; destination: string }>;
  headers?: Array<{ source: string; headers: VercelHeader[] }>;
}

function loadConfig(): VercelConfig {
  const runtime = globalThis as unknown as { process?: { cwd?: () => string } };
  const root = runtime.process?.cwd?.() ?? '.';
  const raw = readFileSync(join(root, 'vercel.json'), 'utf8');
  return JSON.parse(raw) as VercelConfig;
}

function cspMap(value: string): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const part of value.split(';')) {
    const tokens = part.trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) continue;
    map.set(tokens[0] as string, tokens.slice(1));
  }
  return map;
}

describe('vercel deployment headers', () => {
  it('rewrites every route to the SPA shell', () => {
    const config = loadConfig();
    expect(config.rewrites).toContainEqual({ source: '/(.*)', destination: '/index.html' });
  });

  it('sends a strict content security policy', () => {
    const config = loadConfig();
    const entry = config.headers?.find((item) => item.source === '/(.*)');
    const csp = entry?.headers.find((header) => header.key === 'Content-Security-Policy')?.value;
    expect(csp).toBeTruthy();
    const directives = cspMap(csp ?? '');
    expect(directives.get('default-src')).toContain("'self'");
    // Scripts run only from our bundle: no inline scripts, no eval.
    expect(directives.get('script-src')).toContain("'self'");
    expect(directives.get('script-src')).not.toContain("'unsafe-inline'");
    expect(directives.get('script-src')).not.toContain("'unsafe-eval'");
    // API calls go to our backend; map tiles come from OSM only.
    expect(directives.get('connect-src')).toContain("'self'");
    expect(directives.get('img-src')?.join(' ')).toContain('*.tile.openstreetmap.org');
    expect(directives.get('object-src')).toContain("'none'");
    expect(directives.get('frame-ancestors')).toContain("'none'");
  });

  it('sends hardening headers and disables invasive APIs', () => {
    const config = loadConfig();
    const entry = config.headers?.find((item) => item.source === '/(.*)');
    const byKey = new Map((entry?.headers ?? []).map((header) => [header.key, header.value]));
    expect(byKey.get('X-Content-Type-Options')).toBe('nosniff');
    expect(byKey.get('Referrer-Policy')).toBeTruthy();
    // The app never requests geolocation from the browser.
    expect(byKey.get('Permissions-Policy')).toContain('geolocation=()');
  });
});
