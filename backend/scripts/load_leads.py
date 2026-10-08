"""Load script for POST /api/leads: 50 requests, 10 concurrent, mocked upstreams.

Runs the real FastAPI app in-process over httpx's ASGI transport with fake
LLM + fake SerpAPI seams (no network, no new dependencies). Reports p50/p95
latency, error rate and 429 count, and asserts zero 5xx responses.

Usage (from ``backend/``):
    python scripts/load_leads.py
"""

from __future__ import annotations

import asyncio
import os
import statistics
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault("SERPAPI_KEY", "load-dummy-key")
os.environ.setdefault("ANTHROPIC_API_KEY", "load-dummy-key")
os.environ["LEADS_CACHE_HOURS"] = "0"
os.environ["RATE_LIMIT_LEADS_PER_HOUR"] = "100000"

TOTAL_REQUESTS = 50
CONCURRENCY = 10

OFFERS = [
    "restaurant billing software for dine in restaurants with waiter service and owner reports",
    "gym membership billing with trainer scheduling and attendance tracking for neighbourhood gyms",
    "salon booking app with appointment slots and staff rosters for neighbourhood salons",
]
CITIES = ["Ahmedabad", "Pune", "Jaipur", "Surat", "Vadodara"]


async def _fake_serp(engine: str, **params):
    await asyncio.sleep(0.005)
    if engine == "google_maps":
        return {
            "local_results": [
                {
                    "title": f"Load Diner {params.get('q', '')[:8]}",
                    "address": "MG Road",
                    "rating": 4.2,
                    "reviews": 320,
                    "phone": "+91 98220 12345",
                    "place_id": f"load-{params.get('q', '')[:6]}",
                    "type": "Restaurant",
                }
            ]
        }
    if engine == "google_maps_reviews":
        return {"reviews": [{"snippet": "The bill was wrong"}]}
    if engine == "google":
        return {"organic_results": [{"title": "V", "snippet": "Billing software"}]}
    raise AssertionError(engine)


async def _fake_ask_json(system, user, max_tokens, *, temperature=0.2, label="llm"):
    await asyncio.sleep(0.005)
    if label == "lead_planner":
        return {
            "product_summary": "Restaurant management system",
            "target_customer": "Mid-level restaurants",
            "buyer_roles": ["owner"],
            "maps_queries": [
                "restaurants in Ahmedabad",
                "family restaurants in Ahmedabad",
                "cafes in Ahmedabad",
            ],
            "pain_keywords": ["billing errors", "staff shifts"],
            "competitor_query": "restaurant billing software",
            "pitch_angle": "Cut billing errors",
        }
    if label == "lead_text":
        return {
            "leads": [
                {
                    "id": "lead_0",
                    "why_fit": "Rated 4.2 from 320 reviews.",
                    "pitch_angle": "Cut billing errors.",
                    "suggested_first_question": "How do you bill today?",
                }
            ]
        }
    return {"market_notes": ["Several vendors sell billing software"]}


def _percentile(values: list[float], pct: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    index = min(len(ordered) - 1, max(0, int(pct / 100 * len(ordered))))
    return ordered[index]


async def _main_async() -> int:
    import httpx

    import app.main as main_module
    import app.services.llm as llm_module
    import app.services.serp as serp_module
    from app.config import get_settings

    llm_module.ask_json = _fake_ask_json  # type: ignore[method-assign]
    serp_module.serp = _fake_serp  # type: ignore[method-assign]
    get_settings.cache_clear()
    main_module.reset_rate_limiters()

    semaphore = asyncio.Semaphore(CONCURRENCY)
    transport = httpx.ASGITransport(app=main_module.app)
    statuses: list[int] = []
    latencies: list[float] = []

    async with httpx.AsyncClient(
        transport=transport, base_url="http://testserver", timeout=60.0
    ) as client:

        async def one(index: int) -> None:
            body = {
                "offer": f"{OFFERS[index % len(OFFERS)]} load case {index}",
                "city": CITIES[index % len(CITIES)],
            }
            async with semaphore:
                start = time.perf_counter()
                try:
                    response = await client.post("/api/leads", json=body)
                except Exception:
                    statuses.append(0)
                    latencies.append((time.perf_counter() - start) * 1000.0)
                    return
                latencies.append((time.perf_counter() - start) * 1000.0)
                statuses.append(response.status_code)

        await asyncio.gather(*(one(i) for i in range(TOTAL_REQUESTS)))

    ok = sum(1 for s in statuses if s == 200)
    rate_limited = sum(1 for s in statuses if s == 429)
    server_errors = sum(1 for s in statuses if s >= 500 or s == 0)
    print(
        f"load: n={TOTAL_REQUESTS} concurrency={CONCURRENCY} ok={ok} "
        f"errors={len(statuses) - ok} 429s={rate_limited} 5xx={server_errors}"
    )
    print(
        f"load: p50={_percentile(latencies, 50):.1f}ms "
        f"p95={_percentile(latencies, 95):.1f}ms "
        f"mean={statistics.fmean(latencies):.1f}ms"
    )
    if server_errors:
        print("load: FAIL nonzero 5xx/network errors")
        return 1
    print("load: PASS zero 5xx")
    return 0


def main() -> int:
    return asyncio.run(_main_async())


if __name__ == "__main__":
    raise SystemExit(main())
