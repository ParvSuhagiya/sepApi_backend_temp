# EarnRadar

EarnRadar turns a user profile (skills, city, weekly hours, budget) into
ranked income opportunities for India. A planner proposes targeted SerpAPI
searches (Jobs, Maps, Trends, Forums), the results are cleaned and scanned
by a rule-based Scam Shield, Claude ranks candidate opportunities, and a
deterministic EarnScore formula with guardrails produces the final list.
A separate endpoint drafts short WhatsApp outreach messages. Nothing is
ever auto-sent; income figures are always labelled estimates.

## Architecture

```text
                    +------------------ frontend/ (React 18 + Vite + Tailwind + Recharts)
                    |   ProfileForm -> POST /api/search -> OpportunityCards, Jobs, Map, Trends
                    |
Profile (skills, city, hours, budget)
  |
  v
Planner (Claude) ---> 7 SerpAPI calls: 2 Jobs + 2 Maps + 2 Trends + 1 Forum
  |                         (SQLite cache, per-engine TTL, credit counters)
  v
Cleaning (dedupe, scam flags, trend growth, forum filter)
  |
  v
Evidence builder (links/phones stripped, hostile tags escaped)
  |
  v
Ranker (Claude) ---> validate + sanitise (promises, pay-to-start, grounding)
  |
  v
Scoring (EarnScore = 30% Demand + 20% Fit + 20% Trust
         + 15% Low competition + 15% Easy to start) + guardrails
  |
  v
SearchResponse { opportunities, jobs, local, trend, forum, stats, meta }
```

`POST /api/outreach` is a separate path: profile + allow-listed target ->
Claude -> cleaned WhatsApp draft (max 70 words, editable, opened via
`wa.me` by the user, never auto-sent).

See `backend/README.md` for the backend details and `docs/` for the
product/technical documents.

## Quick start

Backend:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
# edit .env: set SERPAPI_KEY and ANTHROPIC_API_KEY
uvicorn app.main:app --reload
pytest
```

Frontend:

```powershell
cd frontend
npm install
Copy-Item .env.example .env
# edit .env: set VITE_API_URL (and optionally VITE_ACCESS_CODE)
npm run dev
npm test
npm run build
```

## Docs

- `docs/` holds the authoritative product documents (`EarnRadar-Master-Guide.md`,
  `EarnRadar-PRD.md`, `EarnRadar-PDD.md`, `EarnRadar-Tech-Stack-and-Structure.md`),
  plus `docs/RELEASE_CHECKLIST.md`.
- Backend API reference: run the backend and open `/docs`.

## Deployment

- Backend: Render, root directory `backend`, build
  `pip install -r requirements.txt`, start
  `uvicorn app.main:app --host 0.0.0.0 --port $PORT` (see `render.yaml`).
- Frontend: Vercel, root directory `frontend`.
- On Render, verify `TRUSTED_PROXY_HOPS` with one real request, set the
  SerpAPI/LLM daily budgets, use the exact frontend URL (no trailing slash)
  in `ALLOWED_ORIGINS`, and keep API keys only in the hosting dashboards.
