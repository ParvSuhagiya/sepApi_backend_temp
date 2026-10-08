"""Tests for the health route."""

from fastapi.testclient import TestClient

from app.main import app


def test_health_endpoint() -> None:
    with TestClient(app) as client:
        response = client.get("/api/health")

    assert response.status_code == 200
    payload = response.json()
    assert payload["ok"] is True
    assert payload["version"] == "1.0.0"
    assert isinstance(payload["cache"]["entries"], int)
    assert isinstance(payload["lifetime"]["credits_used"], int)
    assert isinstance(payload["lifetime"]["cache_hits"], int)
    assert isinstance(payload["ai"]["input_tokens"], int)
    assert isinstance(payload["ai"]["output_tokens"], int)
