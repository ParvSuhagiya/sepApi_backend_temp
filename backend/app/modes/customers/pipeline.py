"""Customer-mode pipeline: plan -> discover -> filter -> research -> score -> text.

Reliability contract:

- Overall deadline (``LEADS_REQUEST_DEADLINE_SECONDS``): on expiry return
  whatever stages finished (HTTP 200 with ``meta.notes: ["deadline_reached"]``
  when at least one lead exists), else the friendly 502.
- Per-request SerpAPI cap is threaded through discovery/research; the day
  sub-budget (``MAX_LEAD_SERP_CALLS_PER_DAY``, sharing the global SerpAPI day
  counter with its own ``serp_leads`` sub-counter) still serves cache hits
  while blocking live calls. ``budget_exhausted`` 429 is returned only when
  nothing could be served.
- Stampede protection: identical concurrent requests (sha256 of the
  normalised offer+city+monthly_price+max_leads) share one in-flight run.
- Optional response cache (``LEADS_CACHE_HOURS``, 0 = off): cache hits
  report ``credits_used == 0``. Cache keys are hashes; values hold only the
  public response (no reviewer personal data, no raw offer text).

Unexpected non-AppError failures are converted to the friendly 502 envelope
(never a 500, never a leak); they are still logged with a traceback.
"""

from __future__ import annotations

import asyncio
import copy
import hashlib
import logging
import re
import threading
import time
from dataclasses import dataclass, field

from app.budget import remaining as _budget_remaining
from app.budget import seconds_until_rollover
from app.budget import try_consume as _budget_consume
from app.config import get_settings
from app.errors import AllSourcesFailed, AppError, BudgetExhausted
from app.modes.customers import discovery as _discovery_mod
from app.modes.customers import planner as _planner_mod
from app.modes.customers import research as _research_mod
from app.modes.customers import ranker as _ranker_mod
from app.modes.customers import scoring as _scoring_mod
from app.modes.customers.schemas import (
    DISCLAIMER,
    Lead,
    LeadPlace,
    LeadsResponse,
    OfferInput,
)
from app.observability_stage import (
    get_timings_ms,
    log_request_summary,
    reset_timings,
    stage,
)
from app.services import serp as _serp_mod
from app.utils import truncate

logger = logging.getLogger(__name__)

__all__ = [
    "LEADS_CACHE_PREFIX",
    "normalise_request_key",
    "reset_leads_state",
    "run_leads",
]

LEADS_CACHE_PREFIX = "leads:"

_BUDGET_EXHAUSTED_MESSAGE = (
    "Our daily search budget is exhausted. Please try again tomorrow."
)

_LOCK = threading.Lock()
# key -> (event loop, future); stale entries from a closed loop are dropped.
_inflight: dict[str, tuple[asyncio.AbstractEventLoop, asyncio.Future]] = {}


@dataclass
class _State:
    """Progressively filled stages; partial assembly reads what's present."""

    plan: object = None
    discovery: object = None
    filtered: list = field(default_factory=list)  # [(LeadPlace, mid_level)]
    research: object = None
    market_notes: list[str] = field(default_factory=list)
    scored: list = field(default_factory=list)  # [(LeadPlace, mid, LeadScore)]
    texts: list = field(default_factory=list)  # [LeadAnnotation]
    notes: list[str] = field(default_factory=list)
    partial: list[str] = field(default_factory=list)


def reset_leads_state() -> None:
    """Drop in-flight stampede entries (used in tests)."""
    with _LOCK:
        _inflight.clear()


def _normalise_text(value: object) -> str:
    lowered = value.casefold() if isinstance(value, str) else ""
    no_punct = re.sub(r"[^\w\s]", "", lowered, flags=re.UNICODE)
    return " ".join(no_punct.split())


def normalise_request_key(
    offer: object, city: object, monthly_price: object, max_leads: object
) -> str:
    """Stable sha256 over normalised offer+city+monthly_price+max_leads."""
    raw = "|".join(
        [
            _normalise_text(offer),
            _normalise_text(city),
            str(monthly_price),
            str(max_leads),
        ]
    )
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _deadline_seconds() -> float:
    try:
        return max(0.0, float(get_settings().leads_request_deadline_seconds))
    except (TypeError, ValueError):
        return 45.0


