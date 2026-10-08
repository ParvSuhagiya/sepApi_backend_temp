"""Tests for the customer-mode pipeline: order, deadline, budget, sharing."""

import asyncio

import pytest

import app.modes.customers.pipeline as pipeline_module
import app.services.serp as serp_module
from app.budget import try_consume, used_today
from app.errors import AllSourcesFailed, BudgetExhausted
from app.modes.customers.discovery import DiscoveryResult
from app.modes.customers.ranker import LeadAnnotation
from app.modes.customers.research import ResearchResult
from app.modes.customers.schemas import LeadPlace, LeadPlan, LeadsResponse, OfferInput

OFFER = (
    "i am a devops engineer and i have made a restaurant management system: "
    "manager assigns customers, waiter takes order, cook prepares food, "
    "waiter serves, manager handles bills. 800 rupees/month. "
    "target mid level restaurants that have waiter, manager, cook"
)


def _input(**overrides) -> OfferInput:
    base = {"offer": OFFER, "city": "Ahmedabad", "max_leads": 10}
    base.update(overrides)
    return OfferInput.model_validate(base)


def _plan() -> LeadPlan:
    return LeadPlan.model_validate(
        {
            "city": "Ahmedabad",
            "product_summary": "Restaurant management system",
            "target_customer": "Mid-level restaurants in Ahmedabad",
            "buyer_roles": ["owner"],
            "maps_queries": [
                "restaurants in Ahmedabad",
                "family restaurants in Ahmedabad",
                "cafes in Ahmedabad",
            ],
            "pain_keywords": ["billing errors", "staff shifts", "order delays", "food waste"],
            "competitor_query": "restaurant billing software India",
            "pitch_angle": "Cut billing errors",
        }
    )


def _places(count: int = 8, with_chain: bool = False) -> list[LeadPlace]:
    places = [
        LeadPlace.model_validate(
            {
                "name": f"Place {i}",
                "address": f"{i} MG Road Ahmedabad",
                "rating": 4.0 + (i % 3) * 0.2,
                "review_count": 200 + i * 40,
                "price_level": 2,
                "phone": "919822012345" if i % 2 == 0 else None,
                "place_id": f"p{i}",
                "type": "Restaurant",
            }
        )
        for i in range(count)
    ]
    if with_chain:
        places.append(
            LeadPlace.model_validate({"name": "Dominos Pizza Ahmedabad", "place_id": "chain1"})
        )
    return places


class _Stage:
    def __init__(self, places=None, research_delay: float = 0.0):
        self.calls: list[str] = []
        self.places = places if places is not None else _places()
        self.research_delay = research_delay

    async def plan_leads(self, offer, city):
        await asyncio.sleep(0)
        self.calls.append("plan")
        return _plan()

    async def discover(self, plan):
        await asyncio.sleep(0)
        self.calls.append("discover")
        return DiscoveryResult(
            places=list(self.places), maps_partial=False,
            queries_run=3, queries_failed=0,
        )

    async def research_leads(self, leads, plan, **kwargs):
        await asyncio.sleep(self.research_delay)
        self.calls.append("research")
        enriched = [
            lead.model_copy(
                update={
                    "research": "ok",
                    "pain_hits": 2,
                    "pain_snippets": ["bill was wrong, waited long"],
                    "likely_has_software": False,
                }
            )
            for lead in leads
        ]
        return ResearchResult(
            leads=enriched, market_notes=["Market note"], calls_made=2, notes=[]
        )

    async def explain_leads(self, items, *, city, default_pitch, pains=()):
        await asyncio.sleep(0)
        self.calls.append("text")
        return (
            [
                LeadAnnotation(
                    why_fit=f"Why {i}",
                    pitch_angle="Pitch",
                    suggested_first_question="Question?",
                )
                for i, _ in enumerate(items)
            ],
            False,
        )


@pytest.fixture
async def fresh_cache(tmp_cache_path):
    await serp_module.close_serp()
    serp_module.init_cache(tmp_cache_path)
    pipeline_module.reset_leads_state()
    yield tmp_cache_path
    pipeline_module.reset_leads_state()
    await serp_module.close_serp()


