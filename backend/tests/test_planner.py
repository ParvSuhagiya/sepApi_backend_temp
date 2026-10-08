"""Direct tests for the planner: fallback, coercion, failure paths."""

import pytest

from app.errors import LLMError
from app.schemas import Plan, Profile
from app.services import planner as planner_module
from app.services.planner import coerce_plan, fallback_plan, make_plan

PROFILE = Profile.model_validate(
    {"skills": "tailoring, stitching", "city": "Pune", "hours": 10, "budget": 0}
)


def test_fallback_plan_has_two_queries_each_with_city():
    plan = fallback_plan(PROFILE)
    assert len(plan.job_queries) == 2
    assert len(plan.local_queries) == 2
    assert len(plan.trend_keywords) == 2
    assert plan.forum_query
    assert all("Pune" in query for query in plan.local_queries)


def test_coerce_pads_single_item_lists_to_two_distinct():
    thin = Plan(
        job_queries=["only one"],
        local_queries=["single local"],
        trend_keywords=["single trend"],
        forum_query="",
    )
    coerced = coerce_plan(thin, PROFILE)
    assert len(coerced.job_queries) == 2
    assert len(coerced.local_queries) == 2
    assert len(coerced.trend_keywords) == 2
    assert coerced.job_queries[0] != coerced.job_queries[1]
    assert coerced.forum_query
    assert all("Pune" in query for query in coerced.local_queries)


async def test_make_plan_uses_fallback_on_provider_error(monkeypatch):
    import app.services.llm as llm_module

    async def boom(*args, **kwargs):
        raise LLMError("down")

    monkeypatch.setattr(llm_module, "ask_json", boom)
    plan, used_fallback = await make_plan(PROFILE)
    assert used_fallback is True
    assert len(plan.job_queries) == 2


async def test_make_plan_coerces_garbage_with_flag(monkeypatch):
    import app.services.llm as llm_module

    async def garbage(*args, **kwargs):
        return {"garbage": True}

    monkeypatch.setattr(llm_module, "ask_json", garbage)
    plan, used_fallback = await make_plan(PROFILE)
    assert used_fallback is True
    assert len(plan.job_queries) == 2
    assert len(plan.local_queries) == 2
