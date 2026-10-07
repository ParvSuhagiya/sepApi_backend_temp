"""Application settings loaded from environment variables and an optional .env file."""

from functools import lru_cache
import logging

from pydantic import ValidationError
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)

__all__ = ["Settings", "get_settings"]


class Settings(BaseSettings):
    """Validated runtime configuration for the EarnRadar backend."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    serpapi_key: str
    anthropic_api_key: str
    anthropic_model: str = "claude-sonnet-5-5"
    allowed_origins: str = "http://localhost:5173"
    cache_db_path: str = "cache.db"
    ttl_jobs_hours: int = 24
    ttl_maps_hours: int = 24
    ttl_trends_hours: int = 168
    ttl_forums_hours: int = 72
    rate_limit_search_per_hour: int = 10
    rate_limit_outreach_per_hour: int = 30
    access_code: str = ""
    llm_timeout_seconds: int = 60
    serp_timeout_seconds: int = 40
    log_level: str = "INFO"

    @property
    def origins(self) -> list[str]:
        """Return configured CORS origins with whitespace and empty entries removed."""
        origins = list(dict.fromkeys(
            origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()
        ))
        if "*" in origins:
            logger.warning(
                "SECURITY WARNING: ALLOWED_ORIGINS includes '*'; "
                "wildcard CORS is unsafe for production."
            )
        return origins


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return cached settings, surfacing validation failures without secret values."""
    try:
        settings = Settings()
    except ValidationError as exc:
        errors = exc.errors(include_input=False, include_context=False, include_url=False)
        missing = [
            str(error["loc"][0]).upper()
            for error in errors
            if error["type"] == "missing" and error["loc"]
        ]
        if missing:
            message = f"Missing required environment variable(s): {', '.join(missing)}."
        else:
            invalid = sorted({str(error["loc"][0]).upper() for error in errors if error["loc"]})
            message = f"Invalid application configuration for: {', '.join(invalid)}."
        raise RuntimeError(message) from None
    settings.origins
    return settings
