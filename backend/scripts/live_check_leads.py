"""Live check for POST /api/leads (real SerpAPI + real LLM).

Gated by ``RUN_LIVE=1`` with ``SERPAPI_KEY`` and ``ANTHROPIC_API_KEY`` set;
otherwise prints SKIP and exits 0. Runs the restaurant example for
Ahmedabad, prints the lead count, leads with phone, credits used, and
verifies a repeat run costs 0 credits (SerpAPI cache; the response cache is
disabled here so the SerpAPI layer is what gets exercised). Never prints
keys or raw upstream bodies.

Usage (from ``backend/``):
    RUN_LIVE=1 python scripts/live_check_leads.py
"""

from __future__ import annotations

import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ["LEADS_CACHE_HOURS"] = "0"

RESTAURANT_OFFER = (
    "i am a devops engineer and i have made a restaurant management system: "
    "manager assigns customers, waiter takes order, cook prepares food, "
    "waiter serves, manager handles bills. 800 rupees/month. "
    "target mid level restaurants that have waiter, manager, cook"
)


def _gated() -> bool:
    if os.getenv("RUN_LIVE") != "1":
        return False
    return bool(os.getenv("SERPAPI_KEY") and os.getenv("ANTHROPIC_API_KEY"))


async def _main_async() -> int:
    from app.modes.customers.pipeline import reset_leads_state, run_leads
    from app.modes.customers.schemas import OfferInput
    from app.services.serp import close_serp, init_cache, init_serp

    init_cache()
    await init_serp()
    try:
        reset_leads_state()
        first = await run_leads(
            OfferInput.model_validate(
                {"offer": RESTAURANT_OFFER, "city": "Ahmedabad", "monthly_price": 800}
            )
        )
        leads = first.get("leads", [])
        with_phone = sum(1 for lead in leads if lead.get("phone"))
        credits = first.get("meta", {}).get("credits_used", -1)
        print(
            f"live: leads={len(leads)} with_phone={with_phone} credits_used={credits}"
        )
        print(f"live: disclaimer={first.get('disclaimer', '')[:60]}")

        reset_leads_state()
        repeat = await run_leads(
            OfferInput.model_validate(
                {"offer": RESTAURANT_OFFER, "city": "Ahmedabad", "monthly_price": 800}
            )
        )
        repeat_credits = repeat.get("meta", {}).get("credits_used", -1)
        print(f"live: repeat credits_used={repeat_credits}")
        if repeat_credits != 0:
            print("live: FAIL repeat run cost credits (expected 0)")
            return 1
        print("live: PASS")
        return 0
    finally:
        await close_serp()


def main() -> int:
    if not _gated():
        print("live: SKIP (set RUN_LIVE=1 with SERPAPI_KEY and ANTHROPIC_API_KEY)")
        return 0
    try:
        return asyncio.run(_main_async())
    except Exception as exc:
        print(f"live: ERROR {type(exc).__name__}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
