"""Customer-mode scoring: deterministic lead signals (never guarantees).

Mid-level fit (step 2.2)
------------------------
``mid_level_signal`` rates how much a business looks like an independent,
mid-sized operation that could buy from a vendor:

- review count: best inside ``reviews_best_min``..``reviews_best_max``
  (80..1500 for restaurants), with linear ramps outside;
- rating: best inside ``rating_best_min``..``rating_best_max`` (3.8..4.6),
  with linear ramps outside;
- price level: 2 best, 3 ok, 1 or 4 penalised;
- phone present: small bonus (reachable owner);
- known chain name: signal 0 (dropped downstream).

Unknown (missing) values score neutral (50), never an error. Component
weights (reviews 40%, rating 40%, price 20%) sum to 1.0.

Lead score (step 2.4) is added below in the same module.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from app.data.chains import KNOWN_CHAINS
from app.modes.customers.constants import MID_LEVEL_BANDS, bands_for
from app.modes.customers.schemas import LeadPlace

__all__ = [
    "W_MID_REVIEWS",
    "W_MID_RATING",
    "W_MID_PRICE",
    "MID_PHONE_BONUS",
    "REVIEWS_ZERO_SCORE",
    "REVIEWS_HIGH_FLOOR",
    "RATING_LOW_FLOOR",
    "RATING_HIGH_FLOOR",
    "UNKNOWN_COMPONENT_SCORE",
    "PRICE_LEVEL_SCORES",
    "score_review_count",
    "score_rating_value",
    "score_price_level",
    "is_chain",
    "is_chain_lead",
    "mid_level_signal",
    "W_MID_LEVEL",
    "W_PAIN",
    "W_REACHABILITY",
    "W_NO_SOFTWARE",
    "REACH_PHONE_POINTS",
    "REACH_WEBSITE_POINTS",
    "REACH_MAX_POINTS",
    "PAIN_HITS_FULL",
    "UNREACHABLE_SCORE_CAP",
    "LeadScore",
    "lead_score",
]

#: Component weights for mid_level_signal; must sum to 1.0.
W_MID_REVIEWS = 0.40
W_MID_RATING = 0.40
W_MID_PRICE = 0.20

#: Bonus points (0..100 scale, applied after weighting, capped at 100).
MID_PHONE_BONUS = 5

#: Score for a business with zero reviews (ramp start).
REVIEWS_ZERO_SCORE = 40.0
#: Floor for review counts far above the best band (very large chains/crowds).
REVIEWS_HIGH_FLOOR = 60.0
#: Floor for ratings far below the best band.
RATING_LOW_FLOOR = 20.0
#: Floor for ratings above the best band (near-perfect looks curated/fake).
RATING_HIGH_FLOOR = 60.0
#: Neutral score for unknown (missing) component values.
UNKNOWN_COMPONENT_SCORE = 50.0

#: Price-level component scores: 2 best, 3 ok, 1 or 4 penalised.
PRICE_LEVEL_SCORES: dict[int, float] = {1: 50.0, 2: 100.0, 3: 75.0, 4: 40.0}


def _normalise_name(name: str) -> str:
    text = (name or "").casefold().replace("&", " ")
    for char in (".", "'", "'", '"', '"'):
        text = text.replace(char, "")
    return " ".join(text.split())


def is_chain(name: str) -> bool:
    """Whole-word, case-insensitive chain match; False for empty/generic names."""
    normalised = _normalise_name(name)
    if not normalised:
        return False
    for chain in KNOWN_CHAINS:
        if re.search(r"\b" + re.escape(chain) + r"\b", normalised):
            return True
    return False


def is_chain_lead(place: LeadPlace) -> bool:
    """True when a lead's name matches a known chain brand."""
    return is_chain(place.name)


def score_review_count(count: int | None, bands: dict[str, float]) -> float:
    """100 inside the best band; linear ramps outside; 50 when unknown."""
    if count is None:
        return UNKNOWN_COMPONENT_SCORE
    lo = bands["reviews_best_min"]
    hi = bands["reviews_best_max"]
    if lo <= count <= hi:
        return 100.0
    if count < lo:
        span = max(lo, 1.0)
        return REVIEWS_ZERO_SCORE + (100.0 - REVIEWS_ZERO_SCORE) * (count / span)
    over = (count - hi) / max(hi, 1.0)
    return max(
        REVIEWS_HIGH_FLOOR, 100.0 - (100.0 - REVIEWS_HIGH_FLOOR) * min(over, 1.0)
    )


