"""Planner AI step: turn a user profile into targeted SerpAPI search queries."""

from __future__ import annotations

import logging
from typing import Any

from app.errors import LLMError, LLMFormatError
from app.prompts import PLANNER_MAX_TOKENS, PLANNER_SYSTEM, build_planner_user
from app.schemas import Plan, Profile
from app.services import llm as _llm_mod
from app.services.llm import ask_json as _orig_ask_json
from app.utils import clean_query, first_skill

logger = logging.getLogger(__name__)

__all__ = [
    "make_plan",
    "coerce_plan",
    "fallback_plan",
]

# Exposed for tests that monkeypatch ``app.services.planner.ask_json``.
ask_json = _orig_ask_json
_ORIG_ASK_JSON = _orig_ask_json


async def _call_planner_ask(system: str, user: str) -> dict:
    """Call ask_json, honouring patches on either planner or llm module."""
    fn = globals().get("ask_json", _ORIG_ASK_JSON)
    if fn is _ORIG_ASK_JSON:
        fn = _llm_mod.ask_json
    return await fn(system, user, PLANNER_MAX_TOKENS, label="planner")


def _fallback_templates(profile: Profile) -> dict[str, Any]:
    skill = first_skill(profile.skills)
    city = profile.city.strip() if isinstance(profile.city, str) else ""
    return {
        "job_queries": [skill + " jobs", skill + " work from home"],
        "local_queries": [
            skill + " services in " + city,
            "businesses hiring " + skill + " in " + city,
        ],
        "trend_keywords": [skill, skill + " freelance"],
        "forum_query": "how much can I earn with " + skill + " in India",
    }


def fallback_plan(profile: Profile) -> Plan:
    """Build the full deterministic fallback plan."""
    t = _fallback_templates(profile)
    job = [clean_query(q) for q in t["job_queries"]]
    local = [clean_query(q) for q in t["local_queries"]]
    trends = [clean_query(q) for q in t["trend_keywords"]]
    forum = clean_query(t["forum_query"])
    return Plan(
        job_queries=job,
        local_queries=local,
        trend_keywords=trends,
        forum_query=forum,
    )


def _tolerant_str_list(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, str):
        candidates: Any = [value]
    elif isinstance(value, list):
        candidates = value
    else:
        return []
    out: list[str] = []
    for item in candidates:
        if isinstance(item, str) and item.strip():
            out.append(item)
    return out


def _tolerant_forum(value: Any) -> str:
    if isinstance(value, str):
        return value
    if isinstance(value, list):
        for item in value:
            if isinstance(item, str) and item.strip():
                return item
    return ""


def _parse_tolerant(data: dict) -> Plan:
    job = _tolerant_str_list(data.get("job_queries"))
    local = _tolerant_str_list(data.get("local_queries"))
    trends = _tolerant_str_list(data.get("trend_keywords"))
    forum = _tolerant_forum(data.get("forum_query"))
    return Plan(
        job_queries=job,
        local_queries=local,
        trend_keywords=trends,
        forum_query=forum,
    )


def _ensure_city(query: str, city: str) -> str:
    if city and city.casefold() not in query.casefold():
        query = clean_query(query + " in " + city)
    return query


