"""API-level tests: happy paths, error envelope shapes, limits, CORS, headers."""

import importlib
import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

import app.main as main_module
from app.config import get_settings

PROFILE = {"skills": "tailoring, stitching", "city": "Pune", "hours": 10, "budget": 0}
AI_DIR = Path(__file__).resolve().parent / "fixtures" / "ai"


def _good_opportunities() -> dict:
    return json.loads((AI_DIR / "good_opportunities.json").read_text(encoding="utf-8"))


def _planner_payload() -> dict:
    return {
        "job_queries": ["tailoring jobs", "stitching work from home"],
        "local_queries": ["tailoring services in Pune", "boutiques hiring tailor in Pune"],
        "trend_keywords": ["tailoring", "stitching freelance"],
        "forum_query": "tailoring earnings in India",
    }


def _serp_payload(engine: str) -> dict:
    if engine == "google_jobs":
        return {
            "jobs_results": [
                {
                    "title": "Tailor needed",
                    "company_name": "ABC",
                    "location": "Pune",
                    "description": "Stitching and alteration work in Pune",
                }
            ]
        }
    if engine == "google_maps":
        return {
            "local_results": [
                {
                    "title": "Sharma Tailoring",
                    "rating": 4.5,
                    "address": "MG Road Pune",
                    "phone": "+91 98220 12345",
                    "type": "Tailor",
                }
            ]
        }
    if engine == "google_trends":
        return {
            "interest_over_time": {
                "timeline_data": [
                    {"date": f"2026-08-{i:02d}", "values": [{"extracted_value": 20 + i}]}
                    for i in range(1, 13)
                ]
            }
        }
    return {
        "organic_results": [
            {
                "title": "Tailoring earnings Pune",
                "link": "https://forum.test/t/1",
                "snippet": "Tailors in Pune earn steady rates",
            }
        ]
    }


class _FakeLLM:
    def __init__(self):
        self.calls = 0

    async def ask_json(self, system, user, max_tokens, *, temperature=0.2, label="llm"):
        self.calls += 1
        if label == "planner":
            return _planner_payload()
        return _good_opportunities()

    async def ask_text(self, system, user, max_tokens, *, temperature=0.3, label="llm"):
        return "Hello, I saw your shop in Pune and I do tailoring work."


@pytest.fixture
def live_api(monkeypatch: pytest.MonkeyPatch):
    """Full stack with fake LLM + fake SerpAPI (no network)."""
    import app.services.llm as llm_module
    import app.services.pipeline as pipeline_module

    fake = _FakeLLM()
    monkeypatch.setattr(llm_module, "ask_json", fake.ask_json)
    monkeypatch.setattr(llm_module, "ask_text", fake.ask_text)

    async def fake_serp(engine: str, **params):
        return _serp_payload(engine)

    monkeypatch.setattr(pipeline_module, "serp", fake_serp)
    main_module.reset_rate_limiters()
    yield fake
    main_module.reset_rate_limiters()


def test_search_happy_path_shape(live_api):
    with TestClient(main_module.app) as client:
        response = client.post("/api/search", json=PROFILE)
    assert response.status_code == 200, response.text
    body = response.json()
    assert len(body["opportunities"]) == 5
    assert body["jobs"] and body["local"] and body["trend"] and body["forum"]
    assert body["trend_keyword"] == "tailoring"
    assert set(body["stats"]) == {"credits_used", "cache_hits"}
    assert set(body["meta"]) >= {"request_id", "duration_ms", "degraded"}
    assert response.headers.get("X-Request-ID") == body["meta"]["request_id"]
    for opp in body["opportunities"]:
        assert len(opp["plan_7_days"]) == 7
        assert 2 <= len(opp["evidence"]) <= 3
        assert "estimate" in opp["income_estimate"].lower()


