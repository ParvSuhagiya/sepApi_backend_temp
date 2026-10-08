"""Shared test configuration and fixtures."""

from collections.abc import Iterator
from pathlib import Path

import pytest

from app.budget import reset_budgets, reset_clock
from app.config import get_settings


@pytest.fixture(autouse=True)
def configured_test_environment(
    monkeypatch: pytest.MonkeyPatch,
) -> Iterator[None]:
    """Set safe provider credentials and reset cached settings around each test."""
    monkeypatch.setenv("SERPAPI_KEY", "test-serpapi-key")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-anthropic-key")
    get_settings.cache_clear()
    reset_budgets()
    reset_clock()
    yield
    reset_budgets()
    reset_clock()
    get_settings.cache_clear()


@pytest.fixture
def tmp_cache_path(tmp_path: Path) -> str:
    """Provide a cache database path isolated to the current test."""
    return str(tmp_path / "cache.db")