def _response_cache_hours() -> float:
    try:
        return max(0.0, float(get_settings().leads_cache_hours))
    except (TypeError, ValueError):
        return 0.0


def _sub_budget_limit() -> int:
    try:
        return max(0, int(get_settings().max_lead_serp_calls_per_day))
    except (TypeError, ValueError):
        return 0


def _lead_sub_exhausted() -> bool:
    return _budget_remaining("serp_leads", _sub_budget_limit()) == 0


def _global_serp_exhausted() -> bool:
    try:
        limit = int(get_settings().max_serp_calls_per_day)
    except (TypeError, ValueError):
        limit = 0
    return _budget_remaining("serp", limit) == 0


def _consume_lead_sub_budget(credits: int) -> None:
    limit = _sub_budget_limit()
    try:
        count = max(0, int(credits))
    except (TypeError, ValueError):
        return
    for _ in range(count):
        if not _budget_consume("serp_leads", limit):
            break


def _build_match_reasons(place: LeadPlace, city: str) -> list[str]:
    reasons: list[str] = []
    if place.rating is not None:
        if place.review_count is not None:
            reasons.append(
                f"Rated {place.rating:g} from {place.review_count} reviews on Google Maps"
            )
        else:
            reasons.append(f"Rated {place.rating:g} on Google Maps")
    if place.pain_hits > 0:
        noun = "review" if place.pain_hits == 1 else "reviews"
        reasons.append(f"{place.pain_hits} {noun} mention possible pain points")
    if place.likely_has_software:
        reasons.append(
            "Reviews or website mention existing vendor software (signal, not verified)"
        )
    if not reasons:
        reasons.append(f"Listed on Google Maps in {city}" if city else "Listed on Google Maps")
    return [truncate(reason, 200) for reason in reasons[:3]]


def _stats_snapshot(stats: dict | None) -> tuple[int, int]:
    try:
        credits = max(0, int((stats or {}).get("credits_used", 0)))
    except (TypeError, ValueError):
        credits = 0
    try:
        hits = max(0, int((stats or {}).get("cache_hits", 0)))
    except (TypeError, ValueError):
        hits = 0
    return credits, hits


def _response_dict(
    *,
    offer_summary: str,
    leads: list[dict],
    market_notes: list[str],
    credits: int,
    hits: int,
    partial: list[str],
    notes: list[str],
) -> dict:
    payload = {
        "schema_version": "1.0",
        "offer_summary": truncate(offer_summary, 300),
        "leads": leads,
        "market_notes": list(market_notes)[:5],
        "meta": {
            "credits_used": credits,
            "cache_hits": hits,
            "degraded": [],
            "partial": list(partial),
            "notes": list(notes),
            "timings_ms": get_timings_ms(),
        },
        "disclaimer": DISCLAIMER,
    }
    # Guarantee the response always validates; per-lead drops already applied.
    return LeadsResponse.model_validate(payload).model_dump(mode="json")


def _assemble_leads(state: _State, city: str) -> list[dict]:
    leads: list[dict] = []
    annotations = list(state.texts)
    for index, (place, _mid, result) in enumerate(state.scored):
        annotation = annotations[index] if index < len(annotations) else None
        try:
            snippets = list(place.pain_snippets)[:3]
            lead = Lead.model_validate(
                {
                    "name": place.name,
                    "address": place.address,
                    "rating": place.rating,
                    "user_ratings_total": place.review_count,
                    "business_type": place.type,
                    "match_score": result.score,
                    "match_reasons": _build_match_reasons(place, city),
                    "research_notes": "; ".join(snippets)[:500] or None,
                    "why_fit": getattr(annotation, "why_fit", None) or None,
                    "pitch_angle": getattr(annotation, "pitch_angle", None) or None,
                    "suggested_first_question": getattr(annotation, "suggested_first_question", None)
                    or None,
                }
            )
        except Exception:
            logger.warning("leads: dropping lead that fails response validation")
            continue
        leads.append(lead.model_dump(mode="json"))
    return leads


