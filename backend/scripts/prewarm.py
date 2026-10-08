"""Prewarm the SerpAPI SQLite cache for one or more user profiles.

Usage:
    python -m scripts.prewarm [profiles.json]

Default profile when no file is given:
    {"skills": "Python basics, Excel", "city": "Ahmedabad", "hours": 10, "budget": 0}

The JSON file must contain a list of profile objects with
skills/city/hours/budget keys. Per profile the script prints credits_used,
cache_hits, opportunity count, degraded sources and wall time, and continues
on per-profile errors. Run the same command twice: the second run must show
0 credits because every SerpAPI response is served from cache.
"""

from __future__ import annotations

import asyncio
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

DEFAULT_PROFILES = [
    {"skills": "Python basics, Excel", "city": "Ahmedabad", "hours": 10, "budget": 0}
]


def load_profiles(path: str | None) -> list[dict]:
    if not path:
        return list(DEFAULT_PROFILES)
    with open(path, encoding="utf-8") as fh:
        data = json.load(fh)
    if isinstance(data, dict):
        return [data]
    if isinstance(data, list):
        return data
    raise ValueError("profiles file must contain an object or a list of objects")


async def prewarm_one(profile_data: dict) -> dict:
    from app.schemas import Profile
    from app.services.pipeline import run_search

    profile = Profile.model_validate(profile_data)
    start = time.perf_counter()
    try:
        result = await run_search(profile)
        wall_ms = int((time.perf_counter() - start) * 1000)
        return {
            "ok": True,
            "profile": profile_data,
            "credits_used": result["stats"]["credits_used"],
            "cache_hits": result["stats"]["cache_hits"],
            "opportunities": len(result["opportunities"]),
            "degraded": result["meta"]["degraded"],
            "wall_ms": wall_ms,
        }
    except Exception as exc:
        wall_ms = int((time.perf_counter() - start) * 1000)
        return {
            "ok": False,
            "profile": profile_data,
            "error": f"{type(exc).__name__}",
            "wall_ms": wall_ms,
        }


async def _main_async(profiles: list[dict]) -> int:
    from app.services.serp import close_serp, init_cache, init_serp

    init_cache()
    await init_serp()
    try:
        failures = 0
        for item in profiles:
            summary = await prewarm_one(item)
            if summary["ok"]:
                print(
                    "profile skills={skills!r} city={city!r} "
                    "credits_used={credits} cache_hits={hits} "
                    "opportunities={opps} degraded={degraded} wall_ms={ms}".format(
                        skills=item.get("skills"),
                        city=item.get("city"),
                        credits=summary["credits_used"],
                        hits=summary["cache_hits"],
                        opps=summary["opportunities"],
                        degraded=",".join(summary["degraded"]) or "-",
                        ms=summary["wall_ms"],
                    )
                )
            else:
                failures += 1
                print(
                    "profile skills={skills!r} city={city!r} ERROR={error} wall_ms={ms}".format(
                        skills=item.get("skills"),
                        city=item.get("city"),
                        error=summary["error"],
                        ms=summary["wall_ms"],
                    )
                )
        return 1 if failures else 0
    finally:
        await close_serp()


def main(argv: list[str] | None = None) -> int:
    args = list(sys.argv[1:] if argv is None else argv)
    if args and args[0] in ("-h", "--help"):
        print(__doc__)
        return 0
    path = args[0] if args else None
    try:
        profiles = load_profiles(path)
    except Exception as exc:
        print(f"could not load profiles file: {exc}")
        return 2
    if not profiles:
        print("no profiles to prewarm")
        return 2
    try:
        return asyncio.run(_main_async(profiles))
    except RuntimeError as exc:
        print(f"cannot start: {exc}")
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