def _coerce_pair(
    raw_items: list[str],
    fallback_items: list[str],
    city: str,
    enforce_city: bool,
) -> tuple[list[str], bool]:
    """Coerce a raw list to exactly 2 sanitised, distinct queries."""
    used_fallback = False

    cleaned: list[str] = []
    for item in raw_items:
        if isinstance(item, str):
            q = clean_query(item)
            if q:
                cleaned.append(q)

    cleaned_fallbacks: list[str] = []
    for fb in fallback_items:
        q = clean_query(fb)
        if q:
            if enforce_city:
                q = _ensure_city(q, city)
                q = clean_query(q)
            if q:
                cleaned_fallbacks.append(q)
    # Safety: fallbacks must yield 2 entries; if cleaning emptied them, use raw.
    while len(cleaned_fallbacks) < 2 and fallback_items:
        cleaned_fallbacks.append(clean_query(fallback_items[len(cleaned_fallbacks) % len(fallback_items)]))

    truncated = cleaned[:2]

    result: list[str] = list(truncated)
    if len(result) < 2:
        used_fallback = True
        for idx in range(len(result), 2):
            chosen = ""
            # Prefer the fallback at the same index, else first non-duplicate.
            candidates: list[str] = []
            if idx < len(cleaned_fallbacks):
                candidates.append(cleaned_fallbacks[idx])
            candidates.extend(cleaned_fallbacks)
            for cand in candidates:
                if cand and cand not in result:
                    # Also avoid case-insensitive dupes.
                    lowered = [r.casefold() for r in result]
                    if cand.casefold() not in lowered:
                        chosen = cand
                        break
            if not chosen and cleaned_fallbacks:
                chosen = cleaned_fallbacks[idx % len(cleaned_fallbacks)]
            result.append(chosen)

    if enforce_city:
        for i, q in enumerate(result):
            new_q = _ensure_city(q, city)
            new_q = clean_query(new_q)
            if new_q:
                result[i] = new_q
            else:
                # City enforcement emptied the query; restore fallback.
                result[i] = cleaned_fallbacks[i % len(cleaned_fallbacks)]
                used_fallback = True

    # Drop any empties that survived (should not happen) and re-pad.
    result = [q for q in result if q]
    while len(result) < 2:
        result.append(cleaned_fallbacks[len(result) % len(cleaned_fallbacks)])
        used_fallback = True
    result = result[:2]

    # Deduplicate: the two entries must differ.
    if len(result) == 2 and result[0].casefold() == result[1].casefold():
        used_fallback = True
        replaced = False
        for cand in reversed(cleaned_fallbacks):
            cc = _ensure_city(cand, city) if enforce_city else cand
            cc = clean_query(cc)
            if cc and cc.casefold() != result[0].casefold():
                result[1] = cc
                replaced = True
                break
        if not replaced:
            # Guarantee difference even in pathological cases.
            suffix = " alternate"
            alt = clean_query(result[1] + suffix)
            if alt.casefold() == result[0].casefold():
                alt = clean_query(result[1] + suffix + " option")
            result[1] = alt

    return result[:2], used_fallback


def _coerce_with_flag(
    plan_like: Plan | dict, profile: Profile
) -> tuple[Plan, bool, list[str]]:
    if isinstance(plan_like, dict):
        try:
            plan = _parse_tolerant(plan_like)
        except Exception:
            fb = fallback_plan(profile)
            return fb, True, ["unusable_dict"]
    elif isinstance(plan_like, Plan):
        plan = plan_like
    else:
        fb = fallback_plan(profile)
        return fb, True, ["unusable_type"]

    city = profile.city.strip() if isinstance(profile.city, str) else ""
    templates = _fallback_templates(profile)

    padded_parts: list[str] = []

    job, job_used = _coerce_pair(
        list(plan.job_queries or []), templates["job_queries"], city, False
    )
    if job_used:
        padded_parts.append("job_queries")

    local, local_used = _coerce_pair(
        list(plan.local_queries or []), templates["local_queries"], city, True
    )
    if local_used:
        padded_parts.append("local_queries")

    trends, trends_used = _coerce_pair(
        list(plan.trend_keywords or []), templates["trend_keywords"], city, False
    )
    if trends_used:
        padded_parts.append("trend_keywords")

    forum_raw = plan.forum_query if isinstance(plan.forum_query, str) else ""
    forum_clean = clean_query(forum_raw)
    forum_used = False
    if not forum_clean:
        forum_clean = clean_query(str(templates["forum_query"]))
        forum_used = True
        padded_parts.append("forum_query")

    coerced = Plan(
        job_queries=job,
        local_queries=local,
        trend_keywords=trends,
        forum_query=forum_clean,
    )
    return coerced, bool(padded_parts), padded_parts


def coerce_plan(plan: Plan, profile: Profile) -> Plan:
    """Coerce each list to exactly 2 sanitised strings; forum falls back if empty."""
    coerced, _, _ = _coerce_with_flag(plan, profile)
    return coerced


async def make_plan(profile: Profile) -> tuple[Plan, bool]:
    """Return (plan, used_fallback); never raises for AI/format failures."""
    user = build_planner_user(profile)

    try:
        raw = await _call_planner_ask(PLANNER_SYSTEM, user)
    except LLMFormatError:
        try:
            raw = await _call_planner_ask(PLANNER_SYSTEM, user)
        except LLMError:
            logger.warning("planner: retry failed, using fallback plan")
            return fallback_plan(profile), True
    except LLMError:
        logger.warning("planner: provider unavailable, using fallback plan")
        return fallback_plan(profile), True

    if not isinstance(raw, dict):
        logger.warning("planner: AI result unusable (not a dict), using fallback")
        return fallback_plan(profile), True

    try:
        parsed = _parse_tolerant(raw)
    except Exception:
        logger.warning("planner: AI result unusable (parse failed), using fallback")
        return fallback_plan(profile), True

    coerced, needed, parts = _coerce_with_flag(parsed, profile)
    if needed:
        logger.warning("planner: padded from fallbacks for parts=%s", ",".join(parts))
    return coerced, needed
