"""Deterministic EarnScore computation and sanity guardrails."""

from __future__ import annotations

import copy
import logging

from app.utils import clamp_int

logger = logging.getLogger(__name__)

__all__ = [
    "W_DEMAND",
    "W_FIT",
    "W_TRUST",
    "W_LOW_COMPETITION",
    "W_COST_EASE",
    "W_SIGNAL_TREND",
    "W_SIGNAL_JOBS",
    "W_SIGNAL_FORUM",
    "W_SIGNAL_LISTINGS",
    "W_SIGNAL_RATING",
    "W_AI_BLEND",
    "TRUST_HIGH_RISK_SHARE_PENALTY",
    "earn_score",
    "score_breakdown",
    "signal_demand",
    "signal_competition",
    "apply_guardrails",
    "rank_opportunities",
]

W_DEMAND = 0.30
W_FIT = 0.20
W_TRUST = 0.20
W_LOW_COMPETITION = 0.15
W_COST_EASE = 0.15

# Deterministic signal blends (documented weights, all 0-100 inputs/outputs).
W_SIGNAL_TREND = 0.50
W_SIGNAL_JOBS = 0.30
W_SIGNAL_FORUM = 0.20
W_SIGNAL_LISTINGS = 0.50
W_SIGNAL_RATING = 0.50
# Final demand/competition = W_AI_BLEND * AI + (1 - W_AI_BLEND) * signal.
W_AI_BLEND = 0.50
# Trust penalty per share of High-risk jobs (for type "job" items).
TRUST_HIGH_RISK_SHARE_PENALTY = 15


def _get(o: object, key: str, default: object = None) -> object:
    if isinstance(o, dict):
        return o.get(key, default)
    return getattr(o, key, default) if hasattr(o, key) else default


def _clamped(o: object, key: str) -> int:
    return clamp_int(_get(o, key), 0, 100, 50)


def earn_score(o) -> int:
    """Weighted score rounded to int; inputs clamped to 0-100."""
    demand = _clamped(o, "demand")
    fit = _clamped(o, "fit")
    trust = _clamped(o, "trust")
    competition = _clamped(o, "competition")
    cost_ease = _clamped(o, "cost_ease")
    value = (
        W_DEMAND * demand
        + W_FIT * fit
        + W_TRUST * trust
        + W_LOW_COMPETITION * (100 - competition)
        + W_COST_EASE * cost_ease
    )
    return int(round(value))


def score_breakdown(o, extras: dict | None = None) -> dict[str, float]:
    """Weighted contributions rounded to 1 decimal, plus optional extras.

    The five contribution keys are stable for API compatibility; ``extras``
    carries transparency fields (ai/signal/final values) untouched.
    """
    demand = _clamped(o, "demand")
    fit = _clamped(o, "fit")
    trust = _clamped(o, "trust")
    competition = _clamped(o, "competition")
    cost_ease = _clamped(o, "cost_ease")
    breakdown = {
        "demand": round(W_DEMAND * demand, 1),
        "fit": round(W_FIT * fit, 1),
        "trust": round(W_TRUST * trust, 1),
        "low_competition": round(W_LOW_COMPETITION * (100 - competition), 1),
        "cost_ease": round(W_COST_EASE * cost_ease, 1),
    }
    if extras:
        breakdown.update(extras)
    return breakdown


def _signal_int(signals: object, key: str, default: int = 0) -> int:
    value = _signals_get(signals, key, default)
    if isinstance(value, bool):
        return default
    try:
        number = float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError, OverflowError):
        return default
    if number != number or number in (float("inf"), float("-inf")):  # NaN/inf
        return default
    return int(number)


