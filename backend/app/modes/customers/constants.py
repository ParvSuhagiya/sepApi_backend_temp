"""Customer-mode shared constants."""

__all__ = [
    "SCHEMA_VERSION",
    "LEAD_RESEARCH_TOP_N_CAP",
    "KNOWN_BUSINESS_TYPES",
    "DEFAULT_BUSINESS_TYPE",
    "MID_LEVEL_BANDS",
    "bands_for",
]

SCHEMA_VERSION = "1.0"

#: Hard cap for LEAD_RESEARCH_TOP_N (enforced where the setting is consumed).
LEAD_RESEARCH_TOP_N_CAP = 8

#: Business-type keywords recognised by the planner's deterministic fallback.
#: Maps a lowercase keyword found in the offer text to (singular, plural).
KNOWN_BUSINESS_TYPES: dict[str, tuple[str, str]] = {
    "restaurant": ("restaurant", "restaurants"),
    "cafe": ("cafe", "cafes"),
    "salon": ("salon", "salons"),
    "clinic": ("clinic", "clinics"),
    "gym": ("gym", "gyms"),
    "hotel": ("hotel", "hotels"),
    "school": ("school", "schools"),
    "pharmacy": ("pharmacy", "pharmacies"),
    "shop": ("shop", "shops"),
}

DEFAULT_BUSINESS_TYPE: tuple[str, str] = ("local business", "local businesses")

#: Mid-level fit bands per target type. "restaurant" is the tuned default;
#: "salon", "clinic" and "gym" are extension points that currently fall back
#: to the restaurant bands (see ``bands_for``) until they are tuned.
MID_LEVEL_BANDS: dict[str, dict[str, float]] = {
    "restaurant": {
        "reviews_best_min": 80.0,
        "reviews_best_max": 1500.0,
        "rating_best_min": 3.8,
        "rating_best_max": 4.6,
    },
}


def bands_for(target_type: str) -> dict[str, float]:
    """Return the mid-level bands for a target type (restaurant default)."""
    key = (target_type or "").strip().casefold()
    return MID_LEVEL_BANDS.get(key, MID_LEVEL_BANDS["restaurant"])
