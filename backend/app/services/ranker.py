"""Ranker AI step: ask Claude for opportunities, then validate and sanitise."""

from __future__ import annotations

import copy
import json
import logging
import math
import re

from app.errors import LLMError, LLMFormatError, RankingFailed
from app.prompts import (
    RANKER_MAX_TOKENS,
    RANKER_RETRY_SUFFIX,
    RANKER_SYSTEM,
    build_ranker_user,
)
from app.schemas import OpportunityAI, Profile
from app.services import llm as _llm_mod
from app.services.llm import ask_json as _orig_ask_json
from app.services.scam import scam_flags
from app.utils import clamp_int, normalize_type, truncate

logger = logging.getLogger(__name__)

__all__ = [
    "build_evidence",
    "validate_opportunities",
    "rank",
]

# Exposed for tests that monkeypatch ``app.services.ranker.ask_json``.
ask_json = _orig_ask_json
_ORIG_ASK_JSON = _orig_ask_json

_EVIDENCE_BUDGET_CHARS = 12000

_URL_RE = re.compile(r"https?://\S+", re.IGNORECASE)
_PHONE_RE = re.compile(r"\+?\d[\d\s\-]{8,}\d")

_PROMISE_RULES: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"100%\s*sure", re.IGNORECASE), "possible"),
    (re.compile(r"risk-?free", re.IGNORECASE), "with some risk"),
    (re.compile(r"assured\s+income", re.IGNORECASE), "possible income"),
    (re.compile(r"easy\s+money", re.IGNORECASE), "steady work"),
    (re.compile(r"guaranteed", re.IGNORECASE), "possible"),
]

_STOPWORDS = frozenset(
    {
        "that", "this", "with", "from", "have", "will", "would", "could",
        "should", "about", "into", "over", "under", "after", "before",
        "between", "their", "there", "these", "those", "which", "when",
        "where", "what", "your", "also", "such", "only", "very", "much",
        "more", "most", "some", "each", "other", "many", "even", "ever",
        "never", "always", "often", "does", "just", "like", "without",
        "within", "while", "cannot", "shall", "might", "must", "need",
        "used", "using", "make", "made", "then", "them", "they", "than",
    }
)

_WORD_RE = re.compile(r"[A-Za-z]{4,}")
_NUMBER_RE = re.compile(r"\d{2,}")


async def _call_ranker_ask(system: str, user: str) -> dict:
    """Call ask_json, honouring patches on either ranker or llm module."""
    fn = globals().get("ask_json", _ORIG_ASK_JSON)
    if fn is _ORIG_ASK_JSON:
        fn = _llm_mod.ask_json
    return await fn(system, user, RANKER_MAX_TOKENS, label="ranker")


def _get_field(obj: object, key: str, default: object = None) -> object:
    if isinstance(obj, dict):
        return obj.get(key, default)
    return getattr(obj, key, default) if hasattr(obj, key) else default


def _scrub_text(value: object) -> str:
    if not isinstance(value, str):
        return ""
    cleaned = _URL_RE.sub("", value)
    cleaned = _PHONE_RE.sub("", cleaned)
    return " ".join(cleaned.split()).strip()


def _evidence_size(evidence: dict) -> int:
    try:
        return len(json.dumps(evidence, ensure_ascii=False))
    except Exception:
        return _EVIDENCE_BUDGET_CHARS + 1


