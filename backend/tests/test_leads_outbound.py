"""Outbound-host test: the leads pipeline only talks to SerpAPI (+ LLM URL).

Real SerpAPI client with respx mocking ONLY serpapi.com; the LLM seam is
faked (no network). Any httpx request to another host fails the test, so a
regression that fetches lead websites (or any third-party URL) is caught.
"""

import httpx
import pytest
import respx

import app.services.serp as serp_module
import app.modes.customers.pipeline as pipeline_module
from app.config import get_settings
from app.modes.customers.schemas import LeadsResponse, OfferInput

ALLOWED_HOSTS = {"serpapi.com", "api.anthropic.com"}

OFFER = (
    "i have made a restaurant management system with billing for mid level "
    "restaurants in the city outboundville test kitchens"
)


@pytest.fixture
async def fresh_cache(tmp_cache_path):
    await serp_module.close_serp()
    serp_module.init_cache(tmp_cache_path)
    pipeline_module.reset_leads_state()
    yield tmp_cache_path
    pipeline_module.reset_leads_state()
    await serp_module.close_serp()


async def test_leads_pipeline_contacts_only_allowed_hosts(
    monkeypatch: pytest.MonkeyPatch, fresh_cache
) -> None:
    import app.services.llm as llm_module

    async def fake_json(system, user, max_tokens, *, temperature=0.2, label="llm"):
        if label == "lead_planner":
            return {
                "product_summary": "Restaurant management system",
                "target_customer": "Mid-level restaurants",
                "buyer_roles": ["owner"],
                "maps_queries": [
                    "restaurants in Outboundville",
                    "family restaurants in Outboundville",
                    "cafes in Outboundville",
                ],
                "pain_keywords": ["billing errors", "staff shifts", "order delays", "food waste"],
                "competitor_query": "restaurant billing software",
                "pitch_angle": "Cut billing errors",
            }
        if label == "lead_text":
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
        return {"market_notes": ["Several vendors sell billing software"]}

    monkeypatch.setattr(llm_module, "ask_json", fake_json)
    monkeypatch.setenv("LEADS_CACHE_HOURS", "0")
    get_settings.cache_clear()
    try:

        def handler(request: httpx.Request) -> httpx.Response:
            engine = request.url.params.get("engine")
            if engine == "google_maps":
                return httpx.Response(
                    200,
                    json={
                        "local_results": [
                            {
                                "title": "Outbound Diner",
                                "address": "MG Road",
                                "rating": 4.2,
                                "reviews": 320,
                                "phone": "+91 98220 12345",
                                "website": "https://diner.example.com",
                                "place_id": "out1",
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
                    json={"organic_results": [{"title": "V", "snippet": "Billing SW"}]},
                )
            raise AssertionError(engine)

        with respx.mock(assert_all_called=False) as router:
            router.get("https://serpapi.com/search.json").mock(side_effect=handler)
            payload = await pipeline_module.run_leads(
                OfferInput.model_validate({"offer": OFFER, "city": "Outboundville"})
            )
            LeadsResponse.model_validate(payload)
            assert payload["leads"]
            hosts = {call.request.url.host for call in router.calls}
            assert hosts <= ALLOWED_HOSTS, hosts
            assert hosts == {"serpapi.com"}
    finally:
        get_settings.cache_clear()
