"""Orchestration: plan, fetch, clean, rank, score."""

from __future__ import annotations

import asyncio
import logging
import time
from uuid import uuid4

from app.errors import AllSourcesFailed, RankingFailed, UpstreamFailure
from app.observability import redact
from app.schemas import Opportunity, Profile
from app.services.cleaning import clean_forum, clean_jobs, clean_places, choose_trend
from app.services.outreach import draft_outreach
from app.services.planner import make_plan
from app.services.ranker import build_evidence, rank
from app.services.scoring import rank_opportunities
from app.services.serp import new_request_stats, serp

logger = logging.getLogger(__name__)

__all__ = [
    "run_search",
    "draft_message",
]


_SEARCH_TIMEOUT_SECONDS = 90.0


async def run_search(profile: Profile, request_id: str | None = None) -> dict:
    """Plan, fetch 7 SerpAPI calls, clean, rank, score; return SearchResponse dict."""
    try:
        async with asyncio.timeout(_SEARCH_TIMEOUT_SECONDS):
            return await _run_search_inner(profile, request_id=request_id)
    except TimeoutError as exc:
        logger.warning("search timed out after %.0fs", _SEARCH_TIMEOUT_SECONDS)
        raise UpstreamFailure(
            "The request took too long. Please try again shortly."
        ) from exc


async def _run_search_inner(profile: Profile, request_id: str | None = None) -> dict:
    start = time.perf_counter()
    stats = new_request_stats()
    rid = request_id or str(uuid4())
    city = profile.city

    plan, used_fallback = await make_plan(profile)

    spec = [
        {"group": "jobs", "engine": "google_jobs", "params": {"q": plan.job_queries[0], "location": f"{city}, India", "hl": "en"}},
        {"group": "jobs", "engine": "google_jobs", "params": {"q": plan.job_queries[1], "location": f"{city}, India", "hl": "en"}},
        {"group": "maps", "engine": "google_maps", "params": {"q": plan.local_queries[0], "type": "search"}},
        {"group": "maps", "engine": "google_maps", "params": {"q": plan.local_queries[1], "type": "search"}},
        {"group": "trends", "engine": "google_trends", "params": {"q": plan.trend_keywords[0], "data_type": "TIMESERIES", "date": "today 12-m", "geo": "IN"}},
        {"group": "trends", "engine": "google_trends", "params": {"q": plan.trend_keywords[1], "data_type": "TIMESERIES", "date": "today 12-m", "geo": "IN"}},
        {"group": "forums", "engine": "google_forums", "params": {"q": plan.forum_query}},
    ]

    tasks = [serp(entry["engine"], **entry["params"]) for entry in spec]
    raw_results = await asyncio.gather(*tasks, return_exceptions=True)

    grouped: dict[str, list] = {"jobs": [], "maps": [], "trends": [], "forums": []}
    for entry, result in zip(spec, raw_results):
        group = entry["group"]
        if isinstance(result, BaseException):
            try:
                detail = redact(f"{type(result).__name__}: {result}")
            except Exception:
                detail = type(result).__name__
            logger.warning("search fetch failed group=%s: %s", group, detail)
            grouped[group].append(None)
        else:
            grouped[group].append(result)

    degraded: list[str] = []
    for group, values in grouped.items():
        if values and all(value is None for value in values):
            degraded.append(group)

    total_failed = sum(1 for values in grouped.values() for value in values if value is None)
    if total_failed == len(spec):
        raise AllSourcesFailed()

    job_responses = [r for r in grouped["jobs"] if r is not None]
    maps_responses = [r for r in grouped["maps"] if r is not None]
    trend_responses = list(grouped["trends"])
    forum_responses = [r for r in grouped["forums"] if r is not None]

    jobs = clean_jobs(job_responses)
    places = clean_places(maps_responses)
    trend, trend_keyword, trend_growth = choose_trend(plan.trend_keywords, trend_responses)
    forum = clean_forum(forum_responses)

    evidence = build_evidence(jobs, places, trend_growth, forum, degraded)
    opps = await rank(profile, evidence)
    signals = {**evidence["market_signals"], "budget": profile.budget}
    ranked = rank_opportunities(opps, signals, degraded)
    ranked = _drop_invalid_opportunities(ranked)

    duration_ms = int((time.perf_counter() - start) * 1000)
    try:
        credits = int(stats.get("credits_used", 0))
    except Exception:
        credits = 0
    try:
        hits = int(stats.get("cache_hits", 0))
    except Exception:
        hits = 0

    logger.info(
        "search done request_id=%s duration_ms=%d credits_used=%d cache_hits=%d degraded=%s planner_fallback=%s opportunities=%d",
        rid,
        duration_ms,
        credits,
        hits,
        ",".join(degraded) if degraded else "-",
        used_fallback,
        len(ranked),
    )

    return {
        "opportunities": ranked,
        "jobs": [job.model_dump() for job in jobs],
        "local": [place.model_dump() for place in places],
        "trend": [point.model_dump() for point in trend],
        "trend_keyword": trend_keyword,
        "trend_growth": dict(trend_growth),
        "forum": [item.model_dump() for item in forum],
        "stats": {"credits_used": credits, "cache_hits": hits},
        "meta": {"request_id": rid, "duration_ms": duration_ms, "degraded": degraded},
    }


async def draft_message(profile: Profile, target: dict) -> str:
    """Draft an outreach message for a profile/target pair."""
    return await draft_outreach(profile, target)


def _drop_invalid_opportunities(ranked: list[dict]) -> list[dict]:
    """Keep only opportunities that satisfy the API schema.

    The ranker is lenient by design (e.g. it may keep a single evidence
    string), while SearchResponse requires 2-3. Dropping here instead of
    failing keeps one thin item from turning into a 500; if nothing
    survives, raise RankingFailed for a safe 502.
    """
    valid: list[dict] = []
    for item in ranked:
        try:
            valid.append(Opportunity.model_validate(item).model_dump())
        except Exception:
            logger.warning("dropping opportunity that fails API validation")
    if not valid:
        raise RankingFailed()
    return valid
