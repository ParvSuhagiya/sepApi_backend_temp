"""EarnRadar application settings loaded from environment / .env.

This module is the single source of truth for configuration values,
including the Anthropic model name. No other module may hard-code
secrets or the model string.
"""

from __future__ import annotations

import logging
from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

logger: logging.Logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    """Typed application settings read from environment variables / .env."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    SERPAPI_KEY: str = Field(description="SerpAPI key (required).")
    ANTHROPIC_API_KEY: str = Field(description="Anthropic API key (required).")

    ANTHROPIC_MODEL: str = Field(
        default="claude-sonnet-5-5",
        description="Anthropic model name.",
    )

    ALLOWED_ORIGINS: str = Field(
        default="http://localhost:5173",
        description="Comma-separated list of allowed CORS origins.",
    )

    CACHE_DB_PATH: str = Field(default="cache.db")
    TTL_JOBS_HOURS: int = Field(default=24)
    TTL_MAPS_HOURS: int = Field(default=24)
    TTL_TRENDS_HOURS: int = Field(default=168)
    TTL_FORUMS_HOURS: int = Field(default=72)

    RATE_LIMIT_SEARCH_PER_HOUR: int = Field(default=10)
    RATE_LIMIT_OUTREACH_PER_HOUR: int = Field(default=30)

    ACCESS_CODE: str = Field(default="")

    LLM_TIMEOUT_SECONDS: int = Field(default=60)
    SERP_TIMEOUT_SECONDS: int = Field(default=40)

    LOG_LEVEL: str = Field(default="INFO")

    @property
    def origins(self) -> list[str]:
        """Return ALLOWED_ORIGINS as a clean list of origins."""
        parts: list[str] = (self.ALLOWED_ORIGINS or "").split(",")
        cleaned: list[str] = [p.strip() for p in parts]
        return [p for p in cleaned if p]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return cached application settings, failing fast when required keys are missing."""
    try:
        settings: Settings = Settings()
    except Exception as exc:
        # Build a secret-free message: field names only, never values.
        missing: list[str] = []
        if hasattr(exc, "errors"):
            try:
                for err in exc.errors():  # type: ignore[no-untyped-call]
                    loc = err.get("loc", ())
                    if loc:
                        missing.append(str(loc[0]))
            except Exception:
                missing = []
        if missing:
            names: str = ", ".join(sorted(set(missing)))
            raise RuntimeError(
                f"Missing required configuration: {names}. "
                "Set them in environment variables or a .env file."
            ) from exc
        raise RuntimeError(
            "Invalid application configuration. "
            "Check environment variables or .env file."
        ) from exc

    if "*" in settings.origins:
        logger.warning(
            "SECURITY WARNING: ALLOWED_ORIGINS contains '*', which allows "
            "any origin. This is NOT safe for production-like use. "
            "Configure an explicit origin allow-list instead."
        )
    return settings
