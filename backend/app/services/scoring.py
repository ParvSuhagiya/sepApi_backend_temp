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
    "earn_score",
    "score_breakdown",
    "apply_guardrails",
    "rank_opportunities",
]

W_DEMAND = 0.30
W_FIT = 0.20
W_TRUST = 0.20
W_LOW_COMPETITION = 0.15
W_COST_EASE = 0.15


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


def score_breakdown(o) -> dict[str, float]:
    """Weighted contributions rounded to 1 decimal."""
    demand = _clamped(o, "demand")
    fit = _clamped(o, "fit")
    trust = _clamped(o, "trust")
    competition = _clamped(o, "competition")
    cost_ease = _clamped(o, "cost_ease")
    return {
        "demand": round(W_DEMAND * demand, 1),
        "fit": round(W_FIT * fit, 1),
        "trust": round(W_TRUST * trust, 1),
        "low_competition": round(W_LOW_COMPETITION * (100 - competition), 1),
        "cost_ease": round(W_COST_EASE * cost_ease, 1),
    }


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
    """Cap values downwards per deterministic rules; never mutates inputs."""
    degraded_list = list(degraded) if isinstance(degraded, list) else []
    out: list[dict] = []
    for opp in opps or []:
        item = dict(opp) if isinstance(opp, dict) else {}
        guardrails: list[str] = []

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
            msg = "capped demand at 50 and trust at 60: all main sources degraded"
            logger.info("guardrail: %s", msg)
            guardrails.append(msg)

        # 2. No market evidence.
        job_count = _signals_get(signals, "job_count", 0)
        local_count = _signals_get(signals, "local_business_count", 0)
        try:
            job_count_n = int(job_count) if job_count is not None else 0
        except (TypeError, ValueError):
            job_count_n = 0
        try:
            local_count_n = int(local_count) if local_count is not None else 0
        except (TypeError, ValueError):
            local_count_n = 0
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
            msg = "capped demand at 55: no jobs, local businesses, or trend growth"
            logger.info("guardrail: %s", msg)
            guardrails.append(msg)

        # 3. Every job High risk and item is a job.
        if _all_jobs_high_risk(signals) and item.get("type") == "job":
            if item["trust"] > 40:
                item["trust"] = 40
            msg = "capped trust at 40: all jobs high risk"
            logger.info("guardrail: %s", msg)
            guardrails.append(msg)

        # 4. Zero budget but costly to start.
        budget = _signals_get(signals, "budget")
        try:
            budget_n = int(budget) if budget is not None else None
        except (TypeError, ValueError):
            budget_n = None
        if budget_n == 0 and item["cost_ease"] < 40:
            if item["fit"] > 60:
                item["fit"] = 60
            msg = "high start cost for zero budget: capped fit at 60"
            logger.info("guardrail: %s", msg)
            guardrails.append(msg)

        item["guardrails"] = guardrails
        out.append(item)
    return out


def rank_opportunities(opps, signals, degraded) -> list[dict]:
    """Apply guardrails, score, stable-sort by earn_score desc, strip internals."""
    guarded = apply_guardrails(opps, signals, degraded)
    for item in guarded:
        item["earn_score"] = earn_score(item)
        item["score_breakdown"] = score_breakdown(item)
    ranked = sorted(guarded, key=lambda o: o.get("earn_score", 0), reverse=True)
    for item in ranked:
        item.pop("guardrails", None)
    return ranked
