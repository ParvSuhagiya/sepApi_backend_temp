"""Tests for API request, AI-facing, and response schemas."""

import pytest
from pydantic import ValidationError

from app.schemas import (
    ErrorResponse,
    Job,
    Opportunity,
    OpportunityAI,
    OutreachRequest,
    Plan,
    Profile,
    SearchResponse,
)


def valid_profile_data(**overrides: object) -> dict[str, object]:
    """Build valid profile data with optional field overrides."""
    return {
        "skills": "Python basics",
        "city": "Pune",
        **overrides,
    }


@pytest.mark.parametrize(
    "profile",
    [
        {"skills": "  ", "city": "Pune"},
        {"skills": "Python", "city": " "},
        {"skills": "Python", "city": "X"},
        {"skills": "x" * 301, "city": "Pune"},
        {"skills": "Python", "city": "x" * 81},
        {"skills": "Python", "city": "Pune", "hours": 0},
        {"skills": "Python", "city": "Pune", "hours": 169},
        {"skills": "Python", "city": "Pune", "budget": -1},
    ],
)
def test_profile_rejects_out_of_range_or_blank_values(
    profile: dict[str, object],
) -> None:
    with pytest.raises(ValidationError):
        Profile.model_validate(profile)


def test_profile_strips_strings_coerces_numeric_strings_and_uses_defaults() -> None:
    profile = Profile.model_validate(
        {"skills": "  Python basics ", "city": " Pune ", "hours": "20", "budget": "500"}
    )
    assert profile.skills == "Python basics"
    assert profile.city == "Pune"
    assert profile.hours == 20
    assert profile.budget == 500

    defaults = Profile.model_validate({"skills": "Python", "city": "Pune"})
    assert defaults.hours == 10
    assert defaults.budget == 0


def test_outreach_request_rejects_target_over_2048_json_characters() -> None:
    with pytest.raises(ValidationError, match="2048"):
        OutreachRequest.model_validate(
            {
                "profile": valid_profile_data(),
                "target": {"description": "x" * 2049},
            }
        )


def test_outreach_request_accepts_target_within_json_size_limit() -> None:
    request = OutreachRequest.model_validate(
        {"profile": valid_profile_data(), "target": {"title": "Tutor"}}
    )
    assert request.target == {"title": "Tutor"}


def test_plan_strips_query_strings() -> None:
    plan = Plan.model_validate(
        {
            "job_queries": ["  Python jobs  "],
            "local_queries": [" tutoring near Pune "],
            "trend_keywords": ["  online work "],
            "forum_query": " remote opportunities ",
        }
    )
    assert plan.job_queries == ["Python jobs"]
    assert plan.local_queries == ["tutoring near Pune"]
    assert plan.trend_keywords == ["online work"]
    assert plan.forum_query == "remote opportunities"


def test_opportunity_ai_accepts_optional_messy_fields_and_ignores_extras() -> None:
    opportunity = OpportunityAI.model_validate(
        {
            "title": "Tutor",
            "type": "unexpected raw type",
            "trust": "82.5",
            "evidence": "Found local demand",
            "plan_7_days": None,
            "unused_provider_field": {"raw": True},
        }
    )
    assert opportunity.title == "Tutor"
    assert opportunity.type == "unexpected raw type"
    assert opportunity.trust == "82.5"
    assert opportunity.evidence == "Found local demand"
    assert opportunity.plan_7_days is None
    assert OpportunityAI.model_validate({}).title is None


def opportunity_sample() -> dict[str, object]:
    return {
        "title": "Online Python tutor",
        "type": "freelance",
        "why": "Flexible work that uses existing skills.",
        "income_estimate": "INR 5,000-15,000 per month",
        "demand": 80,
        "competition": 45,
        "fit": 90,
        "cost_ease": 85,
        "trust": 75,
        "evidence": ["Local tutoring demand", "Remote tutoring listings"],
        "plan_7_days": [
            "Choose a topic",
            "Prepare a lesson",
            "Contact learners",
            "Offer a free trial",
            "Collect feedback",
            "Set your price",
            "Repeat weekly",
        ],
        "earn_score": 82,
        "score_breakdown": {"fit": 0.9, "demand": 0.8},
    }


def test_search_response_serializes_realistic_sample() -> None:
    response = SearchResponse.model_validate(
        {
            "opportunities": [opportunity_sample()],
            "jobs": [
                {
                    "title": "Python tutor",
                    "company": "Learning Co",
                    "location": "Pune",
                    "desc": "Teach beginner Python.",
                    "flags": [],
                    "risk": "Low",
                }
            ],
            "local": [
                {
                    "name": "Pune Learning Centre",
                    "rating": 4.5,
                    "reviews": 20,
                    "type": "Tuition",
                }
            ],
            "trend": [{"date": "2026-10-01", "value": 65}],
            "trend_keyword": "Python tutor",
            "trend_growth": {"month": 12},
            "forum": [
                {
                    "title": "Tutoring discussion",
                    "link": "https://example.test/thread",
                    "snippet": "A local learner is looking for a tutor.",
                }
            ],
            "stats": {"credits_used": 2, "cache_hits": 1},
            "meta": {"request_id": "req-123", "duration_ms": 120, "degraded": []},
        }
    )

    payload = response.model_dump(mode="json")
    assert payload["jobs"][0]["via"] == ""
    assert payload["opportunities"][0]["type"] == "freelance"
    assert payload["meta"]["request_id"] == "req-123"


def test_search_response_forbids_invalid_job_risk() -> None:
    with pytest.raises(ValidationError):
        Job.model_validate(
            {
                "title": "Python tutor",
                "company": "Learning Co",
                "location": "Pune",
                "desc": "Teach Python.",
                "flags": [],
                "risk": "Unknown",
            }
        )


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("type", "unknown"),
        ("demand", 101),
        ("trust", -1),
        ("evidence", ["only one item"]),
        ("plan_7_days", ["one", "two"]),
    ],
)
def test_final_opportunity_rejects_invalid_values(field: str, value: object) -> None:
    with pytest.raises(ValidationError):
        Opportunity.model_validate({**opportunity_sample(), field: value})


def test_error_response_shape_validates() -> None:
    error = {
        "error": {
            "code": "invalid_input",
            "message": "The request was invalid.",
            "request_id": "req-123",
        }
    }
    assert ErrorResponse.model_validate(error).model_dump() == error
