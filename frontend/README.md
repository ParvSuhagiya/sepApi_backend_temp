# EarnRadar frontend

React 18 + Vite + TypeScript + Tailwind CSS 4. Two modes (income ideas,
customer leads) plus marketing pages, all client-side. No trackers.

## Setup

```powershell
cd frontend
npm install
Copy-Item .env.example .env
# edit .env: set VITE_API_URL (and optionally VITE_ACCESS_CODE)
npm run dev
```

## Environment

| Variable | Required | Notes |
|---|---|---|
| `VITE_API_URL` | yes (defaults to `http://localhost:8000`) | Production backend URL, no trailing slash |
| `VITE_ACCESS_CODE` | only when the backend sets `ACCESS_CODE` | Soft gate, not a secret |

Never put API keys (`SERPAPI_KEY`, `ANTHROPIC_API_KEY`) anywhere in `frontend/`.
CI greps `src` and `dist` for `sk-`, `AIza`, `gsk_`, `SERPAPI`, `API_KEY`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server on :5173 |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve `dist/` (e2e uses :4173) |
| `npm test -- --run` | Vitest unit suite (MSW mocks, no network) |
| `npm test -- --run --coverage` | Unit suite with ≥85% gate on `features/` + `lib/` |
| `npm run test:e2e` | Playwright (mobile-360 + desktop-1440) with route mocks + axe |
| `npm run size-check` | Gzip route budgets: landing < 150 kB, app route < 350 kB excl. map |
| `npm run lint` / `typecheck` | ESLint (incl. jsx-a11y) / `tsc --noEmit` |
| `npm run gen:api` | Regenerate `src/api/openapi-types.ts` from `docs/openapi.json` |

## Architecture

```
pages/ ──► features/{search,customers,shortlist}/ ──► api/{client,hooks,schemas}
  │                    │ session contexts (in-memory)      │ Zod-validated
  │                    ▼                                   ▼
  │              components/ui (design system)        backend /api/*
  └────────► app/{router,providers} ──► Header/Footer/Seo
```

- **State:** `SearchSessionProvider`, `LeadsSessionProvider` and
  `ShortlistProvider` sit above the router, so switching tabs never loses
  results. Everything is in-memory; reload clears it.
- **API layer:** `client.ts` maps every failure to friendly copy
  (`errors.ts`), retries once on network failure / 502, and surfaces
  `Retry-After` countdowns. `schemas.ts` Zod-validates all responses.
- **Maps/charts:** Leaflet and Recharts load lazily on result pages only;
  `size-check` fails CI if they leak into the shared chunk.
- **Outreach:** drafts are editable and open `wa.me` on click only. Phone
  numbers never leave the browser except inside the wa.me link.

## Design tokens

CSS variables in `src/index.css` (`--surface`, `--raised`, `--ink`,
`--muted`, `--line`, `--brand`, `--focus`, tone sets), flipped by
`[data-theme]` on `<html>`. Score colors come from `lib/score.ts`
(green ≥ 75, amber ≥ 55, else red) and are always paired with numbers and
text labels — color is never the only signal. Interactive elements are
≥ 44 px with visible `:focus-visible` rings.

## Browser storage

Exactly one thing: the theme choice (`earnrader-theme` in `localStorage`).
See `src/pages/PrivacyPage.tsx`, mirrored here so docs and UI agree.

## How to add a feature

1. Add the route (lazy) in `src/app/router.tsx` and a nav entry if needed.
2. Put server state in a session context under `src/features/<area>/`
   with `idle | loading | success | error` plus `retrying`.
3. Validate responses in `src/api/schemas.ts` (optional fields for
   forward-compat extras) and mirror backend limits in `src/lib/`.
4. Cover with Vitest/RTL + MSW; add a Playwright spec with route mocks
   and an axe check. Keep 360 px free of horizontal scroll.
5. Run `npm run lint && npm run typecheck && npm test -- --run --coverage
   && npm run build && npm run size-check`.
