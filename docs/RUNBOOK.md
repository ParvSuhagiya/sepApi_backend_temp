# EarnRadar runbook (customer mode)

## Budget exhausted (429 `budget_exhausted`)

- Symptom: `/api/leads` returns 429 with `budget_exhausted`, or logs show
  "day sub-budget exhausted".
- Meaning: `MAX_LEAD_SERP_CALLS_PER_DAY` (sub-counter `serp_leads`, sharing
  the global SerpAPI day counter) or the global `MAX_SERP_CALLS_PER_DAY` is
  spent. Cached results are still served; only fresh live calls stop.
- Action: wait for the UTC-day rollover (the `Retry-After` value), or raise
  the budget env vars on Render and redeploy. Do not set them to absurd
  values: each leads request can issue up to `MAX_LEAD_SERP_CALLS_PER_REQUEST`
  live calls plus one market search.

## SerpAPI down (502 `upstream_failure`)

- Symptom: 502s, or `meta.partial: ["maps"]`, or logs show "circuit open
  engine=google_maps".
- The per-engine circuit breaker trips after 5 consecutive failures in
  60 s and short-circuits for 30 s; one failing query degrades to partial,
  all three failing returns 502.
- Action: check SerpAPI status/quota, verify `SERPAPI_KEY`, then wait out
  the 30 s window. No restart needed; success closes the circuit.

## LLM 429s / failures

- Symptom: `meta.notes` contains `ai_text_fallback` or `market_unavailable`.
- Meaning: the planner/text/market AI calls failed; the request still
  succeeds on deterministic fallbacks (keyword plan, signal-built text).
- Action: check `ANTHROPIC_API_KEY` and `MAX_LLM_CALLS_PER_DAY`. Nothing
  urgent: fallbacks keep the endpoint serving.

## Cache reset

- The SQLite cache (`CACHE_DB_PATH`, default `cache.db`) resets on every
  free-tier redeploy. After deploying, run `python -m scripts.prewarm`
  from `backend/` and require the `READY` line (income demo + leads
  restaurant example with a 0-credit repeat run) before announcing.

## Rolling back customer mode

- Set `ENABLE_CUSTOMER_MODE=false` on Render and redeploy (also in
  `render.yaml` if you want it permanent). `/api/leads` then returns 404
  `feature_disabled`; `/api/search` and `/api/outreach` keep working — the
  golden contract test guards them.
- To re-enable, set it back to `true` and redeploy.
