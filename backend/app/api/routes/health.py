"""Health-check route.

The public payload is intentionally minimal (PRD FR-API-1). The extended
payload is only served when the access-code check passes, or when no access
code is configured and the app is not running in production.
"""

from fastapi import APIRouter, Request

from app.budget import remaining
from app.config import get_settings
from app.errors import Unauthorized
from app.security import require_access_code
from app.services.llm import llm_lifetime_stats
from app.services.serp import cache_entry_count, lifetime_stats

router = APIRouter()

_VERSION = "1.0.0"


@router.get("/api/health")
async def health(request: Request) -> dict:
    """Report minimal liveness publicly, details only when authorized."""
    detail = request.query_params.get("detail", "")
    if detail.strip().lower() not in ("1", "true"):
        return {"ok": True, "version": _VERSION}

    settings = get_settings()
    if settings.access_code:
        await require_access_code(request)
    elif (settings.app_env or "").strip().lower() == "production":
        # No code configured in production: details stay hidden.
        raise Unauthorized("Authentication is required.")

    try:
        entries = cache_entry_count()
    except Exception:
        entries = 0
    try:
        lifetime = lifetime_stats()
    except Exception:
        lifetime = {"credits_used": 0, "cache_hits": 0}
    try:
        ai_stats = llm_lifetime_stats()
    except Exception:
        ai_stats = {"input_tokens": 0, "output_tokens": 0, "calls": 0}
    return {
        "ok": True,
        "version": _VERSION,
        "cache": {"entries": int(entries)},
        "cache_entries": int(entries),
        "lifetime": {
            "credits_used": int(lifetime.get("credits_used", 0)),
            "cache_hits": int(lifetime.get("cache_hits", 0)),
        },
        "ai": {
            "input_tokens": int(ai_stats.get("input_tokens", 0)),
            "output_tokens": int(ai_stats.get("output_tokens", 0)),
            "calls": int(ai_stats.get("calls", 0)),
        },
        "budget_remaining": {
            "serp": remaining("serp", settings.max_serp_calls_per_day),
            "llm": remaining("llm", settings.max_llm_calls_per_day),
        },
    }