def build_evidence(jobs, local, trend_growth, forum, degraded) -> dict:
    """Build the AI-facing evidence dict without mutating inputs."""
    jobs_list = list(jobs) if isinstance(jobs, list) else []
    local_list = list(local) if isinstance(local, list) else []
    forum_list = list(forum) if isinstance(forum, list) else []
    growth_in = dict(trend_growth) if isinstance(trend_growth, dict) else {}
    degraded_list = list(degraded) if isinstance(degraded, list) else []

    job_count = len(jobs_list)
    high_risk = 0
    medium_risk = 0
    for job in jobs_list:
        risk = _get_field(job, "risk")
        if risk == "High":
            high_risk += 1
        elif risk == "Medium":
            medium_risk += 1

    local_business_count = len(local_list)
    ratings: list[float] = []
    for place in local_list:
        rating = _get_field(place, "rating")
        if isinstance(rating, bool):
            continue
        try:
            number = float(rating)  # type: ignore[arg-type]
        except (TypeError, ValueError, OverflowError):
            continue
        if math.isfinite(number):
            ratings.append(number)
    avg_rating = round(sum(ratings) / len(ratings), 2) if ratings else None

    best_growth = None
    if growth_in:
        numeric = []
        for value in growth_in.values():
            if isinstance(value, bool):
                continue
            try:
                number = int(value)  # type: ignore[arg-type]
            except (TypeError, ValueError, OverflowError):
                try:
                    number = int(float(value))  # type: ignore[arg-type]
                except (TypeError, ValueError, OverflowError):
                    continue
            numeric.append(number)
        if numeric:
            best_growth = max(numeric)

    forum_count = len(forum_list)

    jobs_out: list[dict] = []
    for job in jobs_list:
        if not isinstance(job, (dict, object)) or job is None:
            continue
        if not isinstance(job, dict) and not hasattr(job, "__dict__"):
            continue
        flags = _get_field(job, "flags")
        flags_out = [f for f in flags] if isinstance(flags, list) else []
        entry = {
            "title": _scrub_text(_get_field(job, "title") or ""),
            "company": _scrub_text(_get_field(job, "company") or ""),
            "location": _scrub_text(_get_field(job, "location") or ""),
            "via": _scrub_text(_get_field(job, "via") or ""),
            "salary": _scrub_text(_get_field(job, "salary") or ""),
            "desc": _scrub_text(_get_field(job, "desc") or _get_field(job, "description") or ""),
            "flags": [str(f) for f in flags_out if isinstance(f, str)],
            "risk": _get_field(job, "risk") if _get_field(job, "risk") in ("Low", "Medium", "High") else "Low",
        }
        jobs_out.append(entry)

    places_out: list[dict] = []
    for place in local_list:
        if place is None:
            continue
        if not isinstance(place, dict) and not hasattr(place, "__dict__"):
            continue
        rating = _get_field(place, "rating")
        rating_out = None
        if not isinstance(rating, bool):
            try:
                number = float(rating)  # type: ignore[arg-type]
                rating_out = number if math.isfinite(number) else None
            except (TypeError, ValueError, OverflowError):
                rating_out = None
        reviews = _get_field(place, "reviews")
        reviews_out = reviews if isinstance(reviews, int) and not isinstance(reviews, bool) else None
        places_out.append(
            {
                "name": _scrub_text(_get_field(place, "name") or _get_field(place, "title") or ""),
                "rating": rating_out,
                "reviews": reviews_out,
                "address": _scrub_text(_get_field(place, "address") or ""),
                "type": _scrub_text(_get_field(place, "type") or ""),
            }
        )

    forum_out: list[dict] = []
    for item in forum_list:
        if item is None:
            continue
        if not isinstance(item, dict) and not hasattr(item, "__dict__"):
            continue
        forum_out.append(
            {
                "title": _scrub_text(_get_field(item, "title") or ""),
                "snippet": _scrub_text(_get_field(item, "snippet") or ""),
            }
        )

    evidence: dict = {
        "market_signals": {
            "job_count": job_count,
            "high_risk_job_count": high_risk,
            "medium_risk_job_count": medium_risk,
            "local_business_count": local_business_count,
            "avg_local_rating": avg_rating,
            "best_trend_growth_percent": best_growth,
            "forum_result_count": forum_count,
        },
        "jobs": jobs_out,
        "local_businesses": places_out,
        "trend_growth_percent_12m": dict(growth_in),
        "forum_snippets": forum_out,
        "unavailable_sources": [str(s) for s in degraded_list if isinstance(s, str)],
    }

    if _evidence_size(evidence) > _EVIDENCE_BUDGET_CHARS:
        for entry in evidence["jobs"]:
            desc = entry.get("desc")
            if isinstance(desc, str) and len(desc) > 160:
                entry["desc"] = desc[:160]
        logger.info("ranker: trimmed job descriptions to 160 chars")
    if _evidence_size(evidence) > _EVIDENCE_BUDGET_CHARS:
        if len(evidence["forum_snippets"]) > 3:
            evidence["forum_snippets"] = evidence["forum_snippets"][:3]
            logger.info("ranker: trimmed forum snippets to 3")
    if _evidence_size(evidence) > _EVIDENCE_BUDGET_CHARS:
        if len(evidence["jobs"]) > 6:
            evidence["jobs"] = evidence["jobs"][:6]
            logger.info("ranker: trimmed jobs to 6")
    if _evidence_size(evidence) > _EVIDENCE_BUDGET_CHARS:
        if len(evidence["local_businesses"]) > 6:
            evidence["local_businesses"] = evidence["local_businesses"][:6]
            logger.info("ranker: trimmed places to 6")

    return copy.deepcopy(evidence)


