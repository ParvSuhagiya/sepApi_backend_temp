"""Golden snapshot: /api/search and /api/outreach response shapes (keys + types).

Byte-compatibility guard for Mode 1 ("income"). If this test fails after a
change, the existing income-mode response shape regressed — fix the change,
not this test.
"""

import json
from pathlib import Path

from fastapi.testclient import TestClient

import app.main as main_module

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
    async def ask_json(self, system, user, max_tokens, *, temperature=0.2, label="llm"):
        if label == "planner":
            return _planner_payload()
        return _good_opportunities()

    async def ask_text(self, system, user, max_tokens, *, temperature=0.3, label="llm"):
        return "Hello, I saw your shop in Pune and I do tailoring work."


def _client(monkeypatch) -> TestClient:
    import app.services.llm as llm_module
    import app.services.pipeline as pipeline_module

    fake = _FakeLLM()
    monkeypatch.setattr(llm_module, "ask_json", fake.ask_json)
    monkeypatch.setattr(llm_module, "ask_text", fake.ask_text)

    async def fake_serp(engine: str, **params):
        return _serp_payload(engine)

    monkeypatch.setattr(pipeline_module, "serp", fake_serp)
    main_module.reset_rate_limiters()
    return TestClient(main_module.app)


def _assert_type(value, expected: tuple, path: str) -> None:
    assert isinstance(value, expected), f"{path}: expected {expected}, got {type(value)}"


def test_search_response_shape_snapshot(monkeypatch) -> None:
    """Top-level and nested keys + value types of /api/search must not change."""
    client = _client(monkeypatch)
    with client:
        response = client.post("/api/search", json=PROFILE)
    assert response.status_code == 200, response.text
    body = response.json()

    assert set(body.keys()) == {
        "opportunities",
        "jobs",
        "local",
        "trend",
        "trend_keyword",
        "trend_growth",
        "forum",
        "stats",
        "meta",
    }, sorted(body.keys())
    _assert_type(body["opportunities"], (list,), "opportunities")
    _assert_type(body["jobs"], (list,), "jobs")
    _assert_type(body["local"], (list,), "local")
    _assert_type(body["trend"], (list,), "trend")
    assert body["trend_keyword"] is None or isinstance(body["trend_keyword"], str)
    _assert_type(body["trend_growth"], (dict,), "trend_growth")
    _assert_type(body["forum"], (list,), "forum")
    _assert_type(body["stats"], (dict,), "stats")
    _assert_type(body["meta"], (dict,), "meta")

    assert set(body["stats"].keys()) == {"credits_used", "cache_hits"}
    _assert_type(body["stats"]["credits_used"], (int,), "stats.credits_used")
    _assert_type(body["stats"]["cache_hits"], (int,), "stats.cache_hits")

    assert set(body["meta"].keys()) == {
        "request_id",
        "duration_ms",
        "degraded",
        "partial",
        "notes",
        "city_center",
    }, sorted(body["meta"].keys())
    _assert_type(body["meta"]["request_id"], (str,), "meta.request_id")
    _assert_type(body["meta"]["duration_ms"], (int,), "meta.duration_ms")
    _assert_type(body["meta"]["degraded"], (list,), "meta.degraded")
    _assert_type(body["meta"]["partial"], (list,), "meta.partial")
    _assert_type(body["meta"]["notes"], (list,), "meta.notes")
    if body["meta"]["city_center"] is not None:
        _assert_type(body["meta"]["city_center"], (dict,), "meta.city_center")
        assert set(body["meta"]["city_center"].keys()) == {"lat", "lng"}
        _assert_type(body["meta"]["city_center"]["lat"], (float, int), "meta.city_center.lat")
        _assert_type(body["meta"]["city_center"]["lng"], (float, int), "meta.city_center.lng")

    assert body["opportunities"], "expected at least one opportunity"
    for opp in body["opportunities"]:
        assert set(opp.keys()) == {
            "title",
            "type",
            "why",
            "income_estimate",
            "demand",
            "competition",
            "fit",
            "cost_ease",
            "trust",
            "evidence",
            "plan_7_days",
            "earn_score",
            "score_breakdown",
            "adjustments",
        }, sorted(opp.keys())
        _assert_type(opp["title"], (str,), "opportunity.title")
        _assert_type(opp["demand"], (int,), "opportunity.demand")
        _assert_type(opp["evidence"], (list,), "opportunity.evidence")
        _assert_type(opp["plan_7_days"], (list,), "opportunity.plan_7_days")
        _assert_type(opp["earn_score"], (int,), "opportunity.earn_score")
        _assert_type(opp["score_breakdown"], (dict,), "opportunity.score_breakdown")
        _assert_type(opp["adjustments"], (list,), "opportunity.adjustments")

    assert body["jobs"], "expected at least one job"
    for job in body["jobs"]:
        assert set(job.keys()) == {
            "title",
            "company",
            "location",
            "via",
            "salary",
            "desc",
            "link",
            "flags",
            "risk",
            "lat",
            "lng",
            "geo_precision",
        }, sorted(job.keys())

    assert body["local"], "expected at least one place"
    for place in body["local"]:
        assert set(place.keys()) == {
            "name",
            "rating",
            "reviews",
            "phone",
            "address",
            "type",
            "lat",
            "lng",
        }, sorted(place.keys())

    for point in body["trend"]:
        assert set(point.keys()) == {"date", "value"}, sorted(point.keys())
        _assert_type(point["date"], (str,), "trend.date")
        _assert_type(point["value"], (int,), "trend.value")

    for item in body["forum"]:
        assert set(item.keys()) == {"title", "link", "snippet"}, sorted(item.keys())


def test_outreach_response_shape_snapshot(monkeypatch) -> None:
    """Top-level keys of /api/outreach must not change."""
    client = _client(monkeypatch)
    with client:
        response = client.post(
            "/api/outreach",
            json={
                "profile": PROFILE,
                "target": {"name": "Sharma Tailoring", "type": "Tailor"},
            },
        )
    assert response.status_code == 200, response.text
    body = response.json()
    assert set(body.keys()) == {"message", "safety_note"}, sorted(body.keys())
    _assert_type(body["message"], (str,), "message")
    _assert_type(body["safety_note"], (str,), "safety_note")