async def _run_inner(
    input: OfferInput, state: _State, stats: dict | None
) -> dict:
    offer, city = input.offer, input.city
    blocked = _lead_sub_exhausted()

    with stage("plan"):
        plan = await _planner_mod.plan_leads(offer, city)
        state.plan = plan

    with stage("discover"):
        try:
            discovery = await _discovery_mod.discover(plan)
        except AllSourcesFailed:
            if blocked or _global_serp_exhausted():
                raise BudgetExhausted(
                    _BUDGET_EXHAUSTED_MESSAGE,
                    retry_after=seconds_until_rollover(),
                ) from None
            raise
        state.discovery = discovery
        if discovery.maps_partial:
            state.partial.append("maps")

    ranked = sorted(
        (
            (place, _scoring_mod.mid_level_signal(place))
            for place in discovery.places
        ),
        key=lambda pair: pair[1],
        reverse=True,
    )
    state.filtered = [(place, mid) for place, mid in ranked if mid > 0]
    if not state.filtered:
        if blocked or _global_serp_exhausted():
            raise BudgetExhausted(
                _BUDGET_EXHAUSTED_MESSAGE,
                retry_after=seconds_until_rollover(),
            )
        credits, hits = _stats_snapshot(stats)
        notes = list(state.notes) + ["no_matching_businesses"]
        return _response_dict(
            offer_summary=plan.product_summary,
            leads=[],
            market_notes=[],
            credits=credits,
            hits=hits,
            partial=list(state.partial),
            notes=notes,
        )

    try:
        top_n = int(get_settings().lead_research_top_n)
    except (TypeError, ValueError):
        top_n = 5
    top_n = max(0, min(top_n, 8, input.max_leads, len(state.filtered)))

    with stage("research"):
        research = await _research_mod.research_leads(
            [place for place, _mid in state.filtered],
            plan,
            monthly_price=input.monthly_price,
            calls_used=discovery.queries_run,
            top_n=top_n,
        )
        state.research = research
        state.market_notes = list(research.market_notes)
        for note in research.notes:
            if note not in state.notes:
                state.notes.append(note)
        if any(lead.research == "partial" for lead in research.leads):
            if "reviews" not in state.partial:
                state.partial.append("reviews")

    with stage("score"):
        scored = []
        for place, mid in zip(research.leads, [mid for _, mid in state.filtered]):
            result = _scoring_mod.lead_score(
                mid_level=mid,
                pain_hits=place.pain_hits,
                has_phone=bool(place.phone),
                has_website=bool(place.website),
                likely_has_software=place.likely_has_software,
                research=place.research,
            )
            scored.append((place, mid, result))
        scored.sort(key=lambda triple: triple[2].score, reverse=True)
        state.scored = scored[: input.max_leads]

    with stage("text"):
        items = [
            {"place": place, "mid_level": mid, "score": result.score}
            for place, mid, result in state.scored[: _ranker_mod.MAX_EXPLAIN_LEADS]
        ]
        texts, ai_fallback = await _ranker_mod.explain_leads(
            items,
            city=city,
            default_pitch=plan.pitch_angle,
            pains=list(plan.pain_keywords),
        )
        state.texts = texts
        if ai_fallback and "ai_text_fallback" not in state.notes:
            state.notes.append("ai_text_fallback")

    credits, hits = _stats_snapshot(stats)
    leads = _assemble_leads(state, city)
    if not leads:
        raise AllSourcesFailed()
    return _response_dict(
        offer_summary=plan.product_summary,
        leads=leads,
        market_notes=state.market_notes,
        credits=credits,
        hits=hits,
        partial=list(state.partial),
        notes=list(state.notes),
    )


