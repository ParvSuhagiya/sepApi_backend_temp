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
from app.services.scam import scam_flags
from app.utils import clamp_int, normalize_type, truncate

logger = logging.getLogger(__name__)

__all__ = [
    "build_evidence",
    "validate_opportunities",
    "rank",
]

# Generic, honest final steps used ONLY to pad a 3-6 step plan up to the
# documented 7 steps. Never advice that costs money or promises income.
_PLAN_REPAIR_STEPS = [
    "Review what worked this week and decide your next step",
    "List two people or businesses to contact next week",
    "Set aside one hour to close one skill gap you noticed",
    "Track this week's earnings and expenses in a notebook",
    "Ask one customer or peer for honest feedback",
]

_EVIDENCE_BUDGET_CHARS = 12000

_URL_RE = re.compile(r"https?://\S+", re.IGNORECASE)
# Indian mobile shapes only: optional +91/0 prefix, 10 digits starting 6-9.
# Checked: strips "98765 43210" and "+91-9876543210" but keeps salary ranges
# such as "12000 - 15000" and "10000 20000 30000".
_PHONE_RE = re.compile(
    r"(?<![\d,])(?:\+?91[\s\-]?|0)?[6-9]\d{4}[\s\-]?\d{5}(?![\d,])"
)

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

_TOKEN_RE = re.compile(r"[a-z0-9]+")
_ITEM_WORD_RE = re.compile(r"[a-z]+")


async def _call_ranker_ask(system: str, user: str) -> dict:
    """Call the shared LLM seam (tests patch ``app.services.llm.ask_json``)."""
    return await _llm_mod.ask_json(system, user, RANKER_MAX_TOKENS, label="ranker")


def _get_field(obj: object, key: str, default: object = None) -> object:
    if isinstance(obj, dict):
        return obj.get(key, default)
    return getattr(obj, key, default) if hasattr(obj, key) else default


def _scrub_text(value: object, *, scrub_phone: bool = True) -> str:
    if not isinstance(value, str):
        return ""
    cleaned = _URL_RE.sub("", value)
    if scrub_phone:
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
            # Salary ranges look like phone numbers to naive patterns, so the
            # phone scrubber must never run on the salary field.
            "salary": _scrub_text(_get_field(job, "salary") or "", scrub_phone=False),
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


_NEGATIONS = frozenset({"no", "not", "never", "isn't", "aren't", "without"})
_NEGATION_RE = re.compile(r"[A-Za-z']+")


def _in_negated_scope(text_before_match: str) -> bool:
    """True when a negation scopes over the upcoming match.

    A match is left unchanged when a negation word (no/not/never/isn't/...)  occurs within the 3 words directly before it, or anywhere earlier in the
    same sentence (sentences split on `.`, `!`, `?`). The sentence scope keeps
    denials such as "No guaranteed income here; risk-free is bad" intact
    instead of garbling them into promises.
    """
    words = _NEGATION_RE.findall(text_before_match.lower())
    if any(word in _NEGATIONS or word.endswith("n't") for word in words[-3:]):
        return True
    segment = re.split(r"[.!?\n]+", text_before_match)[-1].lower()
    seg_words = _NEGATION_RE.findall(segment)
    return any(word in _NEGATIONS or word.endswith("n't") for word in seg_words)


def _sanitize_promises(text: str) -> tuple[str, bool]:
    """Replace promise language, leaving negated phrases ("no guaranteed...") intact."""
    replaced = False
    out = text
    for pattern, replacement in _PROMISE_RULES:
        parts: list[str] = []
        cursor = 0
        for match in pattern.finditer(out):
            if _in_negated_scope(out[: match.start()]):
                continue
            parts.append(out[cursor : match.start()])
            parts.append(replacement)
            cursor = match.end()
            replaced = True
        if cursor:
            parts.append(out[cursor:])
            out = "".join(parts)
    return out, replaced


def _evidence_tokens(evidence_text_lower: str) -> set[str]:
    """Tokenise evidence into whole lowercase words/numbers (no substrings)."""
    return set(_TOKEN_RE.findall(evidence_text_lower))


def _is_grounded(evidence_str: str, evidence_text_lower: str) -> bool:
    """True with >=1 shared number or >=2 distinct shared non-stopword words."""
    if not evidence_str or not evidence_text_lower:
        return False
    tokens = _evidence_tokens(evidence_text_lower)
    numbers = set(re.findall(r"\d+", evidence_str))
    if numbers & tokens:
        return True
    words = {
        word
        for word in _ITEM_WORD_RE.findall(evidence_str.lower())
        if len(word) >= 2 and word not in _STOPWORDS
    }
    return len(words & tokens) >= 2


def _repair_evidence(ev_list: list[str], evidence: dict) -> list[str] | None:
    """Pad a single surviving evidence string to 2 with a signals-built line.

    Returns the repaired list, or None when nothing honest can be built (the
    item must then be dropped). Lines are deterministic facts from
    ``market_signals`` only, never invented.
    """
    if len(ev_list) >= 2:
        return ev_list[:3]
    if len(ev_list) != 1:
        return None
    signals = evidence.get("market_signals") if isinstance(evidence, dict) else None
    signals = signals if isinstance(signals, dict) else {}
    try:
        jobs = int(signals.get("job_count") or 0)
    except (TypeError, ValueError):
        jobs = 0
    try:
        local = int(signals.get("local_business_count") or 0)
    except (TypeError, ValueError):
        local = 0
    try:
        forum = int(signals.get("forum_result_count") or 0)
    except (TypeError, ValueError):
        forum = 0
    if jobs > 0:
        extra = f"{jobs} live job listings found for your search"
    elif local > 0:
        extra = f"{local} local businesses found near your city"
    elif forum > 0:
        extra = f"{forum} forum discussions found about this work"
    else:
        return None
    logger.info("ranker: padded single evidence string with signals line")
    return [ev_list[0], extra]


def _repair_plan(plan_steps: list[str]) -> list[str]:
    """Pad a 3-6 step plan to exactly 7 with generic, honest final steps."""
    if len(plan_steps) >= 7:
        return plan_steps[:7]
    needed = 7 - len(plan_steps)
    padded = list(plan_steps) + _PLAN_REPAIR_STEPS[:needed]
    logger.info(
        "ranker: padded plan_7_days from %d to 7 steps", len(plan_steps)
    )
    return padded


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
        # Contract: 2-3 evidence strings. Repair a lone survivor from
        # market signals; drop the item when nothing honest can be built.
        repaired_ev = _repair_evidence(ev_list, evidence if isinstance(evidence, dict) else {})
        if repaired_ev is None:
            continue
        ev_list = repaired_ev

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
        # Contract: exactly 7 steps. Repair 3-6 step plans with generic,
        # honest final steps (fewer than 3 already dropped the item above).
        plan_steps = _repair_plan(filtered[:7])

        grounded = any(_is_grounded(ev_text, evidence_text) for ev_text in ev_list)
        if not grounded:
            trust = max(0, trust - 15)
        logger.info("ranker: grounded=%s title=%s", grounded, title)

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