def signal_demand(signals: object) -> int:
    """Deterministic 0-100 demand signal from collected evidence.

    Blends capped 12-month trend growth (50%), job-listing volume with 10
    points per listing up to 100 (30%), and forum-result volume with 25 points
    per discussion up to 100 (20%).
    """
    growth = _signal_int(signals, "best_trend_growth_percent", 0)
    growth_capped = max(0, min(100, growth))
    jobs = _signal_int(signals, "job_count", 0)
    jobs_score = max(0, min(100, jobs * 10))
    forum = _signal_int(signals, "forum_result_count", 0)
    forum_score = max(0, min(100, forum * 25))
    value = (
        W_SIGNAL_TREND * growth_capped
        + W_SIGNAL_JOBS * jobs_score
        + W_SIGNAL_FORUM * forum_score
    )
    return max(0, min(100, int(round(value))))


def signal_competition(signals: object) -> int:
    """Deterministic 0-100 competition signal from Maps evidence.

    Blends listing volume with 20 points per business up to 100 (50%) and the
    average rating scaled to 0-100 (50%; neutral 50 when unrated). More and
    better-rated nearby businesses mean a more crowded market. With no local
    evidence at all the signal is neutral (50).
    """
    count = _signal_int(signals, "local_business_count", 0)
    rating_raw = _signals_get(signals, "avg_local_rating", None)
    rating: float | None = None
    if not isinstance(rating_raw, bool) and rating_raw is not None:
        try:
            candidate = float(rating_raw)  # type: ignore[arg-type]
        except (TypeError, ValueError, OverflowError):
            candidate = float("nan")
        if candidate == candidate and candidate not in (float("inf"), float("-inf")):
            rating = max(0.0, min(5.0, candidate))
    if count <= 0 and rating is None:
        return 50
    listings_score = max(0, min(100, count * 20))
    rating_score = (rating / 5.0 * 100.0) if rating is not None else 50.0
    value = W_SIGNAL_LISTINGS * listings_score + W_SIGNAL_RATING * rating_score
    return max(0, min(100, int(round(value))))


def _signals_get(signals: object, key: str, default: object = None) -> object:
    if isinstance(signals, dict):
        return signals.get(key, default)
    return getattr(signals, key, default) if hasattr(signals, key) else default


def _all_jobs_high_risk(signals: object) -> bool:
    job_count = _signals_get(signals, "job_count")
    try:
        count = int(job_count) if job_count is not None else 0
    except (TypeError, ValueError):
        count = 0
    if count <= 0:
        return False
    jobs = _signals_get(signals, "jobs")
    if isinstance(jobs, list) and jobs:
        for job in jobs:
            risk = job.get("risk") if isinstance(job, dict) else getattr(job, "risk", None)
            if risk != "High":
                return False
        return True
    high = _signals_get(signals, "high_risk_job_count")
    try:
        high_count = int(high) if high is not None else None
    except (TypeError, ValueError):
        high_count = None
    if high_count is not None:
        return high_count == count
    return False


