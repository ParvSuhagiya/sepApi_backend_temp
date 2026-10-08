"""Tests for application configuration."""

import pytest

from app.config import get_settings


def test_settings_origins_are_cleaned_and_defaults_are_loaded(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("ALLOWED_ORIGINS", " https://one.example, ,https://two.example,https://one.example ")
    get_settings.cache_clear()

    settings = get_settings()

    assert settings.origins == ["https://one.example", "https://two.example"]
    assert settings.cache_db_path == "cache.db"
    assert settings.ttl_jobs_hours == 24
    assert settings.ttl_maps_hours == 24
    assert settings.ttl_trends_hours == 168
    assert settings.ttl_forums_hours == 72
    assert settings.rate_limit_search_per_hour == 10
    assert settings.rate_limit_outreach_per_hour == 30
    assert settings.access_code == ""
    assert settings.llm_timeout_seconds == 60
    assert settings.serp_timeout_seconds == 40
    assert settings.log_level == "INFO"


def test_missing_required_keys_raise_a_safe_clear_error(    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("SERPAPI_KEY")
    monkeypatch.delenv("ANTHROPIC_API_KEY")
    get_settings.cache_clear()

    with pytest.raises(RuntimeError) as exc_info:
        get_settings()

    message = str(exc_info.value)
    assert "SERPAPI_KEY" in message
    assert "ANTHROPIC_API_KEY" in message
    assert "test-serpapi-key" not in message
    assert "test-anthropic-key" not in message


def test_origins_normalise_trailing_slash_case_and_dupes(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv(
        "ALLOWED_ORIGINS",
        "https://X.Vercel.App/, https://x.vercel.app ,HTTPS://y.example",
    )
    get_settings.cache_clear()

    assert get_settings().origins == ["https://x.vercel.app", "https://y.example"]


def test_new_security_settings_have_expected_defaults() -> None:
    settings = get_settings()

    assert settings.trusted_proxy_hops == 1
    assert settings.max_serp_calls_per_day == 300
    assert settings.max_llm_calls_per_day == 500
    assert settings.app_env == "development"
    assert settings.docs_enabled is True
