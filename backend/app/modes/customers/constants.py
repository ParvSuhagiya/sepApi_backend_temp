"""Customer-mode shared constants."""

__all__ = [
    "SCHEMA_VERSION",
    "LEAD_RESEARCH_TOP_N_CAP",
    "KNOWN_BUSINESS_TYPES",
    "DEFAULT_BUSINESS_TYPE",
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
