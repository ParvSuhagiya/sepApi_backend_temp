"""Shared pytest fixtures for EarnRadar backend tests."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Generator

import pytest


@pytest.fixture(autouse=True)
def _dummy_env_keys(monkeypatch: pytest.MonkeyPatch) -> Generator[None, None, None]:
    """Provide dummy secrets for every test and reset the settings cache."""
    monkeypatch.setenv("SERPAPI_KEY", "dummy-serpapi-key")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "dummy-anthropic-key")

    import app.config as config

    config.get_settings.cache_clear()
    try:
        yield
    finally:
        config.get_settings.cache_clear()
        # Ensure stray env files do not leak between tests.
        os.environ.pop("APP_ENV", None)


@pytest.fixture
def tmp_cache_path(tmp_path: Path) -> Path:
    """Return an isolated cache DB path inside pytest's tmp dir."""
    return tmp_path / "cache.db"