def _sanitize_promises(text: str) -> tuple[str, bool]:
    replaced = False
    out = text
    for pattern, replacement in _PROMISE_RULES:
        new_out, count = pattern.subn(replacement, out)
        if count:
            replaced = True
            out = new_out
    return out, replaced


def _is_grounded(evidence_str: str, evidence_text_lower: str) -> bool:
    if not evidence_str or not evidence_text_lower:
        return False
    lowered = evidence_str.lower()
    for number in _NUMBER_RE.findall(evidence_str):
        if number in evidence_text_lower:
            return True
    for word in _WORD_RE.findall(lowered):
        if word in _STOPWORDS:
            continue
        if word in evidence_text_lower:
            return True
    return False


def validate_opportunities(raw: dict, evidence: dict) -> list[dict]:
    """Validate and sanitise raw AI output into opportunity dicts (no scoring)."""
    if not isinstance(raw, dict):
        return []
    items = raw.get("opportunities")
    if not isinstance(items, list):
        return []
    try:
        evidence_text = json.dumps(evidence, ensure_ascii=False).lower()
    except Exception:
        evidence_text = ""

    results: list[dict] = []
    seen_titles: set[str] = set()
    for entry in items:
        if not isinstance(entry, dict):
            continue
        try:
            ai = OpportunityAI.model_validate(entry)
        except Exception:
            continue

        if not isinstance(ai.title, str) or not ai.title.strip():
            continue
        title = truncate(ai.title.strip(), 90)
        if not title:
            continue
        if title.lower() in seen_titles:
            continue

        normalized = normalize_type(ai.type)
        if normalized is None:
            continue

        if not isinstance(ai.why, str) or not ai.why.strip():
            continue
        why = ai.why.strip()

        if not isinstance(ai.income_estimate, str) or not ai.income_estimate.strip():
            continue
        income = ai.income_estimate.strip()

        demand = clamp_int(ai.demand, 0, 100, 50)
        competition = clamp_int(ai.competition, 0, 100, 50)
        fit = clamp_int(ai.fit, 0, 100, 50)
        cost_ease = clamp_int(ai.cost_ease, 0, 100, 50)
        trust = clamp_int(ai.trust, 0, 100, 50)
        for field_name in ("demand", "competition", "fit", "cost_ease", "trust"):
            if getattr(ai, field_name, None) is None:
                logger.info("ranker: %s defaulted to 50", field_name)

        raw_evidence = ai.evidence
        if isinstance(raw_evidence, str):
            ev_candidates: list = [raw_evidence]
        elif isinstance(raw_evidence, list):
            ev_candidates = raw_evidence
        else:
            ev_candidates = []
        ev_list: list[str] = []
        for ev_item in ev_candidates:
            if isinstance(ev_item, str) and ev_item.strip():
                ev_list.append(ev_item.strip())
        ev_list = ev_list[:3]

        raw_plan = ai.plan_7_days
        plan_steps: list[str] = []
        if isinstance(raw_plan, list):
            for step in raw_plan:
                if isinstance(step, str) and step.strip():
                    plan_steps.append(step.strip())
        plan_steps = plan_steps[:7]
        if len(plan_steps) < 3:
            continue

        promise_hit = False
        why, hit = _sanitize_promises(why)
        promise_hit = promise_hit or hit
        income, hit = _sanitize_promises(income)
        promise_hit = promise_hit or hit
        sanitized_ev: list[str] = []
        for ev_text in ev_list:
            new_text, hit = _sanitize_promises(ev_text)
            promise_hit = promise_hit or hit
            if new_text.strip():
                sanitized_ev.append(new_text.strip())
        ev_list = sanitized_ev[:3]
        sanitized_plan: list[str] = []
        for step in plan_steps:
            new_step, hit = _sanitize_promises(step)
            promise_hit = promise_hit or hit
            if new_step.strip():
                sanitized_plan.append(new_step.strip())
        plan_steps = sanitized_plan[:7]
        if promise_hit:
            logger.info("ranker: promise language replaced with neutral wording")
        if len(plan_steps) < 3:
            continue

        filtered: list[str] = []
        removed_fee = False
        for step in plan_steps:
            try:
                flags = scam_flags(step)
            except Exception:
                flags = []
            if "Asks for upfront fee" in flags:
                removed_fee = True
                continue
            filtered.append(step)
        if removed_fee:
            trust = max(0, trust - 20)
            logger.info("ranker: removed pay-to-start step, trust lowered by 20")
        if len(filtered) < 3:
            continue
        plan_steps = filtered[:7]

        grounded = any(_is_grounded(ev_text, evidence_text) for ev_text in ev_list)
        if not grounded:
            trust = max(0, trust - 15)
            logger.info("ranker: ungrounded evidence, trust lowered by 15")

        if "estimate" not in income.lower():
            income = income + " (estimate)"

        if title.lower() in seen_titles:
            continue
        seen_titles.add(title.lower())

        results.append(
            {
                "title": title,
                "type": normalized,
                "why": why,
                "income_estimate": income,
                "demand": demand,
                "competition": competition,
                "fit": fit,
                "cost_ease": cost_ease,
                "trust": trust,
                "evidence": ev_list,
                "plan_7_days": plan_steps,
            }
        )
        if len(results) >= 5:
            break

    return results[:5]


