# `POST /api/leads` — find customer businesses for a product

Finds Google Maps businesses matching a product offer, researches them,
ranks them as signals (never guarantees) and drafts human-reviewed
explanations. Nothing is ever auto-sent. Disabled with 404
`feature_disabled` when `ENABLE_CUSTOMER_MODE=false`.

## Request

```json
{
  "offer": "i am a devops engineer and i have made a restaurant management system: manager assigns customers, waiter takes order, cook prepares food, waiter serves, manager handles bills. 800 rupees/month. target mid level restaurants that have waiter, manager, cook",
  "city": "Ahmedabad",
  "monthly_price": 800,
  "max_leads": 10
}
```

| Field | Type | Rules |
|---|---|---|
| `offer` | string | 20–1000 chars, mostly letters; wrapped as data, never as instructions |
| `city` | string | 2–80 chars |
| `monthly_price` | integer, optional | 0–1,000,000; used only for a neutral competitor-price note |
| `max_leads` | integer | 5–20, default 10 |

Rate limit: 5 requests/hour/IP (separate bucket, `RATE_LIMIT_LEADS_PER_HOUR`),
`Retry-After` on 429. Overall deadline `LEADS_REQUEST_DEADLINE_SECONDS`
(default 45): on expiry the API returns finished stages with HTTP 200 and
`meta.notes: ["deadline_reached"]` when at least one lead exists, else 502.

## Response (validated against `LeadsResponse`, `schema_version: "1.0"`)

```json
{
  "schema_version": "1.0",
  "offer_summary": "Restaurant management system",
  "leads": [
    {
      "name": "Shankar Restaurant",
      "address": "12 MG Road, Ahmedabad",
      "rating": 4.2,
      "user_ratings_total": 320,
      "business_type": "Restaurant",
      "match_score": 82,
      "match_reasons": [
        "Rated 4.2 from 320 reviews on Google Maps"
      ],
      "research_notes": "bill was wrong; waited a long time",
      "why_fit": "Rated 4.2 from 320 reviews; 2 reviews mention slow billing.",
      "pitch_angle": "Cut billing errors and save staff time.",
      "suggested_first_question": "How do you handle billing errors today?",
      "phone": "919822012345",
      "maps_url": "https://maps.google.com/?q=shankar",
      "price_level": 2,
      "score_breakdown": {
        "mid_level": 100.0,
        "pain": 66.7,
        "reachability": 66.7,
        "no_software": 100.0
      },
      "likely_has_software": false,
      "adjustments": []
    }
  ],
  "market_notes": [
    "Several vendors sell restaurant billing software in India."
  ],
  "meta": {
    "credits_used": 7,
    "cache_hits": 0,
    "degraded": [],
    "partial": [],
    "notes": [],
    "timings_ms": {
      "plan": 410.2,
      "discover": 890.5,
      "research": 2100.0,
      "score": 1.1,
      "text": 1200.4
    }
  },
  "disclaimer": "Lead scores are signals from public data, not guarantees. Verify details before contacting."
}
```

## Errors

All errors use `{"error": {"code", "message", "request_id"}}`:

| Status | Code | Meaning |
|---|---|---|
| 404 | `feature_disabled` | `ENABLE_CUSTOMER_MODE=false` |
| 401 | `unauthorized` | Missing/wrong `X-Access-Code` (when `ACCESS_CODE` is set) |
| 422 | `invalid_input` | Offer/city/price/leads out of range |
| 429 | `rate_limited` / `budget_exhausted` | Per-IP limit, or day budget exhausted with nothing servable |
| 502 | `upstream_failure` | Maps failed entirely, or the deadline hit with zero leads |
