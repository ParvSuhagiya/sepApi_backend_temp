"""Endpoint tests for POST /api/leads and lead-mode POST /api/outreach."""

import logging

import pytest
from fastapi.testclient import TestClient

import app.main as main_module
from app.config import get_settings
from app.errors import AllSourcesFailed, BudgetExhausted
from app.modes.customers.outreach import OPT_OUT_LINE

REVIEWER_NAME = "Rahul Sharma"

OFFER_A = (
    "i have made a restaurant management system with billing and staff roles "
    "for mid level restaurants in the city alphaville test kitchens"
)
OFFER_B = (
    "i have made a restaurant management system with order tracking for "
    "family restaurants in the city betaville test kitchens"
)


def _offer(city_token: str) -> str:
    return (
        "i have made a restaurant management system with billing for mid "
        f"level restaurants in the city {city_token} test kitchens"
    )


def _plan_payload() -> dict:
    return {
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


class _FakeLLM:
    def __init__(self):
        self.calls: list = []

    async def ask_json(self, system, user, max_tokens, *, temperature=0.2, label="llm"):
        self.calls.append(label)
        if label == "lead_planner":
            return _plan_payload()
        if label == "lead_text":
            return {
                "leads": [
                    {
                        "id": f"lead_{i}",
                        "why_fit": "Rated 4.2 from 320 reviews; 2 reviews mention slow billing.",
                        "pitch_angle": "Cut billing errors and save staff time.",
                        "suggested_first_question": "How do you handle billing errors today?",
                    }
                    for i in range(8)
                ]
            }
        return {"market_notes": ["Several vendors sell billing software"]}

    async def ask_text(self, system, user, max_tokens, *, temperature=0.3, label="llm"):
        return "I offer billing software for restaurants. I can set it up in a day."


async def _fake_serp(engine: str, **params):
    if engine == "google_maps":
        query = params.get("q", "")
        return {
            "local_results": [
                {
                    "title": f"Diner {query[:10]}",
                    "address": "MG Road Ahmedabad",
                    "rating": 4.2,
                    "reviews": 320,
                    "phone": "+91 98220 12345",
                    "place_id": f"pid-{query[:6]}",
                    "type": "Restaurant",
                }
            ]
        }
    if engine == "google_maps_reviews":
        return {
            "reviews": [
                {
                    "user": {"name": REVIEWER_NAME, "link": "https://x", "thumbnail": "https://y"},
                    "snippet": "The bill was wrong and we waited a long time",
                }
            ]
        }
    if engine == "google":
        return {"organic_results": [{"title": "V", "snippet": "Billing software"}]}
    raise AssertionError(engine)


@pytest.fixture
def live_leads(monkeypatch: pytest.MonkeyPatch):
    """Real leads pipeline with fake LLM + fake SerpAPI (no network)."""
    import app.services.llm as llm_module
    import app.services.serp as serp_module
    import app.modes.customers.pipeline as pipeline_module

    fake = _FakeLLM()
    monkeypatch.setattr(llm_module, "ask_json", fake.ask_json)
    monkeypatch.setattr(llm_module, "ask_text", fake.ask_text)
    monkeypatch.setattr(serp_module, "serp", _fake_serp)
    monkeypatch.setenv("LEADS_CACHE_HOURS", "0")
    get_settings.cache_clear()
    main_module.reset_rate_limiters()
    pipeline_module.reset_leads_state()
    yield fake
    pipeline_module.reset_leads_state()
    main_module.reset_rate_limiters()
    get_settings.cache_clear()


def _post(client: TestClient, body: dict, **kwargs):
    return client.post("/api/leads", json=body, **kwargs)


# --- happy path ------------------------------------------------------------------

def test_leads_happy_path_shape(live_leads, caplog) -> None:
    body = {"offer": _offer("alphaville"), "city": "Ahmedabad", "max_leads": 5}
    with caplog.at_level(logging.INFO):
        with TestClient(main_module.app) as client:
            response = _post(
                client, body, headers={"Origin": "http://localhost:5173"}
            )
    assert response.status_code == 200, response.text
    payload = response.json()
    assert set(payload) == {
        "schema_version", "offer_summary", "leads",
        "market_notes", "meta", "disclaimer",
    }
    assert payload["schema_version"] == "1.0"
    assert payload["disclaimer"] == (
        "Lead scores are signals from public data, not guarantees. "
        "Verify details before contacting."
    )
    assert payload["leads"]
    assert set(payload["leads"][0]) == {
        "name", "address", "rating", "user_ratings_total", "business_type",
        "match_score", "match_reasons", "research_notes",
        "why_fit", "pitch_angle", "suggested_first_question",
        "phone", "maps_url", "price_level", "score_breakdown",
        "likely_has_software", "adjustments",
    }
    assert set(payload["meta"]) == {
        "credits_used", "cache_hits", "degraded", "partial", "notes", "timings_ms",
    }
    assert response.headers.get("X-Request-ID")
    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"
    # No reviewer personal data, no secrets, no raw upstream text anywhere.
    text = response.text
    assert REVIEWER_NAME not in text
    assert "test-serpapi-key" not in text
    assert "test-anthropic-key" not in text
    assert "Traceback" not in text
    assert "alphaville test kitchens" not in caplog.text


# --- validation --------------------------------------------------------------------

@pytest.mark.parametrize(
    "body",
    [
        {"offer": "too short", "city": "Ahmedabad"},
        {"offer": "!!!@@@###$$$%%%^^^&&&***+++", "city": "Ahmedabad"},
        {"offer": _offer("gamma"), "city": "X"},
        {"offer": _offer("gamma"), "city": "Ahmedabad", "max_leads": 4},
        {"offer": _offer("gamma"), "city": "Ahmedabad", "max_leads": 21},
        {"offer": _offer("gamma"), "city": "Ahmedabad", "monthly_price": -1},
        {"offer": _offer("gamma"), "city": "Ahmedabad", "skills": "x"},
        {"city": "Ahmedabad"},
    ],
)
def test_leads_422_shapes(live_leads, body: dict) -> None:
    with TestClient(main_module.app) as client:
        response = _post(
            client, body, headers={"Origin": "http://localhost:5173"}
        )
    assert response.status_code == 422, response.text
    error = response.json()["error"]
    assert error["code"] == "invalid_input"
    assert error["message"] and error["request_id"]
    assert response.headers.get("X-Request-ID")
    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"


# --- auth / rate limit / flag / size -------------------------------------------------

def test_leads_401_and_200_with_code(live_leads, monkeypatch) -> None:
    monkeypatch.setenv("ACCESS_CODE", "topsecret")
    get_settings.cache_clear()
    try:
        with TestClient(main_module.app) as client:
            denied = _post(client, {"offer": _offer("delta"), "city": "Ahmedabad"})
            assert denied.status_code == 401
            assert denied.json()["error"]["code"] == "unauthorized"
            allowed = _post(
                client,
                {"offer": _offer("delta"), "city": "Ahmedabad"},
                headers={"X-Access-Code": "topsecret"},
            )
            assert allowed.status_code == 200
    finally:
        get_settings.cache_clear()


def test_leads_429_with_retry_after(live_leads, monkeypatch) -> None:
    monkeypatch.setenv("RATE_LIMIT_LEADS_PER_HOUR", "1")
    get_settings.cache_clear()
    try:
        with TestClient(main_module.app) as client:
            first = _post(client, {"offer": _offer("epsilon"), "city": "Ahmedabad"})
            assert first.status_code == 200
            second = _post(client, {"offer": _offer("epsilon"), "city": "Ahmedabad"})
            assert second.status_code == 429
            assert second.json()["error"]["code"] == "rate_limited"
            assert second.headers.get("Retry-After")
    finally:
        get_settings.cache_clear()


def test_leads_feature_disabled_404(live_leads, monkeypatch) -> None:
    monkeypatch.setenv("ENABLE_CUSTOMER_MODE", "false")
    get_settings.cache_clear()
    try:
        with TestClient(main_module.app) as client:
            response = _post(client, {"offer": _offer("zeta"), "city": "Ahmedabad"})
        assert response.status_code == 404
        error = response.json()["error"]
        assert error["code"] == "feature_disabled"
        assert error["request_id"]
        assert response.headers.get("X-Request-ID")
    finally:
        get_settings.cache_clear()


def test_leads_413_for_chunked_oversize_body(live_leads) -> None:
    def chunks():
        for _ in range(30):
            yield b"x" * 1024

    with TestClient(main_module.app) as client:
        response = client.post(
            "/api/leads",
            content=chunks(),
            headers={"Content-Type": "application/json"},
        )
    assert response.status_code == 413
    assert response.json()["error"]["code"] == "invalid_input"


def test_leads_502_when_maps_fails_entirely(live_leads, monkeypatch) -> None:
    import app.modes.customers.pipeline as pipeline_module

    async def boom(body, request_id=None):
        raise AllSourcesFailed()

    monkeypatch.setattr(pipeline_module, "run_leads", boom)
    with TestClient(main_module.app) as client:
        response = _post(client, {"offer": _offer("eta"), "city": "Ahmedabad"})
    assert response.status_code == 502
    assert response.json()["error"]["code"] == "upstream_failure"


def test_leads_429_when_budget_exhausted(live_leads, monkeypatch) -> None:
    import app.modes.customers.pipeline as pipeline_module
    from app.budget import seconds_until_rollover

    async def broke(body, request_id=None):
        raise BudgetExhausted("nope", retry_after=seconds_until_rollover())

    monkeypatch.setattr(pipeline_module, "run_leads", broke)
    with TestClient(main_module.app) as client:
        response = _post(client, {"offer": _offer("theta"), "city": "Ahmedabad"})
    assert response.status_code == 429
    assert response.json()["error"]["code"] == "budget_exhausted"
    assert response.headers.get("Retry-After")


# --- lead-mode outreach ---------------------------------------------------------------

def test_outreach_lead_happy_path(live_leads) -> None:
    with TestClient(main_module.app) as client:
        response = client.post(
            "/api/outreach",
            json={
                "profile": {"skills": "billing software", "city": "Ahmedabad"},
                "target": {
                    "name": "Sharma Restaurant",
                    "type": "Restaurant",
                    "product_summary": "Restaurant billing software",
                },
            },
        )
    assert response.status_code == 200, response.text
    body = response.json()
    assert len(body["message"].split()) <= 70
    assert OPT_OUT_LINE in body["message"]
    assert body["safety_note"] == "Verify the business before paying or sharing documents."


@pytest.mark.parametrize(
    "product",
    ["", "   ", "x" * 201],
)
def test_outreach_lead_rejects_bad_product_summary(live_leads, product: str) -> None:
    with TestClient(main_module.app) as client:
        response = client.post(
            "/api/outreach",
            json={
                "profile": {"skills": "billing software", "city": "Ahmedabad"},
                "target": {"name": "Sharma Restaurant", "product_summary": product},
            },
        )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "invalid_input"
