"""Tests for the health route: minimal public payload, gated detail payload."""

import pytest
from fastapi.testclient import TestClient

from app.main import app


def test_public_health_is_minimal() -> None:
    with TestClient(app) as client:
        response = client.get("/api/health")

    assert response.status_code == 200
    payload = response.json()
    assert payload == {"ok": True, "version": "1.0.0"}


def test_detail_health_open_without_code_outside_production() -> None:
    with TestClient(app) as client:
        response = client.get("/api/health?detail=1")

    assert response.status_code == 200
    payload = response.json()
    assert payload["ok"] is True
    assert payload["version"] == "1.0.0"
    assert isinstance(payload["cache"]["entries"], int)
    assert isinstance(payload["cache_entries"], int)
    assert isinstance(payload["lifetime"]["credits_used"], int)
    assert isinstance(payload["lifetime"]["cache_hits"], int)
    assert isinstance(payload["ai"]["input_tokens"], int)
    assert isinstance(payload["ai"]["output_tokens"], int)
    assert "serp" in payload["budget_remaining"]
    assert "llm" in payload["budget_remaining"]


def test_detail_health_requires_code_when_configured(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("ACCESS_CODE", "secret-code")
    with TestClient(app) as client:
        denied = client.get("/api/health?detail=1")
        assert denied.status_code == 401
        assert denied.json()["error"]["code"] == "unauthorized"

        allowed = client.get(
            "/api/health?detail=1", headers={"X-Access-Code": "secret-code"}
        )
        assert allowed.status_code == 200
        assert allowed.json()["ok"] is True
        assert "budget_remaining" in allowed.json()


def test_detail_health_denied_in_production_without_code(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    with TestClient(app) as client:
        response = client.get("/api/health?detail=1")

    assert response.status_code == 401
    # The public payload stays minimal even in production.
    with TestClient(app) as client:
        public = client.get("/api/health")
    assert public.json() == {"ok": True, "version": "1.0.0"}