def _serialize_evidence(evidence: dict) -> str:
    try:
        text = json.dumps(evidence, ensure_ascii=False)
    except Exception:
        text = "{}"
    return text.replace("</evidence>", "<\\/evidence>")


async def rank(profile: Profile, evidence: dict) -> list[dict]:
    """Ask Claude for 5 opportunities; validate, sanitise, retry once if empty."""
    evidence_snapshot = evidence
    try:
        profile_json = json.dumps(profile.model_dump(mode="json"), ensure_ascii=False)
    except Exception:
        profile_json = json.dumps(
            {"skills": profile.skills, "city": profile.city, "hours": profile.hours, "budget": profile.budget},
            ensure_ascii=False,
        )
    evidence_json = _serialize_evidence(evidence_snapshot if isinstance(evidence_snapshot, dict) else {})
    user = build_ranker_user(profile_json, evidence_json)

    try:
        raw = await _call_ranker_ask(RANKER_SYSTEM, user)
    except LLMFormatError:
        retry_user = user + "\n" + RANKER_RETRY_SUFFIX
        try:
            raw = await _call_ranker_ask(RANKER_SYSTEM, retry_user)
        except LLMFormatError as exc:
            raise RankingFailed() from exc
        except LLMError:
            raise
        items = validate_opportunities(raw if isinstance(raw, dict) else {}, evidence_snapshot)
        if not items:
            raise RankingFailed()
        return items
    except LLMError:
        raise

    if not isinstance(raw, dict):
        raw = {}

    items = validate_opportunities(raw, evidence_snapshot)
    if items:
        return items

    retry_user = user + "\n" + RANKER_RETRY_SUFFIX
    try:
        raw_retry = await _call_ranker_ask(RANKER_SYSTEM, retry_user)
    except LLMFormatError as exc:
        raise RankingFailed() from exc
    except LLMError:
        raise
    if not isinstance(raw_retry, dict):
        raw_retry = {}
    items_retry = validate_opportunities(raw_retry, evidence_snapshot)
    if not items_retry:
        raise RankingFailed()
    return items_retry
