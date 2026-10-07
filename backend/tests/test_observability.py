"""Tests for observability helpers."""

import pytest

from app.observability import redact


def test_redaction_masks_recognized_and_configured_keys(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("SERPAPI_KEY", "configured-serp-secret")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "configured-anthropic-secret")

    result = redact(
        "token sk-live_123 and configured-serp-secret "
        "configured-anthropic-secret"
    )

    assert result == f"token [REDACTED] and [REDACTED] [REDACTED]"
