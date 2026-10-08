# EarnRadar backend

EarnRadar backend is a FastAPI service that turns a user profile
(skills, city, weekly hours, budget) into ranked income opportunities for
India. It plans targeted SerpAPI searches (Jobs, Maps, Trends, Forums),
cleans the results, asks Claude for candidate opportunities, sanitises the
AI output, applies deterministic scoring with guardrails, and can draft a
short WhatsApp outreach message.

## Architecture

```text
Profile
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
Scoring (EarnScore) + guardrails ---> SearchResponse
```

`POST /api/outreach` is a separate path: profile + allow-listed target ->
Claude -> cleaned WhatsApp draft (max 70 words, no links/phones/emojis).

## Setup

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
# edit .env and set SERPAPI_KEY and ANTHROPIC_API_KEY
```

## Environment variables

| Variable | Default | Required | Notes |
|---|---|---|---|
| `SERPAPI_KEY` | - | yes | SerpAPI key for Jobs/Maps/Trends/Forums |
| `ANTHROPIC_API_KEY` | - | yes | Claude API key |
| `ANTHROPIC_MODEL` | `claude-sonnet-5-5` | no | Must be a valid Anthropic model id |
| `ALLOWED_ORIGINS` | `http://localhost:5173` | no | Comma-separated; never use `*` in production |
| `CACHE_DB_PATH` | `cache.db` | no | SQLite cache file |
| `TTL_JOBS_HOURS` | `24` | no | Cache TTL for Jobs |
| `TTL_MAPS_HOURS` | `24` | no | Cache TTL for Maps |
| `TTL_TRENDS_HOURS` | `168` | no | Cache TTL for Trends (7 days) |
| `TTL_FORUMS_HOURS` | `72` | no | Cache TTL for Forums |
| `RATE_LIMIT_SEARCH_PER_HOUR` | `10` | no | Per-IP search limit |
| `RATE_LIMIT_OUTREACH_PER_HOUR` | `30` | no | Per-IP outreach limit |
| `ACCESS_CODE` | `` (empty = open) | no | When set, clients must send `X-Access-Code`. Soft gate, not a secret: it ships in the frontend bundle. Failed guesses are throttled (20/hour per IP). |
| `TRUSTED_PROXY_HOPS` | `1` | no | How many right-most `X-Forwarded-For` entries to trust. `0` ignores the header. Verify against Render with one real request. |
| `MAX_SERP_CALLS_PER_DAY` | `300` | no | Global daily SerpAPI budget (`0` = unlimited). Cache hits stay free; live calls raise when exhausted. |
| `MAX_LLM_CALLS_PER_DAY` | `500` | no | Global daily Claude budget (`0` = unlimited). Exhaustion returns `429 budget_exhausted`. |
| `APP_ENV` | `development` | no | Set `production` on Render. Enables docs lockdown and detail-health lockdown. |
| `ENABLE_DOCS` | auto (`true` unless production) | no | Set `true`/`false` to override the interactive docs (`/docs`, `/openapi.json`). Disable in production. |
| `SCORE_MODE` | `blend` | no | `blend` averages AI and deterministic signals; `ai` keeps raw AI values |
| `LLM_TIMEOUT_SECONDS` | `60` | no | Per-call Claude timeout |
| `SERP_TIMEOUT_SECONDS` | `40` | no | Per-call SerpAPI timeout |
| `LOG_LEVEL` | `INFO` | no | Root log level |

## Run

```powershell
cd backend
uvicorn app.main:app --reload
```

Interactive docs: `http://127.0.0.1:8000/docs`
Raw schema: `http://127.0.0.1:8000/openapi.json`

## Test

```powershell
cd backend
pytest
```

Offline AI harness (no provider keys needed):

```powershell
pytest tests/test_ai_quality.py
```

Live AI smoke (needs a real `ANTHROPIC_API_KEY`, makes no SerpAPI calls):

```powershell
$env:ANTHROPIC_API_KEY = "your-key"
python scripts/ai_smoke.py
```

Without the key the script prints a skip message and exits 0.

## Scoring and guardrails

`EarnScore = 30% Demand + 20% Fit + 20% Trust + 15% Low competition + 15% Easy
to start`, computed deterministically from the AI-estimated sub-scores.
Demand, Competition and Trust themselves are AI-estimated from the collected
evidence (job counts, trend growth, forum signals) — the README admits this
honestly; the formula and guardrails are the deterministic part.

- `SCORE_MODE=blend` (default): final Demand/Competition = 50% AI value +
  50% deterministic signal (`signal_demand` blends capped trend growth, job
  count and forum count; `signal_competition` blends Maps listing count and
  average rating). `SCORE_MODE=ai` keeps the raw AI values.
- Guardrails only ever cap downwards and every intervention is listed in the
  opportunity's `adjustments` field (e.g. "Trust capped at 40: all matching
  jobs show scam signals").
- Job-type items additionally lose Trust in proportion to the share of
  High-risk matching jobs (`TRUST_HIGH_RISK_SHARE_PENALTY = 15` at full share).

## API examples
Health:

