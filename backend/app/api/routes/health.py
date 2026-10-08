"""Health-check route."""

from fastapi import APIRouter

from app.services.llm import llm_lifetime_stats
from app.services.serp import cache_entry_count, lifetime_stats

router = APIRouter()


@router.get("/api/health")
async def health() -> dict:
    """Report service health, cache usage, and AI token counters."""
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
        ai_stats = {"input_tokens": 0, "output_tokens": 0}
    return {
        "ok": True,
        "version": "1.0.0",
        "cache": {"entries": int(entries)},
        "lifetime": {
            "credits_used": int(lifetime.get("credits_used", 0)),
            "cache_hits": int(lifetime.get("cache_hits", 0)),
        },
        "ai": {
            "input_tokens": int(ai_stats.get("input_tokens", 0)),
            "output_tokens": int(ai_stats.get("output_tokens", 0)),
        },
    }
