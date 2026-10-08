"""Tests for the search pipeline: degraded/partial, error payloads, rank cache."""

import pytest

import app.services.pipeline as pipeline_module
from app.schemas import Profile

PROFILE = Profile.model_validate(
    {"skills": "tailoring, stitching", "city": "Pune", "hours": 10, "budget": 0}
)

JOBS_OK = {
    "jobs_results": [
        {
            "title": "Tailor needed",
            "company_name": "ABC",
            "location": "Pune",
            "description": "Stitching work in Pune",
        }
    ]
}
MAPS_OK = {
    "local_results": [
        {"title": "Sharma Tailoring", "rating": 4.5, "address": "MG Road Pune"}
    ]
}
TRENDS_OK = {
    "interest_over_time": {
        "timeline_data": [
            {"date": f"2026-0{i}-01", "values": [{"extracted_value": 10 + i}]}
            for i in range(1, 10)
        ]
    }
}
FORUMS_OK = {
    "organic_results": [
        {
            "title": "Tailoring earnings",
            "link": "https://forum.test/t/1",
            "snippet": "Steady rates for tailors",
        }
    ]
}
NO_RESULTS = {"error": "Google Jobs - hasn't returned any results for this query."}
PROVIDER_ERROR = {"error": "Invalid API key"}


def _plan():
    from app.schemas import Plan

    return Plan(
        job_queries=["tailoring jobs", "stitching work"],
        local_queries=["tailoring in Pune", "boutiques in Pune"],
        trend_keywords=["tailoring", "stitching"],
        forum_query="tailoring earnings India",
    )


def _opp():
    return {
        "title": "Tailoring test",
        "type": "freelance",
        "why": "Fits well",
        "income_estimate": "INR 8,000 per month",
        "demand": 70,
        "competition": 40,
        "fit": 80,
        "cost_ease": 90,
        "trust": 75,
        "evidence": ["Pune tailoring demand steady", "4 listings in Pune found"],
        "plan_7_days": ["a", "b", "c", "d", "e", "f", "g"],
    }


def _script(results: list):
    calls: list = []

    async def fake_serp(engine: str, **params):
        calls.append(engine)
        action = results[(len(calls) - 1) % len(results)]
        if isinstance(action, BaseException):
            raise action
        return action

    fake_serp.calls = calls
    return fake_serp


@pytest.fixture
def staged(monkeypatch):
    async def fake_plan(profile):
        return _plan(), False

    monkeypatch.setattr(pipeline_module, "make_plan", fake_plan)
    return monkeypatch


async def test_partial_when_some_calls_in_group_fail(staged):
    from app.errors import SerpError

    staged.setattr(
        pipeline_module,
        "serp",
        _script(
            [
                JOBS_OK,
                SerpError("down"),
                SerpError("down"),
                SerpError("down"),
                TRENDS_OK,
                TRENDS_OK,
                FORUMS_OK,
            ]
        ),
    )
    staged.setattr(pipeline_module, "rank", _fake_rank([_opp()]))

    result = await pipeline_module.run_search(PROFILE, request_id="r1")
    assert result["meta"]["degraded"] == ["maps"]
    assert result["meta"]["partial"] == ["jobs"]
    assert len(result["opportunities"]) == 1


def _fake_rank(items):
    async def fake_rank(profile, evidence):
        return [dict(item) for item in items]

    return fake_rank


async def test_error_payload_counts_as_failure_but_no_results_is_valid(staged):
    staged.setattr(
        pipeline_module,
        "serp",
        _script(
            [
                PROVIDER_ERROR,
                PROVIDER_ERROR,
                MAPS_OK,
                MAPS_OK,
                TRENDS_OK,
                TRENDS_OK,
                NO_RESULTS,
            ]
        ),
    )
    staged.setattr(pipeline_module, "rank", _fake_rank([_opp()]))

    result = await pipeline_module.run_search(PROFILE, request_id="r2")
    assert result["meta"]["degraded"] == ["jobs"]
    assert result["meta"]["partial"] == []
    assert result["forum"] == []
    assert "forums" not in result["meta"]["degraded"]


async def test_rank_cache_skips_second_ranking(staged, tmp_cache_path, monkeypatch):
    import app.services.serp as serp_module
    from app.config import get_settings

    monkeypatch.setenv("RANK_CACHE_HOURS", "1")
    get_settings.cache_clear()
    await serp_module.close_serp()
    serp_module.init_cache(tmp_cache_path)

    staged.setattr(
        pipeline_module, "serp", _script([JOBS_OK, JOBS_OK, MAPS_OK, MAPS_OK, TRENDS_OK, TRENDS_OK, FORUMS_OK])
    )
    rank_calls: list = []

    async def counting_rank(profile, evidence):
        rank_calls.append(1)
        return [_opp()]

    staged.setattr(pipeline_module, "rank", counting_rank)

    first = await pipeline_module.run_search(PROFILE, request_id="a")
    second = await pipeline_module.run_search(PROFILE, request_id="b")
    assert len(rank_calls) == 1
    assert first["opportunities"] == second["opportunities"]
    assert second["meta"]["request_id"] == "b"
    await serp_module.close_serp()
    get_settings.cache_clear()