def test_outreach_happy_path_shape(live_api):
    with TestClient(main_module.app) as client:
        response = client.post(
            "/api/outreach",
            json={
                "profile": PROFILE,
                "target": {"name": "Sharma Tailoring", "type": "Tailor"},
            },
        )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["message"]
    assert body["safety_note"] == "Verify the business before paying or sharing documents."
    assert response.headers.get("X-Request-ID")


def test_422_error_envelope_shape(live_api):
    with TestClient(main_module.app) as client:
        response = client.post("/api/search", json={"skills": "x"})
    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "invalid_input"
    assert error["message"]
    assert error["request_id"]
    assert response.headers.get("X-Request-ID")


def test_401_without_code_and_200_with_code(live_api, monkeypatch):
    monkeypatch.setenv("ACCESS_CODE", "topsecret")
    get_settings.cache_clear()
    try:
        with TestClient(main_module.app) as client:
            denied = client.post("/api/search", json=PROFILE)
            assert denied.status_code == 401
            assert denied.json()["error"]["code"] == "unauthorized"

            wrong = client.post(
                "/api/search", json=PROFILE, headers={"X-Access-Code": "nope"}
            )
            assert wrong.status_code == 401

            allowed = client.post(
                "/api/search", json=PROFILE, headers={"X-Access-Code": "topsecret"}
            )
            assert allowed.status_code == 200
    finally:
        get_settings.cache_clear()


def test_429_with_retry_after(live_api, monkeypatch):
    monkeypatch.setenv("RATE_LIMIT_SEARCH_PER_HOUR", "1")
    get_settings.cache_clear()
    try:
        with TestClient(main_module.app) as client:
            first = client.post("/api/search", json=PROFILE)
            assert first.status_code == 200
            second = client.post("/api/search", json=PROFILE)
            assert second.status_code == 429
            assert second.json()["error"]["code"] == "rate_limited"
            assert second.headers.get("Retry-After")
    finally:
        get_settings.cache_clear()


def test_413_for_oversize_body(live_api):
    with TestClient(main_module.app) as client:
        response = client.post(
            "/api/search",
            content=b'{"skills":"' + b"x" * (30 * 1024) + b'"}',
            headers={"Content-Type": "application/json"},
        )
    assert response.status_code == 413
    assert response.json()["error"]["code"] == "invalid_input"


def test_cors_allow_and_deny(live_api):
    with TestClient(main_module.app) as client:
        allowed = client.post(
            "/api/search", json=PROFILE, headers={"Origin": "http://localhost:5173"}
        )
        assert allowed.headers.get("access-control-allow-origin") == "http://localhost:5173"

        denied = client.post(
            "/api/search", json=PROFILE, headers={"Origin": "https://evil.example"}
        )
        assert "access-control-allow-origin" not in denied.headers


def test_cors_preflight(live_api):
    with TestClient(main_module.app) as client:
        response = client.options(
            "/api/search",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "POST",
            },
        )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"


def test_cors_trailing_slash_config(monkeypatch):
    monkeypatch.setenv("ALLOWED_ORIGINS", "https://shop.example/")
    get_settings.cache_clear()
    reloaded = importlib.reload(main_module)
    try:
        with TestClient(reloaded.app) as client:
            response = client.post(
                "/api/search", json=PROFILE, headers={"Origin": "https://shop.example"}
            )
        assert response.headers.get("access-control-allow-origin") == "https://shop.example"
    finally:
        monkeypatch.delenv("ALLOWED_ORIGINS", raising=False)
        get_settings.cache_clear()
        importlib.reload(main_module)


def test_500_carries_cors_headers_and_envelope(live_api, monkeypatch):
    import app.services.pipeline as pipeline_module

    async def boom(profile, request_id=None):
        raise RuntimeError("forced")

    monkeypatch.setattr(pipeline_module, "run_search", boom)
    with TestClient(main_module.app, raise_server_exceptions=False) as client:
        response = client.post(
            "/api/search", json=PROFILE, headers={"Origin": "http://localhost:5173"}
        )
    assert response.status_code == 500
    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"
    assert response.json()["error"]["code"] == "internal"
    assert response.headers.get("X-Request-ID")
