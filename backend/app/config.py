"""Application settings loaded from environment variables and an optional .env file."""

from functools import lru_cache
import logging
from urllib.parse import urlsplit, urlunsplit

from pydantic import ValidationError
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)

__all__ = ["Settings", "get_settings", "normalize_origin"]


def normalize_origin(value: str) -> str:
    """Normalise a CORS origin: strip whitespace/trailing slash, lowercase scheme+host.

    Drops duplicates' noise (paths, queries, fragments are not valid in an
    origin). Returns "" for empty input; returns the stripped value unchanged
    when it does not look like scheme://host (e.g. "*").
    """
    cleaned = value.strip().rstrip("/")
    if not cleaned:
        return ""
    try:
        parts = urlsplit(cleaned)
    except ValueError:
        return cleaned
    if not parts.scheme or not parts.hostname:
        return cleaned
    host = parts.hostname.lower()
    netloc = host
    if parts.port is not None:
        netloc = f"{host}:{parts.port}"
    elif "@" in (parts.netloc or ""):
        # Preserve userinfo if present (unusual for CORS, but don't corrupt).
        userinfo = parts.netloc.rsplit("@", 1)[0]
        netloc = f"{userinfo}@{host}"
    return urlunsplit((parts.scheme.lower(), netloc, "", "", ""))


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
    trusted_proxy_hops: int = 1
    max_serp_calls_per_day: int = 300
    max_llm_calls_per_day: int = 500
    app_env: str = "development"
    enable_docs: bool | None = None
    score_mode: str = "blend"
    rank_cache_hours: int = 0
    llm_timeout_seconds: int = 60
    serp_timeout_seconds: int = 40
    log_level: str = "INFO"
    enable_customer_mode: bool = True
    lead_research_top_n: int = 5
    max_lead_serp_calls_per_request: int = 12
    max_lead_serp_calls_per_day: int = 150
    leads_request_deadline_seconds: int = 45
    rate_limit_leads_per_hour: int = 5
    leads_cache_hours: int = 6
    geocode_enabled: bool = False
    geocode_provider: str = "nominatim"
    geocode_base_url: str = "https://nominatim.openstreetmap.org"
    geocode_user_agent: str = ""
    geocode_max_per_request: int = 8

    @property
    def docs_enabled(self) -> bool:
        """True unless running in production (overridable via ENABLE_DOCS)."""
        if self.enable_docs is not None:
            return bool(self.enable_docs)
        return (self.app_env or "").strip().lower() != "production"

    @property
    def origins(self) -> list[str]:
        """Return configured CORS origins, normalised and deduplicated."""
        origins: list[str] = []
        for raw in self.allowed_origins.split(","):
            if not raw.strip():
                continue
            normalized = normalize_origin(raw)
            if not normalized:
                continue
            if normalized != raw.strip():
                logger.warning(
                    "CORS origin normalized: %r -> %r "
                    "(check ALLOWED_ORIGINS for trailing slashes/case)",
                    raw.strip(),
                    normalized,
                )
            if normalized not in origins:
                origins.append(normalized)
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
