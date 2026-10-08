# ADR-0001: a separate customer-mode package

## Context

EarnRadar started as one mode: a user profile (skills, city, hours, budget)
becomes ranked income ideas. The second mode inverts the relationship: the
user is a business owner with a PRODUCT, and the app finds customer
businesses on Google Maps, researches them, ranks them and drafts
human-reviewed outreach.

## Decision

Mode 2 lives in `backend/app/modes/customers/` (schemas, planner,
discovery, research, scoring, ranker, pipeline, outreach, breaker,
constants). Shared infrastructure — the SerpAPI client with per-engine TTL
cache, the provider-neutral `app/services/llm.py` seam, ContextVar credit
counters, daily budgets, rate limiting, the error envelope, request ids —
stays shared and is reused, never forked. Mode 1 files were not moved or
renamed; its `/api/search` response shape is pinned by a golden contract
test.

## Why signals, not guarantees

A lead score blends listing fit, review pains, reachability and
not-using-software signals. None of these observe the business's actual
willingness or ability to buy. Presenting them as guarantees would be
dishonest and would encourage spammy outreach. So scores are labelled
signals everywhere (API disclaimer, UI badge wording, docs), guardrails cap
downwards only, and every claim shown traces to provided evidence
(`match_reasons`, grounded `why_fit`).

## Why no scraping of lead websites

Discovery stores the website string but never fetches it:

- Fetching arbitrary third-party pages from the server is an SSRF and
  content-safety risk (untrusted HTML, redirects, huge payloads).
- It would also be a per-request latency and reliability liability.
- The vendor signal we need (does the business already use software like
  Petpooja/Tally?) is already visible in review text and the URL string.

A test pins this: with only `serpapi.com` mocked, the whole pipeline must
succeed without any other host being contacted.
