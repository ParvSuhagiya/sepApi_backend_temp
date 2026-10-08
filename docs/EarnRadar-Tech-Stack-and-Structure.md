# EarnRadar — Tech Stack and Structure (current, verified against the repo)

> NOTE: the four authoritative product documents named in the project brief
> (`EarnRadar-Master-Guide.md`, `EarnRadar-PRD.md`, `EarnRadar-PDD.md`, and an
> earlier revision of this file) were **not present in the repository**, so
> they could not be copied into `docs/`. This file describes the system
> **as built**. See `docs/README.md`.

## Stack

| Layer | Choice |
|---|---|
| Backend | Python 3.11 (`backend/.python-version`, `PYTHON_VERSION`), FastAPI, uvicorn (`uvicorn app.main:app`) |
| Validation | Pydantic v2 (+ pydantic-settings, env-driven `Settings`) |
| Search provider | SerpAPI via `httpx` (`google_jobs`, `google_maps`, `google_trends`, `google_forums`) |
| AI provider | Anthropic Claude (env-driven model id, default `claude-sonnet-5-5`) |
| Cache | SQLite (`cache.db`, WAL, one shared connection, per-engine TTL, rank cache) |
| Frontend | React 18 + Vite + Tailwind CSS v4 + Recharts, plain JSX, no router |
| Tests | backend `pytest` (+ `respx`), frontend Vitest + React Testing Library + jsdom |
| Hosting | Backend on Render (`render.yaml`, root `backend`), frontend on Vercel (`frontend/`) |

## Backend layout (`backend/`)

```text
backend/
  app/
    main.py                 # FastAPI app, middleware, /api/search, /api/outreach
    config.py               # Settings (env vars, CORS normalisation, docs toggle)
    schemas.py              # Profile, Opportunity, SearchResponse, OutreachResponse, ...
    errors.py               # AppError hierarchy incl. RateLimited, BudgetExhausted
    observability.py        # request-id ContextVar, secret redaction, logging
    security.py             # client_ip (proxy hops), access-code gate + auth throttle
    budget.py               # UTC-day-bucketed SerpAPI/LLM circuit breakers
    prompts.py              # planner/ranker/outreach prompt builders (+ tag escaping)
    utils.py                # clamp, truncate, query cleaning, type normalisation
    api/routes/health.py    # GET /api/health (minimal public, gated detail)
    services/
      pipeline.py           # plan -> 7 SerpAPI calls -> clean -> rank -> score
      planner.py            # profile -> 2+2+2+1 search queries (Claude + fallback)
      serp.py               # SerpAPI client: cache, TTL, budgets, stampede dedupe
      cleaning.py           # jobs/places/trends/forums normalisation + scam scan
      scam.py               # Scam Shield RED_FLAGS (signal, not verdict)
      ranker.py             # evidence -> opportunities (validate/repair/sanitise)
      scoring.py            # EarnScore, guardrails -> adjustments, signal blends
      llm.py                # Anthropic client, loose JSON, temperature retry
      outreach.py           # WhatsApp draft + cleaning + safety note
  tests/                    # pytest suite (no real network)
  scripts/prewarm.py        # warm the SerpAPI cache + demo readiness check
  requirements.txt
  .env.example              # matches backend README env table exactly
```

Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT` (run from `backend/`).

## Frontend layout (`frontend/`)

```text
frontend/
  index.html                # lang, title, meta description, viewport, favicon
  vite.config.js            # react + tailwind plugins, vitest/jsdom setup
  src/
    main.jsx App.jsx index.css test-setup.js
    api.js                  # search/outreach, ApiError, friendly messages, 1 retry, 60 s timeout
    lib/whatsapp.js         # wa.me link builder
    lib/scoreColor.js       # EarnScore thresholds
    components/             # ProfileForm, ProgressLine, EfficiencyStrip,
                            # OpportunityCard, ScoreBadge, TrendChart, JobCard,
                            # RiskBadge, LocalCard, OutreachButton, ForumCard,
                            # ErrorMessage, Footer
  public/favicon.svg
```

No router, no state library. `VITE_API_URL` points at the backend;
optional `VITE_ACCESS_CODE` sends `X-Access-Code` (soft gate, not a secret).

## Environment variables (backend)

See `backend/.env.example` and the backend README env table (kept identical):
`SERPAPI_KEY`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `ALLOWED_ORIGINS`,
`CACHE_DB_PATH`, `TTL_JOBS/MAPS/TRENDS/FORUMS_HOURS`, `RATE_LIMIT_SEARCH/OUTREACH_PER_HOUR`,
`ACCESS_CODE`, `TRUSTED_PROXY_HOPS`, `MAX_SERP/LLM_CALLS_PER_DAY`, `APP_ENV`,
`ENABLE_DOCS`, `SCORE_MODE`, `RANK_CACHE_HOURS`, `LLM/SERP_TIMEOUT_SECONDS`, `LOG_LEVEL`.
