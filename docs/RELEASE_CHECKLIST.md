# EarnRadar release checklist

Derived from PDD §19.2 (as cited in the work brief) plus the operational items
added during hardening. All boxes must be ticked before a demo or launch.

## Product

- [ ] 5 ranked opportunities, jobs, local, trend and forum sections render
- [ ] Each opportunity shows EarnScore, why, estimate label, evidence, 7-step plan
- [ ] Every job shows a risk badge; flagged jobs list their flags
- [ ] Repeated identical search shows `credits_used: 0`
- [ ] WhatsApp draft is editable, opens `wa.me` with encoded text, nothing auto-sent
- [ ] One failing SerpAPI engine still renders the page (degraded/partial notice)
- [ ] Disclaimers visible (estimates, scam-signal, information-not-guarantees)
- [ ] Layout works at 360 px with no horizontal scroll
- [ ] Customers tab: restaurant example returns leads with scores, snippets and market notes
- [ ] Customers tab: empty state, degraded/partial notice and disclaimer visible
- [ ] Customers tab: outreach draft editable with safety note and opt-out line, nothing auto-sent

## Security and configuration (Render)

- [ ] `ALLOWED_ORIGINS` is the exact production frontend URL (no trailing slash)
- [ ] `TRUSTED_PROXY_HOPS` verified with one real request (access log shows true client IP)
- [ ] Daily budgets set (`MAX_SERP_CALLS_PER_DAY`, `MAX_LLM_CALLS_PER_DAY`, `MAX_LEAD_SERP_CALLS_PER_DAY`)
- [ ] `ENABLE_CUSTOMER_MODE` on in staging first, verified, then on in production
- [ ] Docs disabled in production (`APP_ENV=production`, `ENABLE_DOCS` unset/false)
- [ ] API keys only in the Render dashboard (never in git or the frontend bundle)
- [ ] `ACCESS_CODE` set if the demo needs a soft gate; team knows it is not a secret
- [ ] `PYTHON_VERSION=3.11`, `APP_ENV=production` in `render.yaml` env

## Freshness and frontend (Vercel)

- [ ] `VITE_API_URL` points at the production backend; optional `VITE_ACCESS_CODE` matches
- [ ] `python -m scripts.prewarm` run after deploy; demo readiness check passes
- [ ] Leads prewarm check passes (>= 5 leads, >= 3 with phone, repeat run 0 credits)
- [ ] 360 px check done on a real phone viewport; focus rings visible, keyboard operable
- [ ] `grep -rn "sk-\|SERPAPI_KEY\|ANTHROPIC_API_KEY" frontend/src frontend/dist` prints nothing

## Verification commands

```bash
cd backend && pytest -q --cov=app
cd frontend && npm test -- --run && npm run build
python scripts/eval_leads.py && python scripts/load_leads.py
git ls-files | grep -E "\.env$|cache\.db|node_modules|__pycache__"
grep -rn "sk-\|AIza\|gsk_\|SERPAPI\|API_KEY" frontend/src frontend/dist || echo "no keys in frontend"
```

## Frontend release (Vercel)

- [ ] `VITE_API_URL` is the production Render backend URL (no trailing slash);
      optional `VITE_ACCESS_CODE` matches the backend decision below
- [ ] Backend `ALLOWED_ORIGINS` is the exact production frontend URL
      (`https://earnrader.vercel.app` unless the project was renamed — no
      trailing slash, and `robots.txt`/`sitemap.xml` updated to match)
- [ ] `ACCESS_CODE` decision recorded: set (demo gate) or empty (open);
      the frontend `.env` mirrors it
- [ ] 360 px check done on mobile-360 Playwright project: no horizontal
      scroll on `/`, both app routes with results, and the shortlist drawer
- [ ] Lighthouse report attached (Performance ≥ 90, Accessibility ≥ 95,
      Best Practices ≥ 95, SEO ≥ 95 on a mid-range mobile profile)
- [ ] `npm run size-check` passes (landing < 150 kB, app route < 350 kB gzip)
- [ ] Axe clean on every route in light and dark (`e2e/routes.spec.ts`)
- [ ] `python -m scripts.prewarm` run after deploy; demo readiness check passes
- [ ] Backup screen recording of both demo paths captured before the event
- [ ] Rollback plan: previous Vercel deployment kept for instant rollback
      (and previous Render deployment for the backend)

## Rollback / backup

- [ ] Backup screen recording of the demo path captured before the event
- [ ] Previous Render deployment kept for instant rollback
