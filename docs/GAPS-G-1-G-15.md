# Gap status G-1…G-15 (PDD §21)

Status after the fix-and-completion work. Entries marked **Unknown** refer to
sections of the PDD that were not available in the repo and could not be
verified; everything else points at the implementing code/test.

| Gap | What it is (per the work brief) | Status | Evidence |
|---|---|---|---|
| G-1 | Env-driven model id | **Done** | `app/config.py` `anthropic_model`; `tests/test_config.py` |
| G-2 | Planner coercion to exactly 2 queries/group | **Done** (pre-existing, kept) | `app/services/planner.py` `_coerce_pair`; `tests/test_planner.py` |
| G-3 | Per-request credit counters via `ContextVar` | **Done** (pre-existing, kept) | `app/services/serp.py` `request_stats`; `tests/test_serp_cache.py` |
| G-4 | AI-output validation and clamping | **Done** (extended) | `app/services/ranker.py` `validate_opportunities` + repair; `tests/test_ai_contract.py` |
| G-5 | Env-driven CORS with `*` stripped | **Done** (extended) | `app/config.py` `origins` normalisation; `app/main.py` strip; `tests/test_config.py`, `tests/test_api.py` |
| G-6 | Per-engine TTL cache | **Done** (pre-existing, kept) | `app/services/serp.py` `_ttl_for_engine`; `tests/test_serp_cache.py` |
| G-7 | (PDD §21 item; source doc absent) | **Unknown** | — |
| G-8 | (PDD §21 item; source doc absent) | **Unknown** | — |
| G-9 | Honest wording: Demand/Competition/Trust are estimated | **Done** | backend README “Scoring and guardrails”, frontend `Footer.jsx`; `tests/test_api.py` (footer text is static) |
| G-10 | Prompt-injection hardening (untrusted text as data) | **Done** | `<evidence>` (ranker, pre-existing), `<profile>` (planner), `<sender>/<recipient>` (outreach) in `app/prompts.py`; `tests/test_ai_contract.py`, `tests/test_ai_quality.py` T-4 |
| G-11 | (PDD §21 item; source doc absent) | **Unknown** | — |
| G-12 | (PDD §21 item; source doc absent) | **Unknown** | — |
| G-13 | Trend-chart keyword toggle | **Done** (optional part) | `frontend/src/components/TrendChart.jsx` toggle between `trend_growth` keywords |
| G-14 | (PDD §21 item; source doc absent) | **Unknown** | — |
| G-15 | (PDD §21 item; source doc absent) | **Unknown** | — |

Additional gaps closed beyond the brief's list: rate-limit bypass via
`X-Forwarded-For` (`TRUSTED_PROXY_HOPS`), global daily credit circuit
breakers, limiter-after-validation, streaming body cap, gated health detail +
docs toggle, access-code brute-force throttle, CORS on 500s, cache-stampede
dedupe, Scam Shield income-pattern regression + new rules, plan/evidence
repair, negation-aware sanitiser, Indian-mobile scrubber, strict grounding,
single LLM seam, temperature-mention retry, outreach safety note,
`adjustments` transparency, signal blends (`SCORE_MODE`), high-risk trust
penalty, `partial` sources, error-payload failures, shared SQLite connection,
`RANK_CACHE_HOURS`. See the per-phase commit messages.