def apply_guardrails(opps: list[dict], signals: dict, degraded: list[str]) -> list[dict]:
    """Cap values downwards per deterministic rules; never mutates inputs.

    Every intervention is recorded in the public ``adjustments`` list with
    user-friendly wording so the UI can show how a score was built.
    """
    degraded_list = list(degraded) if isinstance(degraded, list) else []
    out: list[dict] = []
    for opp in opps or []:
        item = dict(opp) if isinstance(opp, dict) else {}
        adjustments: list[str] = []

        demand = _clamped(item, "demand")
        trust = _clamped(item, "trust")
        fit = _clamped(item, "fit")
        cost_ease = _clamped(item, "cost_ease")
        item["demand"] = demand
        item["trust"] = trust
        item["fit"] = fit
        item["cost_ease"] = cost_ease
        item["competition"] = _clamped(item, "competition")

        # 1. All main sources unavailable.
        if all(source in degraded_list for source in ("jobs", "maps", "trends")):
            if item["demand"] > 50:
                item["demand"] = 50
            if item["trust"] > 60:
                item["trust"] = 60
            msg = (
                "Demand capped at 50 and Trust capped at 60: "
                "all main data sources were unavailable"
            )
            logger.info("guardrail: %s", msg)
            adjustments.append(msg)

        # 2. No market evidence.
        job_count_n = _signal_int(signals, "job_count", 0)
        local_count_n = _signal_int(signals, "local_business_count", 0)
        best = _signals_get(signals, "best_trend_growth_percent")
        no_growth = best is None
        if not no_growth:
            try:
                no_growth = float(best) <= 0  # type: ignore[arg-type]
            except (TypeError, ValueError):
                no_growth = True
        if job_count_n == 0 and local_count_n == 0 and no_growth:
            if item["demand"] > 55:
                item["demand"] = 55
            msg = (
                "Demand capped at 55: "
                "no jobs, local businesses, or trend growth found"
            )
            logger.info("guardrail: %s", msg)
            adjustments.append(msg)

        # 3. Every job High risk and item is a job.
        if _all_jobs_high_risk(signals) and item.get("type") == "job":
            if item["trust"] > 40:
                item["trust"] = 40
            msg = "Trust capped at 40: all matching jobs show scam signals"
            logger.info("guardrail: %s", msg)
            adjustments.append(msg)

        # 4. Zero budget but costly to start.
        budget = _signals_get(signals, "budget")
        try:
            budget_n = int(budget) if budget is not None else None
        except (TypeError, ValueError):
            budget_n = None
        if budget_n == 0 and item["cost_ease"] < 40:
            if item["fit"] > 60:
                item["fit"] = 60
            msg = "Fit capped at 60: this idea costs money to start but your budget is 0"
            logger.info("guardrail: %s", msg)
            adjustments.append(msg)

        # 5. Trust floor from scam signals: job-type items lose trust in
        # proportion to the share of High-risk matching jobs.
        high_n = _signal_int(signals, "high_risk_job_count", 0)
        if item.get("type") == "job" and high_n > 0 and job_count_n > 0:
            share = min(1.0, high_n / job_count_n)
            penalty = int(round(TRUST_HIGH_RISK_SHARE_PENALTY * share))
            if penalty > 0 and item["trust"] > 0:
                item["trust"] = max(0, item["trust"] - penalty)
                msg = (
                    f"Trust lowered by {penalty}: "
                    f"{high_n} of {job_count_n} matching jobs show high scam risk"
                )
                logger.info("guardrail: %s", msg)
                adjustments.append(msg)

        item["adjustments"] = adjustments
        out.append(item)
    return out


def _score_mode() -> str:
    try:
        from app.config import get_settings

        mode = str(get_settings().score_mode or "").strip().lower()
    except Exception:
        return "blend"
    return "ai" if mode == "ai" else "blend"


def rank_opportunities(opps, signals, degraded) -> list[dict]:
    """Apply guardrails, blend deterministic signals, score, stable-sort desc.

    In ``blend`` mode (default) final demand/competition are 50% AI value +
    50% deterministic signal; in ``ai`` mode the AI values stand. The
    ai/signal/final triple is exposed inside ``score_breakdown`` extras while
    the five contribution keys keep their exact meaning.
    """
    mode = _score_mode()
    demand_signal = signal_demand(signals)
    competition_signal = signal_competition(signals)
    guarded = apply_guardrails(opps, signals, degraded)
    for item in guarded:
        ai_demand = _clamped(item, "demand")
        ai_competition = _clamped(item, "competition")
        if mode == "blend":
            final_demand = clamp_int(
                round(W_AI_BLEND * ai_demand + (1 - W_AI_BLEND) * demand_signal),
                0, 100, ai_demand,
            )
            final_competition = clamp_int(
                round(W_AI_BLEND * ai_competition + (1 - W_AI_BLEND) * competition_signal),
                0, 100, ai_competition,
            )
        else:
            final_demand = ai_demand
            final_competition = ai_competition
        item["demand"] = final_demand
        item["competition"] = final_competition
        extras = {
            "demand_ai": float(ai_demand),
            "demand_signal": float(demand_signal),
            "demand_final": float(final_demand),
            "competition_ai": float(ai_competition),
            "competition_signal": float(competition_signal),
            "competition_final": float(final_competition),
        }
        item["earn_score"] = earn_score(item)
        item["score_breakdown"] = score_breakdown(item, extras)
    return sorted(guarded, key=lambda o: o.get("earn_score", 0), reverse=True)