```powershell
curl http://127.0.0.1:8000/api/health
```

Search:

```powershell
curl -X POST http://127.0.0.1:8000/api/search `
  -H "Content-Type: application/json" `
  -d '{"skills":"tailoring, stitching","city":"Pune","hours":10,"budget":0}'
```

Search with an access code configured (`ACCESS_CODE` set on the server):

```powershell
curl -X POST http://127.0.0.1:8000/api/search `
  -H "Content-Type: application/json" `
  -H "X-Access-Code: your-code" `
  -d '{"skills":"Python basics, Excel","city":"Ahmedabad","hours":10,"budget":0}'
```

Outreach (use a place from a search response, without its phone):

```powershell
curl -X POST http://127.0.0.1:8000/api/outreach `
  -H "Content-Type: application/json" `
  -H "X-Access-Code: your-code" `
  -d '{"profile":{"skills":"tailoring","city":"Pune"},"target":{"name":"Sharma Tailoring","type":"Tailor","address":"MG Road Pune"}}'
```

Error responses always look like
`{"error":{"code":"...","message":"...","request_id":"..."}}`.
Rate-limited responses add a `Retry-After` header.

## Prewarm

Warm the SerpAPI cache so the first real users get fast, credit-free answers:

```powershell
cd backend
python -m scripts.prewarm
python -m scripts.prewarm profiles.json
```

`profiles.json` is a list of `{"skills","city","hours","budget"}` objects.
Per profile the script prints `credits_used`, `cache_hits`, opportunity
count, degraded sources and wall time, and continues past per-profile
errors. Run the same command twice: the second run must show
`credits_used=0` for every profile (all SerpAPI responses served from cache).

## Render deployment

- Root directory: `backend`
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Set env vars: `SERPAPI_KEY`, `ANTHROPIC_API_KEY`, plus
  `ALLOWED_ORIGINS` set to the exact frontend URL with no trailing slash
  (for example `https://earnrader.vercel.app`; a trailing slash is now
  normalised away, but exact is best).
- Set `APP_ENV=production`, `ENABLE_DOCS=false`, daily budgets
  (`MAX_SERP_CALLS_PER_DAY`, `MAX_LLM_CALLS_PER_DAY`).
- Send one real request and confirm the client IP in the access log matches
  the true caller before trusting `TRUSTED_PROXY_HOPS=1` behind Render's proxy.
- Remember the access code is a soft gate shipped in the JS bundle, not a secret.
- Set `PYTHON_VERSION` to `3.11` to pin the runtime.
- Free-tier notes: cold starts take 30-60 s; the SQLite cache file resets
  on every redeploy, so re-run `python -m scripts.prewarm` after deploying.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `ModuleNotFoundError: No module named 'app'` | Running from the wrong directory | Run from `backend/` (`uvicorn app.main:app`, `pytest`) |
| CORS error in the browser | Frontend origin not allowed | Set `ALLOWED_ORIGINS` to the exact frontend URL, no trailing slash |
| `401` with `X-Access-Code` | Missing or wrong access code | Send the code in the `X-Access-Code` header; leave `ACCESS_CODE` empty for open access |
| `401`/`403` from providers | Invalid `SERPAPI_KEY` or `ANTHROPIC_API_KEY` | Check keys; the API returns 502 with a safe message and never echoes the key |
| Wrong model name errors | `ANTHROPIC_MODEL` typo | Use a valid id (default `claude-sonnet-5-5`) |
| Empty jobs list | No SerpAPI results for the queries | Response still returns 200 with other sources; check `meta.degraded` |
| Invalid JSON from AI | Truncated or chatty model output | Ranker retries once with a compact prompt, then returns 502 `ranking_failed` |
| Slow first search | Cold SerpAPI cache (7 live calls) | Prewarm after deploy; repeat requests are served from cache |
| `429` rate limited | Per-IP hourly limit exceeded | Wait for the `Retry-After` window or raise the limit env vars |

## Limitations

- SQLite resets on free-tier redeploys; re-run prewarm after each deploy.
- Demand and Competition sub-scores are AI-estimated from evidence, while
  the final EarnScore formula and guardrails are deterministic.
- Scam Shield is a rule-based **signal, never a verdict**. It covers:
  upfront fees (including refundable deposits, joining/training charges),
  unrealistic daily/weekly income promises, personal-email or chat-app
  contacts, no-interview/guaranteed-income claims, pay-to-start kits,
  chat-app-only applications, up-front ID/bank-detail requests, CV-over-chat
  requests, and a small Hinglish lure set. It does **not** cover: monthly
  income claims, plain "processing fee" mentions (common in legitimate
  banking/loan jobs), or any behaviour outside the listing text. Any
  Telegram mention flags (even "we use Telegram internally"); verify before
  paying or sharing documents.
- Income figures are estimates, always labelled as estimates.
- The `credits_used` counter counts every successful SerpAPI JSON response
  (including benign "no results" payloads). SerpAPI's exact billing for
  errored and empty searches could not be confirmed offline, so the counter
  may over-report slightly versus the SerpAPI dashboard.
