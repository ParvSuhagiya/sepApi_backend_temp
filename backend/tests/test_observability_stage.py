"""Tests for stage-timing observability: timings present, logs clean."""

import logging

from app.modes.customers.schemas import LeadMeta
from app.observability_stage import (
    get_timings_ms,
    log_request_summary,
    reset_timings,
    stage,
)

OFFER = (
    "i am a devops engineer and i have made restaurant billing software "
    "zxqy-unique-token for Ahmedabad mid level restaurants"
)


def test_stage_timings_recorded_per_stage() -> None:
    reset_timings()
    with stage("plan"):
        pass
    with stage("discover"):
        pass
    timings = get_timings_ms()
    assert set(timings) == {"plan", "discover"}
    assert all(isinstance(value, float) and value >= 0.0 for value in timings.values())


def test_stage_timings_support_nesting_and_repeat_use() -> None:
    reset_timings()
    with stage("outer"):
        with stage("inner"):
            pass
    with stage("outer"):
        pass
    timings = get_timings_ms()
    assert set(timings) == {"outer", "inner"}


def test_timings_feed_meta_timings_ms() -> None:
    reset_timings()
    with stage("plan"):
        pass
    meta = LeadMeta.model_validate(
        {"credits_used": 2, "cache_hits": 1, "timings_ms": get_timings_ms()}
    )
    assert meta.timings_ms == get_timings_ms()
    assert set(meta.timings_ms) == {"plan"}


def test_single_summary_line_has_fields_and_no_offer_text(caplog) -> None:
    reset_timings()
    with stage("plan"):
        _ = OFFER  # offer text is handled but never passed to logging
    with stage("discover"):
        pass
    with caplog.at_level(logging.INFO, logger="app.observability_stage"):
        log_request_summary(
            mode="customers",
            credits_used=3,
            cache_hits=1,
            degraded=["trends"],
            partial=["maps"],
            outcome="ok",
        )
    records = [
        record
        for record in caplog.records
        if record.name == "app.observability_stage"
    ]
    assert len(records) == 1
    line = records[0].getMessage()
    for field in ("mode=customers", "credits_used=3", "cache_hits=1",
                  "degraded=trends", "partial=maps", "outcome=ok",
                  "stages=discover,plan"):
        assert field in line, line
    assert "zxqy-unique-token" not in caplog.text
    assert "restaurant billing software" not in caplog.text
