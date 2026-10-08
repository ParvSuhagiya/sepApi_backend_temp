"""Customer-mode validated request/response models.

Honesty rules enforced here: nothing is auto-sent, scores are signals, and
every claim shown must trace to provided evidence (see ``match_reasons``).
"""

from __future__ import annotations

import unicodedata
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

__all__ = [
    "DISCLAIMER",
    "OfferInput",
    "LeadPlan",
    "LeadPlace",
    "Lead",
    "LeadMeta",
    "LeadsResponse",
]

DISCLAIMER = (
    "Lead scores are signals from public data, not guarantees. "
    "Verify details before contacting."
)

#: Offers with more than this share of non-letter characters are rejected
#: as garbage (spaces and punctuation count as non-letters).
MAX_NON_LETTER_SHARE = 0.30


def _clean_text(value: str) -> str:
    """Replace control characters, collapse whitespace, strip ends."""
    without_controls = "".join(
        " " if unicodedata.category(char) == "Cc" else char for char in value
    )
    return " ".join(without_controls.split())


def _clean_field(value: object) -> object:
    if isinstance(value, str):
        return _clean_text(value)
    return value


def _non_letter_share(text: str) -> float:
    if not text:
        return 1.0
    non_letters = sum(1 for char in text if not char.isalpha())
    return non_letters / len(text)


class OfferInput(BaseModel):
    """Owner-supplied product description plus targeting parameters."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    offer: str = Field(min_length=20, max_length=1000)
    city: str = Field(min_length=2, max_length=80)
    monthly_price: int | None = Field(default=None, ge=0, le=1_000_000)
    max_leads: int = Field(default=10, ge=5, le=20)

    @field_validator("offer", "city", mode="before")
    @classmethod
    def _strip_controls(cls, value: object) -> object:
        return _clean_field(value)

    @field_validator("offer", mode="after")
    @classmethod
    def _offer_must_read_as_text(cls, value: str) -> str:
        if _non_letter_share(value) > MAX_NON_LETTER_SHARE:
            raise ValueError("offer must be mostly letters, not symbols or numbers")
        return value


class LeadPlan(BaseModel):
    """AI (or fallback) plan mapping an offer onto Maps searches."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    city: str = Field(min_length=2, max_length=80)
    product_summary: str = Field(min_length=1, max_length=200)
    target_customer: str = Field(min_length=1, max_length=100)
    buyer_roles: list[str] = Field(min_length=1, max_length=4)
    maps_queries: list[str] = Field(min_length=3, max_length=3)
    pain_keywords: list[str] = Field(min_length=4, max_length=8)
    competitor_query: str = Field(min_length=1, max_length=120)
    pitch_angle: str = Field(min_length=1, max_length=160)

    @field_validator(
        "city",
        "product_summary",
        "target_customer",
        "competitor_query",
        "pitch_angle",
        mode="before",
    )
    @classmethod
    def _strip_controls(cls, value: object) -> object:
        return _clean_field(value)

    @field_validator("buyer_roles", mode="after")
    @classmethod
    def _roles_must_be_nonempty(cls, value: list[str]) -> list[str]:
        cleaned = [_clean_text(role) for role in value if _clean_text(role)]
        if not cleaned:
            raise ValueError("buyer_roles must contain at least one role")
        for role in cleaned:
            if len(role) > 60:
                raise ValueError("buyer_roles entries must be at most 60 characters")
        return cleaned

    @field_validator("maps_queries", mode="after")
    @classmethod
    def _queries_must_be_distinct_with_city(cls, value: list[str]) -> list[str]:
        cleaned = [_clean_text(query) for query in value]
        if any(not query or len(query) > 100 for query in cleaned):
            raise ValueError("maps_queries entries must be 1..100 characters")
        lowered = [query.casefold() for query in cleaned]
        if len(set(lowered)) != len(cleaned):
            raise ValueError("maps_queries must be 3 distinct queries")
        return cleaned

    @field_validator("pain_keywords", mode="after")
    @classmethod
    def _pains_must_fit_lengths(cls, value: list[str]) -> list[str]:
        cleaned = [_clean_text(phrase) for phrase in value]
        if any(not 2 <= len(phrase) <= 40 for phrase in cleaned):
            raise ValueError("pain_keywords phrases must be 2..40 characters")
        return cleaned

    def model_post_init(self, _context: object) -> None:
        """Require every maps query to name the target city."""
        city = self.city.casefold()
        for query in self.maps_queries:
            if city not in query.casefold():
                raise ValueError("maps_queries must each include the city")