def _patch_stages(monkeypatch: pytest.MonkeyPatch, stage: _Stage) -> None:
    import app.modes.customers.discovery as discovery_module
    import app.modes.customers.planner as planner_module
    import app.modes.customers.ranker as ranker_module
    import app.modes.customers.research as research_module

    monkeypatch.setattr(planner_module, "plan_leads", stage.plan_leads)
    monkeypatch.setattr(discovery_module, "discover", stage.discover)
    monkeypatch.setattr(research_module, "research_leads", stage.research_leads)
    monkeypatch.setattr(ranker_module, "explain_leads", stage.explain_leads)


# --- happy path -----------------------------------------------------------------

async def test_happy_path_shape_and_order(
    monkeypatch: pytest.MonkeyPatch, fresh_cache
) -> None:
    stage = _Stage()
    _patch_stages(monkeypatch, stage)
    payload = await pipeline_module.run_leads(_input())
    response = LeadsResponse.model_validate(payload)
    assert response.schema_version == "1.0"
    assert response.disclaimer == (
        "Lead scores are signals from public data, not guarantees. "
        "Verify details before contacting."
    )
    assert 1 <= len(response.leads) <= 10
    scores = [lead.match_score for lead in response.leads]
    assert scores == sorted(scores, reverse=True)
    assert stage.calls == ["plan", "discover", "research", "text"]
    assert list(payload["meta"]["timings_ms"]) == [
        "plan", "discover", "research", "score", "text",
    ]
    assert set(payload["meta"]) == {
        "credits_used", "cache_hits", "degraded", "partial", "notes", "timings_ms",
    }
    first = response.leads[0]
    assert first.why_fit == "Why 0"
    assert first.match_reasons
    assert first.research_notes == "bill was wrong, waited long"


async def test_chains_dropped_and_max_leads_respected(
    monkeypatch: pytest.MonkeyPatch, fresh_cache
) -> None:
    stage = _Stage(places=_places(8, with_chain=True))
    _patch_stages(monkeypatch, stage)
    payload = await pipeline_module.run_leads(_input(max_leads=5))
    assert len(payload["leads"]) == 5
    assert all("Dominos" not in lead["name"] for lead in payload["leads"])


async def test_maps_partial_and_reviews_partial_noted(
    monkeypatch: pytest.MonkeyPatch, fresh_cache
) -> None:
    import app.modes.customers.discovery as discovery_module
    import app.modes.customers.research as research_module

    stage = _Stage()
    _patch_stages(monkeypatch, stage)

    async def partial_discover(plan):
        await asyncio.sleep(0)
        return DiscoveryResult(
            places=list(stage.places), maps_partial=True,
            queries_run=3, queries_failed=1,
        )

    async def partial_research(leads, plan, **kwargs):
        await asyncio.sleep(0)
        result = await stage.research_leads(leads, plan, **kwargs)
        result.leads[0] = result.leads[0].model_copy(update={"research": "partial"})
        return result

    monkeypatch.setattr(discovery_module, "discover", partial_discover)
    monkeypatch.setattr(research_module, "research_leads", partial_research)
    payload = await pipeline_module.run_leads(_input())
    assert "maps" in payload["meta"]["partial"]
    assert "reviews" in payload["meta"]["partial"]


async def test_ai_text_fallback_noted(monkeypatch: pytest.MonkeyPatch, fresh_cache) -> None:
    import app.modes.customers.ranker as ranker_module

    stage = _Stage()
    _patch_stages(monkeypatch, stage)

    async def fallback_text(items, *, city, default_pitch, pains=()):
        await asyncio.sleep(0)
        return await stage.explain_leads(items, city=city, default_pitch=default_pitch, pains=pains)

    async def flagged(items, *, city, default_pitch, pains=()):
        texts, _ = await fallback_text(items, city=city, default_pitch=default_pitch, pains=pains)
        return texts, True

    monkeypatch.setattr(ranker_module, "explain_leads", flagged)
    payload = await pipeline_module.run_leads(_input())
    assert "ai_text_fallback" in payload["meta"]["notes"]


async def test_empty_discovery_returns_200_with_note(
    monkeypatch: pytest.MonkeyPatch, fresh_cache
) -> None:
    stage = _Stage(places=[])
    _patch_stages(monkeypatch, stage)
    payload = await pipeline_module.run_leads(_input())
    assert payload["leads"] == []
    assert "no_matching_businesses" in payload["meta"]["notes"]
    LeadsResponse.model_validate(payload)


