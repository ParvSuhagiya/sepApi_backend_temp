"""Prewarm the SerpAPI SQLite cache for one or more user profiles.

Usage:
    python -m scripts.prewarm [profiles.json]

Default profiles when no file is given: three representative low-budget
profiles plus the demo profile (the PRD personas were not available in the
repo, so these stand-ins cover the same shapes: zero-budget services, a small
budget, and food work):

    {"skills": "Python basics, Excel", "city": "Ahmedabad", "hours": 10, "budget": 0}
    {"skills": "tailoring, stitching", "city": "Pune", "hours": 12, "budget": 0}
    {"skills": "cooking, tiffin service", "city": "Mumbai", "hours": 20, "budget": 2000}
    {"skills": "delivery, driving", "city": "Ahmedabad", "hours": 15, "budget": 0}

The JSON file must contain a list of profile objects with
skills/city/hours/budget keys. Per profile the script prints credits_used,
cache_hits, opportunity count, degraded sources and wall time, and continues
on per-profile errors.

Demo readiness check: after warming, the script verifies that across all
profiles at least one High-risk job was seen (Scam Shield demo), at least one
place has a phone (WhatsApp demo), trend data is present, and that re-running
the demo profile costs 0 credits (fully cached). It exits non-zero when the
demo path is not ready.
"""

from __future__ import annotations

import asyncio
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

DEFAULT_PROFILES = [
    {"skills": "Python basics, Excel", "city": "Ahmedabad", "hours": 10, "budget": 0},
    {"skills": "tailoring, stitching", "city": "Pune", "hours": 12, "budget": 0},
    {"skills": "cooking, tiffin service", "city": "Mumbai", "hours": 20, "budget": 2000},
    {"skills": "delivery, driving", "city": "Ahmedabad", "hours": 15, "budget": 0},
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
            "result": result,
        }
    except Exception as exc:
        wall_ms = int((time.perf_counter() - start) * 1000)
        return {
            "ok": False,
            "profile": profile_data,
            "error": f"{type(exc).__name__}",
            "wall_ms": wall_ms,
        }


def _demo_readiness(summaries: list[dict]) -> tuple[bool, list[str]]:
    """Check the demo path across warmed profiles; return (ready, problems)."""
    problems: list[str] = []
    ok_results = [s["result"] for s in summaries if s.get("ok") and "result" in s]
    if not ok_results:
        return False, ["no profile warmed successfully"]

    high_risk = any(
        job.get("risk") == "High"
        for result in ok_results
        for job in result.get("jobs", [])
        if isinstance(job, dict)
    )
    if not high_risk:
        problems.append("no High-risk job found (Scam Shield demo needs one)")

    with_phone = any(
        place.get("phone")
        for result in ok_results
        for place in result.get("local", [])
        if isinstance(place, dict)
    )
    if not with_phone:
        problems.append("no place with a phone found (WhatsApp demo needs one)")

    trend = any(result.get("trend") for result in ok_results)
    if not trend:
        problems.append("no trend data found")

    return (not problems, problems)


async def _main_async(profiles: list[dict]) -> int:
    from app.services.serp import close_serp, init_cache, init_serp

    init_cache()
    await init_serp()
    try:
        failures = 0
        summaries: list[dict] = []
        for item in profiles:
            summary = await prewarm_one(item)
            summaries.append(summary)
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
        if failures:
            print(f"demo readiness: NOT READY ({failures} profile(s) failed)")
            return 1

        ready, problems = _demo_readiness(summaries)
        for problem in problems:
            print(f"demo readiness: missing {problem}")

        # Repeat the demo profile: every SerpAPI response must come from cache.
        repeat = await prewarm_one(profiles[0])
        repeat_credits = repeat.get("credits_used", -1)
        print(f"demo readiness: repeat run credits_used={repeat_credits}")
        if repeat_credits != 0:
            problems.append(
                f"repeat run cost {repeat_credits} credits (expected 0)"
            )
            ready = False

        if ready:
            print("demo readiness: READY")
            return 0
        print("demo readiness: NOT READY")
        return 1
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
