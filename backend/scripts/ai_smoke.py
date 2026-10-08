"""Live AI smoke test: planner + ranker on a built-in evidence sample.

Needs a real ANTHROPIC_API_KEY. Makes NO SerpAPI calls. Skips gracefully
(exit 0) when the key is missing. Never prints the key.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

logger = logging.getLogger("ai_smoke")

GUARANTEE_PHRASES = ("guaranteed", "100% sure", "risk-free", "assured income", "easy money")


def _evidence_sample() -> dict:
    return {
        "market_signals": {
            "job_count": 3,
            "high_risk_job_count": 0,
            "medium_risk_job_count": 1,
            "local_business_count": 2,
            "avg_local_rating": 4.3,
            "best_trend_growth_percent": 18,
            "forum_result_count": 2,
        },
        "jobs": [
            {
                "title": "Tailor needed",
                "company": "ABC Boutique",
                "location": "Pune",
                "via": "",
                "salary": "Rs 12,000 per month",
                "desc": "Stitching and alteration work in Pune for a boutique",
                "flags": [],
                "risk": "Low",
            }
        ],
        "local_businesses": [
            {"name": "Sharma Tailoring", "rating": 4.5, "reviews": 120,
             "address": "MG Road Pune", "type": "Tailor"},
            {"name": "City Boutique", "rating": 4.1, "reviews": 45,
             "address": "FC Road Pune", "type": "Boutique"},
        ],
        "trend_growth_percent_12m": {"tailoring": 18},
        "forum_snippets": [
            {"title": "Tailoring earnings Pune",
             "snippet": "Tailors in Pune earn steady rates for alterations"},
            {"title": "Boutique rates", "snippet": "Pune boutiques pay per piece"},
        ],
        "unavailable_sources": [],
    }


async def _run() -> int:
    from app.errors import LLMError
    from app.schemas import Profile
    from app.services import llm as llm_module
    from app.services.planner import make_plan
    from app.services.ranker import rank
    from app.services.scoring import rank_opportunities

    profile = Profile(skills="tailoring, stitching", city="Pune", hours=10, budget=0)
    evidence = _evidence_sample()

    results: dict = {"planner_json_ok": False, "ranker_json_ok": False}
    t0 = time.perf_counter()
    try:
        plan, used_fallback = await make_plan(profile)
        results["planner_json_ok"] = True
        results["planner"] = {
            "job_queries": plan.job_queries,
            "local_queries": plan.local_queries,
            "trend_keywords": plan.trend_keywords,
            "forum_query": plan.forum_query,
            "used_fallback": used_fallback,
        }
    except LLMError as exc:
        results["planner_error"] = type(exc).__name__

    opps: list = []
    try:
        opps = await rank(profile, evidence)
        results["ranker_json_ok"] = True
    except LLMError as exc:
        results["ranker_error"] = type(exc).__name__
    latency_ms = int((time.perf_counter() - t0) * 1000)

    signals = {**evidence["market_signals"], "budget": profile.budget}
    ranked = rank_opportunities(opps, signals, []) if opps else []
    usage = llm_module.llm_lifetime_stats()

    print("planner JSON parsed:", results["planner_json_ok"])
    if "planner" in results:
        print("planner used_fallback:", results["planner"]["used_fallback"])
    print("ranker JSON parsed:", results["ranker_json_ok"])
    print("valid opportunities:", len(ranked))
    print("EarnScores:", [o.get("earn_score") for o in ranked])
    print("token usage:", usage)
    print("latency_ms:", latency_ms)

    checks = []
    checks.append(("opportunities returned", len(ranked) > 0))
    all_int = all(
        isinstance(o.get(k), int) and 0 <= o.get(k) <= 100
        for o in ranked
        for k in ("demand", "competition", "fit", "cost_ease", "trust")
    )
    checks.append(("all sub-scores ints 0-100", all_int))
    checks.append(("7-day plans present", all(len(o.get("plan_7_days", [])) >= 3 for o in ranked)))
    checks.append((
        "every income_estimate contains 'estimate'",
        all("estimate" in str(o.get("income_estimate", "")).lower() for o in ranked),
    ))
    blob = json.dumps(ranked).lower()
    checks.append((
        "no guarantee language",
        not any(phrase in blob for phrase in GUARANTEE_PHRASES),
    ))
    print("PASS/FAIL checklist:")
    for name, ok in checks:
        print(f"  [{'PASS' if ok else 'FAIL'}] {name}")
    return 0 if all(ok for _, ok in checks) else 1


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    if not os.getenv("ANTHROPIC_API_KEY"):
        print("SKIP: ANTHROPIC_API_KEY is not set; live AI smoke test needs a real key.")
        return 0
    try:
        return asyncio.run(_run())
    except Exception as exc:
        print(f"smoke error: {type(exc).__name__}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