def _assemble_partial(state: _State, input: OfferInput, stats: dict | None) -> dict:
    """Deadline path: score finished stages with deterministic text only."""
    city = input.city
    if state.scored:
        scored = state.scored
    elif state.filtered:
        scored = [
            (
                place,
                mid,
                _scoring_mod.lead_score(
                    mid_level=mid,
                    pain_hits=0,
                    has_phone=bool(place.phone),
                    has_website=bool(place.website),
                    likely_has_software=False,
                    research="pending",
                ),
            )
            for place, mid in state.filtered[: input.max_leads]
        ]
        scored.sort(key=lambda triple: triple[2].score, reverse=True)
        state.scored = scored
    else:
        raise AllSourcesFailed()
    state.texts = [
        _ranker_mod.deterministic_annotation(
            place,
            city=city,
            default_pitch=state.plan.pitch_angle
            if state.plan is not None
            else "",
            pains=list(state.plan.pain_keywords) if state.plan is not None else [],
        )
        for place, _mid, _result in state.scored
    ]
    if "reviews" not in state.partial:
        state.partial.append("reviews")
    notes = list(state.notes) + ["deadline_reached"]
    credits, hits = _stats_snapshot(stats)
    leads = _assemble_leads(state, city)
    if not leads:
        raise AllSourcesFailed()
    summary = state.plan.product_summary if state.plan is not None else input.offer[:300]
    return _response_dict(
        offer_summary=summary,
        leads=leads,
        market_notes=list(state.market_notes),
        credits=credits,
        hits=hits,
        partial=list(state.partial),
        notes=notes,
    )


async def _run_owned(input: OfferInput, *, request_id: str | None = None) -> dict:
    stats = _serp_mod.new_request_stats()
    reset_timings()
    state = _State()
    blocked = _lead_sub_exhausted()
    if blocked and "day_budget_exhausted" not in state.notes:
        state.notes.append("day_budget_exhausted")
    token = _serp_mod.leads_live_blocked.set(blocked)
    outcome = "ok"
    try:
        try:
            async with asyncio.timeout(_deadline_seconds()):
                return await _run_inner(input, state, stats)
        except TimeoutError:
            outcome = "partial"
            try:
                return _assemble_partial(state, input, stats)
            except AllSourcesFailed:
                outcome = "error"
                raise
        except AppError:
            outcome = "error"
            raise
        except Exception:
            outcome = "error"
            logger.exception("leads: unexpected pipeline failure")
            raise AllSourcesFailed() from None
    finally:
        credits, hits = _stats_snapshot(stats)
        _consume_lead_sub_budget(credits)
        _serp_mod.leads_live_blocked.reset(token)
        log_request_summary(
            mode="customers",
            credits_used=credits,
            cache_hits=hits,
            degraded=[],
            partial=list(state.partial),
            outcome=outcome,
        )


async def run_leads(input: OfferInput, *, request_id: str | None = None) -> dict:
    """Run the customer pipeline with response cache + stampede sharing."""
    key = LEADS_CACHE_PREFIX + normalise_request_key(
        input.offer, input.city, input.monthly_price, input.max_leads
    )
    if _response_cache_hours() > 0:
        cached = await asyncio.to_thread(_serp_mod.leads_cache_get, key)
        if isinstance(cached, dict):
            payload = copy.deepcopy(cached)
            try:
                meta = payload.get("meta")
                if isinstance(meta, dict):
                    meta["credits_used"] = 0
                    meta["cache_hits"] = 0
                    notes = meta.get("notes")
                    if not isinstance(notes, list):
                        notes = []
                    if "response_cache_hit" not in notes:
                        notes.append("response_cache_hit")
                    meta["notes"] = notes
            except Exception:
                pass
            return payload

    loop = asyncio.get_running_loop()
    with _LOCK:
        existing = _inflight.get(key)
        if existing is not None and (existing[0] is not loop or existing[1].done()):
            existing = None
        if existing is None:
            future: asyncio.Future = loop.create_future()
            future.add_done_callback(_silence_unretrieved)
            _inflight[key] = (loop, future)
            owner = True
        else:
            future = existing[1]
            owner = False
    if not owner:
        return await asyncio.shield(future)

    try:
        payload = await _run_owned(input, request_id=request_id)
    except BaseException as exc:
        if not future.done():
            try:
                future.set_exception(exc)
            except asyncio.InvalidStateError:
                pass
        raise
    finally:
        with _LOCK:
            if _inflight.get(key, (None, None))[1] is future:
                _inflight.pop(key, None)
    if _response_cache_hours() > 0:
        try:
            await asyncio.to_thread(
                _serp_mod.leads_cache_set, key, payload, _response_cache_hours() * 3600.0
            )
        except Exception:
            logger.warning("leads: response cache store failed")
    if not future.done():
        future.set_result(payload)
    return payload


def _silence_unretrieved(future: asyncio.Future) -> None:
    try:
        if not future.cancelled():
            future.exception()
    except Exception:
        pass