class LeadPlace(BaseModel):
    """A discovered candidate business, normalised from Maps results.

    Research enrichment (``research``, ``pain_snippets``, ``pain_hits``,
    ``likely_has_software``) is filled in by ``research.py``; discovery
    leaves the defaults.
    """

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=200)
    type: str | None = Field(default=None, max_length=120)
    address: str | None = Field(default=None, max_length=300)
    rating: float | None = Field(default=None, ge=0, le=5)
    review_count: int | None = Field(default=None, ge=0)
    price_level: int | None = Field(default=None, ge=1, le=4)
    phone: str | None = Field(default=None, max_length=20)
    website: str | None = Field(default=None, max_length=200)
    maps_url: str | None = Field(default=None, max_length=500)
    place_id: str | None = Field(default=None, max_length=200)
    operating_status: str | None = Field(default=None, max_length=120)
    research: Literal["pending", "ok", "partial"] = "pending"
    pain_snippets: list[str] = Field(default_factory=list, max_length=3)
    pain_hits: int = Field(default=0, ge=0)
    likely_has_software: bool = False

    @field_validator("pain_snippets", mode="after")
    @classmethod
    def _snippets_must_fit_lengths(cls, value: list[str]) -> list[str]:
        cleaned = [_clean_text(snippet) for snippet in value]
        if any(not 1 <= len(snippet) <= 140 for snippet in cleaned):
            raise ValueError("pain_snippets entries must be 1..140 characters")
        return cleaned


class Lead(BaseModel):
    """One candidate customer business. Scores are signals, not guarantees."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=200)
    address: str | None = Field(default=None, max_length=300)
    rating: float | None = Field(default=None, ge=0, le=5)
    user_ratings_total: int | None = Field(default=None, ge=0)
    business_type: str | None = Field(default=None, max_length=120)
    match_score: int = Field(ge=0, le=100)
    match_reasons: list[str] = Field(min_length=1, max_length=3)
    research_notes: str | None = Field(default=None, max_length=500)
    why_fit: str | None = Field(default=None, max_length=200)
    pitch_angle: str | None = Field(default=None, max_length=160)
    suggested_first_question: str | None = Field(default=None, max_length=120)
    phone: str | None = Field(default=None, max_length=20)
    maps_url: str | None = Field(default=None, max_length=500)
    price_level: int | None = Field(default=None, ge=1, le=4)
    score_breakdown: dict[str, float] = Field(default_factory=dict)
    likely_has_software: bool = False
    adjustments: list[str] = Field(default_factory=list)

    @field_validator("match_reasons", mode="after")
    @classmethod
    def _reasons_must_fit_lengths(cls, value: list[str]) -> list[str]:
        cleaned = [_clean_text(reason) for reason in value]
        if any(not 1 <= len(reason) <= 200 for reason in cleaned):
            raise ValueError("match_reasons entries must be 1..200 characters")
        return cleaned


class LeadMeta(BaseModel):
    """Credits, cache, degradation and per-stage timings for a leads request."""

    model_config = ConfigDict(extra="forbid")

    credits_used: int = Field(ge=0)
    cache_hits: int = Field(ge=0)
    degraded: list[str] = []
    partial: list[str] = []
    notes: list[str] = []
    timings_ms: dict[str, float] = {}


class LeadsResponse(BaseModel):
    """Ranked customer leads plus honesty metadata."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    schema_version: Literal["1.0"] = "1.0"
    offer_summary: str = Field(min_length=1, max_length=300)
    leads: list[Lead] = Field(max_length=20)
    market_notes: list[str] = Field(max_length=5)
    meta: LeadMeta
    disclaimer: str = Field(default=DISCLAIMER, min_length=1)

    @field_validator("market_notes", mode="after")
    @classmethod
    def _notes_must_fit_lengths(cls, value: list[str]) -> list[str]:
        cleaned = [_clean_text(note) for note in value if _clean_text(note)]
        if len(cleaned) != len(value):
            raise ValueError("market_notes must not contain blank entries")
        if any(len(note) > 200 for note in cleaned):
            raise ValueError("market_notes entries must be at most 200 characters")
        return cleaned