async def test_unexpected_stage_error_becomes_502(
    monkeypatch: pytest.MonkeyPatch, fresh_cache
) -> None:
    import app.modes.customers.discovery as discovery_module

    stage = _Stage()
    _patch_stages(monkeypatch, stage)

    async def boom(plan):
        raise ValueError("bug")

    monkeypatch.setattr(discovery_module, "discover", boom)
    with pytest.raises(AllSourcesFailed):
        await pipeline_module.run_leads(_input())


# --- deadline --------------------------------------------------------------------

async def test_deadline_partial_result(monkeypatch: pytest.MonkeyPatch, fresh_cache) -> None:
    stage = _Stage(research_delay=5.0)
    _patch_stages(monkeypatch, stage)
    monkeypatch.setattr(pipeline_module, "_deadline_seconds", lambda: 0.05)
    payload = await pipeline_module.run_leads(_input())
    assert len(payload["leads"]) >= 1
    assert "deadline_reached" in payload["meta"]["notes"]
    assert "reviews" in payload["meta"]["partial"]
    LeadsResponse.model_validate(payload)


async def test_deadline_with_zero_leads_raises_502(
    monkeypatch: pytest.MonkeyPatch, fresh_cache
) -> None:
    stage = _Stage()
    _patch_stages(monkeypatch, stage)
    monkeypatch.setattr(pipeline_module, "_deadline_seconds", lambda: 0.0)
    with pytest.raises(AllSourcesFailed):
        await pipeline_module.run_leads(_input())


async def test_deadline_setting_zero_forces_expiry(
    monkeypatch: pytest.MonkeyPatch, fresh_cache
) -> None:
    stage = _Stage()
    _patch_stages(monkeypatch, stage)
    monkeypatch.setenv("LEADS_REQUEST_DEADLINE_SECONDS", "0")
    from app.config import get_settings

    get_settings.cache_clear()
    try:
        with pytest.raises(AllSourcesFailed):
            await pipeline_module.run_leads(_input())
    finally:
        get_settings.cache_clear()


# --- stampede / normalisation / response cache ------------------------------------

async def test_concurrent_identical_requests_share_one_run(
    monkeypatch: pytest.MonkeyPatch, fresh_cache
) -> None:
    import app.modes.customers.discovery as discovery_module

    runs = 0

    async def slow_discover(plan):
        nonlocal runs
        runs += 1
        await asyncio.sleep(0.05)
        return DiscoveryResult(
            places=_places(3), maps_partial=False, queries_run=3, queries_failed=0
        )

    stage = _Stage()
    _patch_stages(monkeypatch, stage)
    monkeypatch.setattr(discovery_module, "discover", slow_discover)
    monkeypatch.setenv("LEADS_CACHE_HOURS", "0")
    from app.config import get_settings

    get_settings.cache_clear()
    try:
        results = await asyncio.gather(
            *[pipeline_module.run_leads(_input()) for _ in range(10)]
        )
    finally:
        get_settings.cache_clear()
    assert runs == 1
    assert all(result == results[0] for result in results)


def test_normalisation_collapses_case_space_punctuation() -> None:
    key = pipeline_module.normalise_request_key
    base = key("Restaurant software", "Ahmedabad", 800, 10)
    assert base == key("restaurant  software.", "ahmedabad", 800, 10)
    assert base == key("  RESTAURANT SOFTWARE  ", "Ahmedabad!", 800, 10)
    assert base != key("Restaurant software", "Pune", 800, 10)
    assert base != key("Restaurant software", "Ahmedabad", 900, 10)
    assert len(base) == 64


async def test_cached_repeat_costs_zero_credits(
    monkeypatch: pytest.MonkeyPatch, fresh_cache
) -> None:
    stage = _Stage()
    _patch_stages(monkeypatch, stage)
    monkeypatch.setenv("LEADS_CACHE_HOURS", "6")
    from app.config import get_settings

    get_settings.cache_clear()
    try:
        first = await pipeline_module.run_leads(_input())
        calls_after_first = list(stage.calls)
        assert calls_after_first
        second = await pipeline_module.run_leads(_input())
    finally:
        get_settings.cache_clear()
    assert stage.calls == calls_after_first  # no stage re-ran
    assert second["meta"]["credits_used"] == 0
    assert "response_cache_hit" in second["meta"]["notes"]
    assert second["leads"] == first["leads"]


# --- budgets -----------------------------------------------------------------------

