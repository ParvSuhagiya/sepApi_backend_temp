"""Settings parsing, defaults, and fail-fast behaviour."""

from __future__ import annotations

import pytest


def test_defaults_and_origins_parsing(monkeypatch: pytest.MonkeyPatch) -> None:
    import app.config as config

    monkeypatch.setenv("ALLOWED_ORIGINS", "http://localhost:5173, https://example.com ,,")
    config.get_settings.cache_clear()
    settings = config.get_settings()

    assert settings.origins == ["http://localhost:5173", "https://example.com"]
    assert settings.ANTHROPIC_MODEL == "claude-sonnet-5-5"
    assert settings.CACHE_DB_PATH == "cache.db"
    assert settings.TTL_JOBS_HOURS == 24
    assert settings.TTL_MAPS_HOURS == 24
    assert settings.TTL_TRENDS_HOURS == 168
    assert settings.TTL_FORUMS_HOURS == 72
    assert settings.RATE_LIMIT_SEARCH_PER_HOUR == 10
    assert settings.RATE_LIMIT_OUTREACH_PER_HOUR == 30
    assert settings.ACCESS_CODE == ""
    assert settings.LLM_TIMEOUT_SECONDS == 60
    assert settings.SERP_TIMEOUT_SECONDS == 40
    assert settings.LOG_LEVEL == "INFO"


def test_default_origins_without_env(monkeypatch: pytest.MonkeyPatch) -> None:
    import app.config as config

    monkeypatch.delenv("ALLOWED_ORIGINS", raising=False)
    config.get_settings.cache_clear()
    settings = config.get_settings()
    assert settings.origins == ["http://localhost:5173"]
    assert "*" not in settings.origins


def test_missing_key_raises_without_echoing_value(monkeypatch: pytest.MonkeyPatch) -> None:
    import app.config as config

    secret_value: str = "super-secret-serpapi-value-12345"
    monkeypatch.setenv("SERPAPI_KEY", secret_value)
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    # Also remove any .env influence by ensuring Settings sees the deletion.
    config.get_settings.cache_clear()

    with pytest.raises(Exception) as exc_info:
        config.get_settings()

    rendered: str = str(exc_info.value)
    assert "ANTHROPIC_API_KEY" in rendered
    assert secret_value not in rendered
    assert "super-secret" not in rendered
