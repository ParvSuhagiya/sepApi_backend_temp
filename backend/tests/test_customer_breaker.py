"""Tests for the per-engine circuit breaker (unit + injected clock + engagement)."""

import datetime
import logging

import pytest

import app.services.serp as serp_module
from app.modes.customers import breaker as breaker_module
from app.modes.customers.breaker import (
    allow,
    record_failure,
    record_success,
    reset_breakers,
    set_clock,
)


def _clock_at(moment: datetime.datetime):
    def _now() -> datetime.datetime:
        return moment

    return _now


def _advance(seconds: float):
    base = datetime.datetime.now(datetime.timezone.utc)

    def _now() -> datetime.datetime:
        return base + datetime.timedelta(seconds=seconds)

    set_clock(_now)


def test_closed_initially() -> None:
    assert allow("google_maps") is True


def test_five_consecutive_failures_trip_breaker(caplog) -> None:
    for _ in range(5):
        record_failure("google_maps")
    with caplog.at_level(logging.WARNING, logger="app.modes.customers.breaker"):
        assert allow("google_maps") is False
    assert "circuit open engine=google_maps" in caplog.text


def test_success_resets_consecutive_count() -> None:
    for _ in range(4):
        record_failure("google_maps")
    record_success("google_maps")
    for _ in range(4):
        record_failure("google_maps")
    assert allow("google_maps") is True


def test_window_expiry_restarts_count() -> None:
    for _ in range(4):
        record_failure("google_maps")
    _advance(61)
    for _ in range(4):
        record_failure("google_maps")
    assert allow("google_maps") is True


def test_open_circuit_closes_after_30s(caplog) -> None:
    for _ in range(5):
        record_failure("google_maps")
    assert allow("google_maps") is False
    _advance(31)
    caplog.clear()
    with caplog.at_level(logging.WARNING, logger="app.modes.customers.breaker"):
        assert allow("google_maps") is True
    assert "circuit open" not in caplog.text


def test_engines_are_isolated() -> None:
    for _ in range(5):
        record_failure("google_maps")
    assert allow("google_maps") is False
    assert allow("google_maps_reviews") is True


async def test_discovery_short_circuits_without_calling_serp(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import app.modes.customers.discovery as discovery_module
    from app.errors import AllSourcesFailed
    from app.modes.customers.schemas import LeadPlan

    calls: list = []

    async def boom(engine: str, **params):
        calls.append(engine)
        raise RuntimeError("down")

    monkeypatch.setattr(serp_module, "serp", boom)
    plan = LeadPlan.model_validate(
        {
            "city": "Ahmedabad",
            "product_summary": "Restaurant management system",
            "target_customer": "Mid-level restaurants",
            "buyer_roles": ["owner"],
            "maps_queries": [
                "restaurants in Ahmedabad",
                "family restaurants in Ahmedabad",
                "cafes in Ahmedabad",
            ],
            "pain_keywords": ["billing errors", "staff shifts", "order delays", "food waste"],
            "competitor_query": "restaurant billing software",
            "pitch_angle": "Cut billing errors",
        }
    )
    with pytest.raises(AllSourcesFailed):
        await discovery_module.discover(plan)
    with pytest.raises(AllSourcesFailed):
        await discovery_module.discover(plan)
    first_run_calls = len(calls)
    assert first_run_calls == 5  # trip lands on the 5th failure, mid-second-run
    with pytest.raises(AllSourcesFailed):
        await discovery_module.discover(plan)
    assert len(calls) == first_run_calls  # short-circuited, no new SerpAPI calls
    reset_breakers()
