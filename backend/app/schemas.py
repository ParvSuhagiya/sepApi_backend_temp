"""Validated Pydantic request, AI-facing, and response models."""

import json
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

__all__ = [
    "Profile",
    "OutreachRequest",
    "Plan",
    "OpportunityAI",
    "Opportunity",
    "Job",
    "Place",
    "TrendPoint",
    "ForumItem",
    "Stats",
    "Meta",
    "SearchResponse",
    "OutreachResponse",
    "ErrorDetail",
    "ErrorResponse",
]

OpportunityType = Literal[
    "job",
    "freelance",
    "local business",
    "online selling",
    "content",
]


class Profile(BaseModel):
    """User profile parameters used to tailor earning recommendations."""

    model_config = ConfigDict(str_strip_whitespace=True)

    skills: str = Field(min_length=2, max_length=300)
    city: str = Field(min_length=2, max_length=80)
    hours: int = Field(default=10, ge=1, le=168)
    budget: int = Field(default=0, ge=0)


class OutreachRequest(BaseModel):
    """Inputs for creating a message tailored to an opportunity target."""

    profile: Profile
    target: dict[str, Any]

    @field_validator("target")
    @classmethod
    def target_json_must_fit_limit(cls, target: dict[str, Any]) -> dict[str, Any]:
        """Reject targets whose JSON representation is larger than 2048 chars."""
        try:
            serialized = json.dumps(target)
        except (TypeError, ValueError, RecursionError) as exc:
            raise ValueError("target must be JSON serializable") from exc
        if len(serialized) > 2048:
            raise ValueError("target must not exceed 2048 JSON characters")
        return target


class Plan(BaseModel):
    """Search phrases proposed for the recommendation pipeline."""

    model_config = ConfigDict(str_strip_whitespace=True)

    job_queries: list[str]
    local_queries: list[str]
    trend_keywords: list[str]
    forum_query: str


class OpportunityAI(BaseModel):
    """Lenient representation of an untrusted AI-generated opportunity."""

    model_config = ConfigDict(extra="ignore")

    title: str | None = None
    type: str | None = None
    why: str | None = None
    income_estimate: str | None = None
    demand: int | float | str | None = None
    competition: int | float | str | None = None
    fit: int | float | str | None = None
    cost_ease: int | float | str | None = None
    trust: int | float | str | None = None
    evidence: list[str] | str | None = None
    plan_7_days: list[str] | None = None


class Opportunity(BaseModel):
    """Validated final earning opportunity with scores and supporting evidence."""

    title: str
    type: OpportunityType
    why: str
    income_estimate: str
    demand: int = Field(ge=0, le=100)
    competition: int = Field(ge=0, le=100)
    fit: int = Field(ge=0, le=100)
    cost_ease: int = Field(ge=0, le=100)
    trust: int = Field(ge=0, le=100)
    evidence: list[str] = Field(min_length=2, max_length=3)
    plan_7_days: list[str] = Field(min_length=7, max_length=7)
    earn_score: int
    score_breakdown: dict[str, float]
    adjustments: list[str] = []


class Job(BaseModel):
    """A job result returned from a search source."""

    title: str
    company: str
    location: str
    via: str = ""
    salary: str | None = None
    desc: str
    link: str | None = None
    flags: list[str]
    risk: Literal["Low", "Medium", "High"]


class Place(BaseModel):
    """A local business or service provider search result."""

    name: str
    rating: float | None = None
    reviews: int | None = None
    phone: str | None = None
    address: str | None = None
    type: str | None = None


class TrendPoint(BaseModel):
    """A dated trend measurement."""

    date: str
    value: int


class ForumItem(BaseModel):
    """A relevant discussion found in an online forum."""

    title: str
    link: str
    snippet: str


class Stats(BaseModel):
    """Usage and cache statistics for a response."""

    credits_used: int
    cache_hits: int


class Meta(BaseModel):
    """Request metadata returned alongside search results."""

    request_id: str
    duration_ms: int
    degraded: list[str]
    partial: list[str] = []
    notes: list[str] = []


class SearchResponse(BaseModel):
    """Complete response containing recommendations and supporting source data."""

    opportunities: list[Opportunity]
    jobs: list[Job]
    local: list[Place]
    trend: list[TrendPoint]
    trend_keyword: str | None
    trend_growth: dict[str, int]
    forum: list[ForumItem]
    stats: Stats
    meta: Meta


class OutreachResponse(BaseModel):
    """Generated outreach message plus a fixed safety note."""

    message: str
    safety_note: str


class ErrorDetail(BaseModel):
    """Safe API error details."""

    code: str
    message: str
    request_id: str


class ErrorResponse(BaseModel):
    """Top-level error response envelope."""

    error: ErrorDetail
