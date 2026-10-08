# EarnRadar data handling (engineering description, not legal advice)

## What is collected

| Data | Source | Notes |
|---|---|---|
| Income-mode profile (skills, city, hours, budget) | Request body | Used for one request; never stored |
| Customer-mode offer (product text, city, price, max leads) | Request body | Used for one request; never stored |
| Business listings (name, rating, reviews count, phone, address, type) | SerpAPI Google Maps | Public business data |
| Review texts (text only) | SerpAPI Google Maps reviews | Reviewer names, profile links and photos are dropped at ingestion and never stored, logged or returned |
| Competitor titles/snippets | SerpAPI web search | Untrusted content, escaped, used once |
| Outreach recipient (name, type, address, rating) + product summary | Request body | Used for one draft; never stored |

## Where it goes

- **SerpAPI TTL cache** (SQLite, existing): upstream responses keyed by
  md5 hex of engine+params (never by user text). TTLs: Maps 24 h (reviews
  engine inherits the 24 h default), web search 24 h, no-results 1 h.
- **Leads response cache** (SQLite `rank_cache` table, `LEADS_CACHE_HOURS`,
  default 6, `0` = off): the assembled public response keyed by
  `leads:<sha256>` of the normalised request. Values hold only the same
  public data returned to the caller — no reviewer personal data and no raw
  offer text (the `offer_summary` is the ≤200-char plan summary).
- **Logs**: one structured line per request (request id, mode, stage names,
  counters, source names, outcome). Never user text, secrets, reviewer
  names or full profiles.

## Retention

Caches expire by TTL with opportunistic expiry; the SQLite file resets on
free-tier redeploys. No per-user store exists — nothing else is retained.

## What is never stored

- Raw offer/profile text outside the request lifecycle
- Reviewer names, profile links, photos
- API keys (redacted from every log line)
- Full upstream bodies
- Anything the user did not send or that is not public business data
