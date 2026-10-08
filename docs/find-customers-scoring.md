# Find Customers — scoring signals

Customer mode ranks **leads** (businesses that might buy the user's product).
Scores are **signals, not guarantees**; see `Lead.disclaimer`.

## Mid-level fit (`mid_level_signal`, 0–100)

Weighted blend of three listing components plus a reachability bonus:

| Component | Weight | Best band (restaurant) | Outside the band |
|---|---|---|---|
| Review count | 0.40 (`W_MID_REVIEWS`) | 80–1500 | Linear ramp from 40 at 0 reviews; decays to a 60 floor above 3000 |
| Rating | 0.40 (`W_MID_RATING`) | 3.8–4.6 | −80/below-point floored at 20; −100/above-point floored at 60 |
| Price level | 0.20 (`W_MID_PRICE`) | 2 → 100, 3 → 75, 1 → 50, 4 → 40 | — |

- Phone present: `+5` (`MID_PHONE_BONUS`), capped at 100.
- Unknown (missing) values score neutral 50 (`UNKNOWN_COMPONENT_SCORE`).
- Known chain name (whole-word match on `app/data/chains.py`): signal **0**, dropped downstream.

Bands live in `MID_LEVEL_BANDS` keyed by target type (`restaurant` tuned;
`salon`/`clinic`/`gym` are extension points falling back to restaurant).

## Lead score (0–100)

| Component | Weight | Scale |
|---|---|---|
| Mid-level signal | 0.40 (`W_MID_LEVEL`) | 0–100 |
| Pain (`pain_hits` capped at 3, ÷3) | 0.30 (`W_PAIN`) | 0–100 |
| Reachability (phone 10 + website 5, ÷15) | 0.15 (`W_REACHABILITY`) | 0–100 |
| Not using software (0 if detected else 100) | 0.15 (`W_NO_SOFTWARE`) | 0 or 100 |

Weights sum to 1.0 (asserted in tests). Guardrails append user-friendly
`adjustments`: no phone and no website caps the score at 60 ("Hard to
reach: no public phone or website"); partial research forces the pain
component to 0 ("Reviews unavailable, score uses listing data only").

## SSRF-safety rule

Customer mode makes **no requests to third-party sites other than SerpAPI**.
Lead websites are stored as display strings only and are never fetched.
Pinned by `test_discovery_contacts_only_serpapi`.