def score_rating_value(rating: float | None, bands: dict[str, float]) -> float:
    """100 inside the best band; linear ramps outside; 50 when unknown."""
    if rating is None:
        return UNKNOWN_COMPONENT_SCORE
    lo = bands["rating_best_min"]
    hi = bands["rating_best_max"]
    if lo <= rating <= hi:
        return 100.0
    if rating < lo:
        return max(RATING_LOW_FLOOR, 100.0 - (lo - rating) * 80.0)
    return max(RATING_HIGH_FLOOR, 100.0 - (rating - hi) * 100.0)


def score_price_level(price_level: int | None) -> float:
    """Lookup table (2 best, 3 ok, 1/4 penalised); 50 when unknown."""
    if price_level is None:
        return UNKNOWN_COMPONENT_SCORE
    return PRICE_LEVEL_SCORES.get(price_level, UNKNOWN_COMPONENT_SCORE)


def mid_level_signal(place: LeadPlace, target_type: str = "restaurant") -> int:
    """Integer 0..100 mid-level fit signal; 0 for known chains (dropped)."""
    if is_chain_lead(place):
        return 0
    bands = bands_for(target_type)
    if not isinstance(bands, dict):
        bands = MID_LEVEL_BANDS["restaurant"]
    try:
        blended = (
            W_MID_REVIEWS * score_review_count(place.review_count, bands)
            + W_MID_RATING * score_rating_value(place.rating, bands)
            + W_MID_PRICE * score_price_level(place.price_level)
        )
    except (KeyError, TypeError):
        blended = UNKNOWN_COMPONENT_SCORE
    if place.phone:
        blended += MID_PHONE_BONUS
    return max(0, min(100, int(round(blended))))


#: Lead-score weights; must sum to 1.0.
W_MID_LEVEL = 0.40
W_PAIN = 0.30
W_REACHABILITY = 0.15
W_NO_SOFTWARE = 0.15

#: Reachability points (normalised by REACH_MAX_POINTS to 0..100).
REACH_PHONE_POINTS = 10
REACH_WEBSITE_POINTS = 5
REACH_MAX_POINTS = REACH_PHONE_POINTS + REACH_WEBSITE_POINTS

#: Pain hits at or above this count earn the full pain component.
PAIN_HITS_FULL = 3

#: Cap applied when a lead has neither phone nor website.
UNREACHABLE_SCORE_CAP = 60


@dataclass
class LeadScore:
    """Final 0..100 lead signal with per-component breakdown and guardrails."""

    score: int = 0
    breakdown: dict[str, float] = field(default_factory=dict)
    adjustments: list[str] = field(default_factory=list)


def _clamp_0_100(value: object) -> int:
    if isinstance(value, bool):
        number = int(value)
    elif isinstance(value, float):
        if value != value:  # NaN
            return 0
        try:
            number = int(value)
        except (OverflowError, ValueError):
            return 0
    elif isinstance(value, int):
        number = value
    elif isinstance(value, str):
        try:
            number = int(value.strip())
        except (TypeError, ValueError):
            return 0
    else:
        return 0
    return max(0, min(100, number))


def lead_score(
    *,
    mid_level: int,
    pain_hits: int,
    has_phone: bool,
    has_website: bool,
    likely_has_software: bool,
    research: str = "ok",
) -> LeadScore:
    """Blend mid-level fit, pain, reachability and no-software signals.

    Guardrails only cap downwards and every intervention is listed in
    ``adjustments``. Never raises; unusable inputs score 0.
    """
    try:
        hits = max(0, int(pain_hits))  # type: ignore[arg-type]
    except (TypeError, ValueError):
        hits = 0
    mid = _clamp_0_100(mid_level)

    adjustments: list[str] = []
    if research == "partial":
        pain_component = 0.0
        adjustments.append("Reviews unavailable, score uses listing data only")
    else:
        pain_component = min(hits, PAIN_HITS_FULL) / PAIN_HITS_FULL * 100.0

    reach_points = (REACH_PHONE_POINTS if has_phone else 0) + (
        REACH_WEBSITE_POINTS if has_website else 0
    )
    reach_component = reach_points / REACH_MAX_POINTS * 100.0
    no_software_component = 0.0 if likely_has_software else 100.0

    total = (
        W_MID_LEVEL * mid
        + W_PAIN * pain_component
        + W_REACHABILITY * reach_component
        + W_NO_SOFTWARE * no_software_component
    )
    if not has_phone and not has_website:
        total = min(total, UNREACHABLE_SCORE_CAP)
        adjustments.append("Hard to reach: no public phone or website")

    return LeadScore(
        score=max(0, min(100, int(round(total)))),
        breakdown={
            "mid_level": round(float(mid), 1),
            "pain": round(pain_component, 1),
            "reachability": round(reach_component, 1),
            "no_software": round(no_software_component, 1),
        },
        adjustments=adjustments,
    )