async def test_day_sub_budget_blocks_live_but_serves_cache(
    monkeypatch: pytest.MonkeyPatch, fresh_cache
) -> None:
    import respx
    import httpx

    from app.config import get_settings

    monkeypatch.setenv("LEADS_CACHE_HOURS", "0")
    monkeypatch.setenv("MAX_LEAD_SERP_CALLS_PER_DAY", "50")
    get_settings.cache_clear()

    import app.services.llm as llm_module

    async def fake_json(system, user, max_tokens, *, temperature=0.2, label="llm"):
        if label == "lead_planner":
            return {
                "product_summary": "Restaurant management system",
                "target_customer": "Mid-level restaurants",
                "buyer_roles": ["owner"],
                "maps_queries": [
                    "restaurants in Ahmedabad",
                    "family restaurants in Ahmedabad",
                    "cafes in Ahmedabad",
                ],
                "pain_keywords": ["billing errors", "staff shifts", "order delays", "food waste"],
                "competitor_query": "restaurant billing software India",
                "pitch_angle": "Cut billing errors",
            }
        return {
            "leads": [
                {
                    "id": "lead_0",
                    "why_fit": "Rated 4.2 from 320 reviews.",
                    "pitch_angle": "Cut billing errors.",
                    "suggested_first_question": "How do you bill today?",
                }
            ]
        }

    monkeypatch.setattr(llm_module, "ask_json", fake_json)

    def handler(request: httpx.Request) -> httpx.Response:
        engine = request.url.params.get("engine")
        if engine == "google_maps":
            query = request.url.params.get("q", "")
            return httpx.Response(
                200,
                json={
                    "local_results": [
                        {
                            "title": f"Live {query}",
                            "address": "MG Road Ahmedabad",
                            "rating": 4.2,
                            "reviews": 320,
                            "phone": "+91 98220 12345",
                            "place_id": "live1",
                            "type": "Restaurant",
                        }
                    ]
                },
            )
        if engine == "google_maps_reviews":
            return httpx.Response(
                200, json={"reviews": [{"snippet": "The bill was wrong"}]}
            )
        if engine == "google":
            return httpx.Response(
                200,
                json={"organic_results": [{"title": "V", "snippet": "Billing software"}]},
            )
        raise AssertionError(engine)

    try:
        with respx.mock(assert_all_called=False) as router:
            router.get("https://serpapi.com/search.json").mock(side_effect=handler)
            first = await pipeline_module.run_leads(_input())
            assert first["leads"]
            spent = used_today("serp_leads")
            assert spent == first["meta"]["credits_used"] > 0
            # Exhaust the day sub-budget, then re-run: cache serves, live blocked.
            for _ in range(60):
                try_consume("serp_leads", 50)
            assert used_today("serp_leads") >= 50
            second = await pipeline_module.run_leads(_input())
            assert second["leads"]
            assert second["meta"]["credits_used"] == 0
            assert "day_budget_exhausted" in second["meta"]["notes"]
            hosts = {call.request.url.host for call in router.calls}
            assert hosts == {"serpapi.com"}
    finally:
        get_settings.cache_clear()


async def test_day_sub_budget_exhausted_cold_cache_raises_429(
    monkeypatch: pytest.MonkeyPatch, fresh_cache
) -> None:
    import app.services.llm as llm_module
    from app.config import get_settings

    async def fake_plan_json(system, user, max_tokens, *, temperature=0.2, label="llm"):
        return {
            "product_summary": "Restaurant management system",
            "target_customer": "Mid-level restaurants",
            "buyer_roles": ["owner"],
            "maps_queries": [
                "restaurants in Ahmedabad",
                "family restaurants in Ahmedabad",
                "cafes in Ahmedabad",
            ],
            "pain_keywords": ["billing errors", "staff shifts", "order delays", "food waste"],
            "competitor_query": "restaurant billing software India",
            "pitch_angle": "Cut billing errors",
        }

    monkeypatch.setattr(llm_module, "ask_json", fake_plan_json)
    monkeypatch.setenv("LEADS_CACHE_HOURS", "0")
    monkeypatch.setenv("MAX_LEAD_SERP_CALLS_PER_DAY", "1")
    get_settings.cache_clear()
    try_consume("serp_leads", 1)
    try:
        with pytest.raises(BudgetExhausted) as exc_info:
            await pipeline_module.run_leads(_input())
        assert exc_info.value.status == 429
        assert exc_info.value.code == "budget_exhausted"
    finally:
        get_settings.cache_clear()
