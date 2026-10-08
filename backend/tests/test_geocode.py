"""Tests for the city/region geocoding service (respx, no real network)."""

import httpx
import pytest
import respx

import app.services.geocode as geocode_module
from app.config import get_settings
from app.services.geocode import (
    attach_job_coords,
    geocode_city,
    geocode_key,
    geocode_many,
    is_remote_location,
    normalise_location,
)
from app.schemas import Job

GEO = "https://geo.test"


@pytest.fixture
def geo_env(monkeypatch: pytest.MonkeyPatch, tmp_cache_path):
    """Enable geocoding against a fake host with an isolated cache."""
    import app.services.serp as serp_module

    monkeypatch.setenv("GEOCODE_ENABLED", "true")
    monkeypatch.setenv("GEOCODE_PROVIDER", "nominatim")
    monkeypatch.setenv("GEOCODE_BASE_URL", GEO)
    monkeypatch.setenv("GEOCODE_USER_AGENT", "EarnRadarTests/1.0")
    get_settings.cache_clear()
    monkeypatch.setattr(geocode_module, "_last_call_ts", 0.0)
    serp_module.init_cache(tmp_cache_path)
    yield tmp_cache_path
    get_settings.cache_clear()
    serp_module.close_cache()


def _nominatim(lat="18.5204", lon="73.8567", addresstype="city"):
    return [{"lat": lat, "lon": lon, "addresstype": addresstype, "display_name": "Pune"}]


def _photon(lng=73.8567, lat=18.5204, city=True):
    props = {"country": "India"}
    if city:
        props["city"] = "Pune"
    return {"features": [{"geometry": {"coordinates": [lng, lat]}, "properties": props}]}


def _job(location: str, company: str = "ABC") -> Job:
    return Job.model_validate(
        {
            "title": "Tailor",
            "company": company,
            "location": location,
            "desc": "Stitching work",
            "flags": [],
            "risk": "Low",
        }
    )


# normalisation ---------------------------------------------------------------

@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("Pune", "Pune"),
        ("Hinjewadi, Pune, Maharashtra", "Hinjewadi, Pune, Maharashtra"),
        ("Flat 4, MG Road, Pune", "MG Road, Pune"),
        ("Sector 62, Noida", "Noida"),
        ("Hybrid, Pune", "Pune"),
        ("Remote", None),
        ("Anywhere", None),
        ("", None),
        (None, None),
        ("411001", None),
    ],
)
def test_normalise_location(raw, expected) -> None:
    assert normalise_location(raw) == expected


def test_normalise_location_strips_company() -> None:
    assert normalise_location("ShineCo, Pune", "ShineCo") == "Pune"


@pytest.mark.parametrize(
    ("raw", "expected"),
    [("Remote", True), ("Anywhere", True), ("Pune", False), ("", False), (None, False)],
)
def test_is_remote_location(raw, expected) -> None:
    assert is_remote_location(raw) is expected


def test_geocode_key_is_hash_not_text() -> None:
    key = geocode_key("Pune, Maharashtra")
    assert key.startswith("geocode:")
    assert "Pune" not in key
    assert geocode_key("PUNE, MAHARASHTRA") == key


# upstream behaviour ------------------------------------------------------------

async def test_nominatim_success(geo_env) -> None:
    with respx.mock(assert_all_called=False) as router:
        route = router.get(f"{GEO}/search").mock(
            return_value=httpx.Response(200, json=_nominatim())
        )
        batch = await geocode_many(["Pune, Maharashtra"])
    assert route.call_count == 1
    assert batch.results == {"Pune, Maharashtra": (18.5204, 73.8567, "city")}
    assert batch.upstream_calls == 1
    assert batch.cache_hits == 0
    sent_ua = route.calls[0].request.headers.get("user-agent")
    assert sent_ua == "EarnRadarTests/1.0"


async def test_nominatim_state_is_approximate(geo_env) -> None:
    with respx.mock(assert_all_called=False) as router:
        router.get(f"{GEO}/search").mock(
            return_value=httpx.Response(200, json=_nominatim(addresstype="state"))
        )
        batch = await geocode_many(["Maharashtra"])
    assert batch.results == {"Maharashtra": (18.5204, 73.8567, "approximate")}


async def test_photon_success_and_approximate(geo_env, monkeypatch) -> None:
    monkeypatch.setenv("GEOCODE_PROVIDER", "photon")
    get_settings.cache_clear()
    with respx.mock(assert_all_called=False) as router:
        route = router.get(f"{GEO}/api").mock(
            return_value=httpx.Response(200, json=_photon())
        )
        batch = await geocode_many(["Pune"])
    assert route.call_count == 1
    assert batch.results == {"Pune": (18.5204, 73.8567, "city")}

    with respx.mock(assert_all_called=False) as router2:
        router2.get(f"{GEO}/api").mock(
            return_value=httpx.Response(200, json=_photon(city=False))
        )
        batch2 = await geocode_many(["Somewhere"])
    assert batch2.results == {"Somewhere": (18.5204, 73.8567, "approximate")}


@pytest.mark.parametrize("failure", ["429", "timeout", "garbage"])
async def test_provider_failures_return_none(geo_env, failure) -> None:
    with respx.mock(assert_all_called=False) as router:
        route = router.get(f"{GEO}/search")
        if failure == "429":
            route.mock(return_value=httpx.Response(429, json={"error": "busy"}))
        elif failure == "timeout":
            route.mock(side_effect=httpx.ConnectTimeout("slow"))
        else:
            route.mock(return_value=httpx.Response(200, json={"unexpected": 1}))
        batch = await geocode_many(["Pune"])
    assert batch.results == {"Pune": None}
    assert batch.upstream_calls == 0
    # Failures are not cached: a retry goes upstream again.
    with respx.mock(assert_all_called=False) as router2:
        route2 = router2.get(f"{GEO}/search").mock(
            return_value=httpx.Response(200, json=_nominatim())
        )
        batch2 = await geocode_many(["Pune"])
    assert route2.call_count == 1
    assert batch2.results["Pune"] == (18.5204, 73.8567, "city")


async def test_cache_hit_makes_zero_upstream_calls(geo_env) -> None:
    with respx.mock(assert_all_called=False) as router:
        route = router.get(f"{GEO}/search").mock(
            return_value=httpx.Response(200, json=_nominatim())
        )
        first = await geocode_many(["Pune"])
        second = await geocode_many(["Pune"])
    assert route.call_count == 1
    assert first.results == second.results
    assert second.cache_hits == 1
    assert second.upstream_calls == 0


async def test_remote_locations_never_sent(geo_env) -> None:
    with respx.mock(assert_all_called=False) as router:
        route = router.get(f"{GEO}/search").mock(
            return_value=httpx.Response(200, json=_nominatim())
        )
        jobs, stats = await attach_job_coords([_job("Remote"), _job("Anywhere")])
    assert route.call_count == 0
    assert all(job.lat is None and job.geo_precision is None for job in jobs)
    assert stats == {"upstream_calls": 0, "cache_hits": 0}


async def test_per_request_cap(geo_env, monkeypatch) -> None:
    monkeypatch.setenv("GEOCODE_MAX_PER_REQUEST", "2")
    get_settings.cache_clear()
    with respx.mock(assert_all_called=False) as router:
        route = router.get(f"{GEO}/search").mock(
            return_value=httpx.Response(200, json=_nominatim())
        )
        batch = await geocode_many(["Pune", "Mumbai", "Jaipur", "Surat"])
    assert route.call_count == 2
    assert len(batch.results) == 2
    assert batch.upstream_calls == 2


async def test_disabled_flag_and_missing_user_agent_make_no_calls(
    monkeypatch, tmp_cache_path
) -> None:
    import app.services.serp as serp_module

    serp_module.init_cache(tmp_cache_path)
    get_settings.cache_clear()
    with respx.mock(assert_all_called=False) as router:
        route = router.get(f"{GEO}/search").mock(
            return_value=httpx.Response(200, json=_nominatim())
        )
        # Disabled by default.
        batch = await geocode_many(["Pune"])
        assert batch.results == {}
        # Enabled but no User-Agent: stays off (fail-safe).
        monkeypatch.setenv("GEOCODE_ENABLED", "true")
        monkeypatch.setenv("GEOCODE_BASE_URL", GEO)
        get_settings.cache_clear()
        batch2 = await geocode_many(["Pune"])
        assert batch2.results == {}
        # Unknown provider: stays off.
        monkeypatch.setenv("GEOCODE_USER_AGENT", "EarnRadarTests/1.0")
        monkeypatch.setenv("GEOCODE_PROVIDER", "google")
        get_settings.cache_clear()
        batch3 = await geocode_many(["Pune"])
        assert batch3.results == {}
    assert route.call_count == 0
    get_settings.cache_clear()


async def test_no_raw_body_or_location_in_logs(geo_env, caplog) -> None:
    import logging

    with respx.mock(assert_all_called=False):
        with caplog.at_level(logging.DEBUG):
            await geocode_many(["Zedtown SECRETLOC"])
    app_text = " ".join(
        record.getMessage() for record in caplog.records if record.name.startswith("app.")
    )
    assert "SECRETLOC" not in app_text


async def test_upstream_error_body_never_logged(geo_env, caplog) -> None:
    import logging

    with respx.mock(assert_all_called=False) as router:
        router.get(f"{GEO}/search").mock(
            return_value=httpx.Response(500, text="SECRET-UPSTREAM-BODY")
        )
        with caplog.at_level(logging.DEBUG):
            batch = await geocode_many(["Pune"])
    assert batch.results == {"Pune": None}
    app_text = " ".join(
        record.getMessage() for record in caplog.records if record.name.startswith("app.")
    )
    assert "SECRET-UPSTREAM-BODY" not in app_text


async def test_attach_job_coords_batches_unique_cities(geo_env) -> None:
    seen: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request.url.params.get("q", ""))
        return httpx.Response(200, json=_nominatim())

    with respx.mock(assert_all_called=False) as router:
        router.get(f"{GEO}/search").mock(side_effect=handler)
        jobs, stats = await attach_job_coords(
            [_job("Tailor work Pune", "ABC"), _job("Pune", "XYZ"), _job("Remote")]
        )
    # "Tailor work Pune" and "Pune" normalise differently, Remote skipped.
    assert len(seen) == 2
    assert {q for q in seen} == {"Tailor work Pune", "Pune"}
    assert jobs[0].lat == 18.5204 and jobs[0].geo_precision == "city"
    assert jobs[1].lat == 18.5204
    assert jobs[2].lat is None and jobs[2].geo_precision is None
    assert stats["upstream_calls"] == 2


async def test_never_geocodes_profile_text(geo_env) -> None:
    seen: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request.url.params.get("q", ""))
        return httpx.Response(200, json=_nominatim())

    with respx.mock(assert_all_called=False) as router:
        router.get(f"{GEO}/search").mock(side_effect=handler)
        jobs, _ = await attach_job_coords([_job("Pune")])
        center = await geocode_city("Pune")
    assert seen == ["Pune"]  # city call served from cache
    assert jobs[0].lat == 18.5204
    assert center == (18.5204, 73.8567)
    assert all("tailor" not in q.lower() and "stitch" not in q.lower() for q in seen)


async def test_serp_credits_untouched(geo_env) -> None:
    from app.budget import used_today

    with respx.mock(assert_all_called=False) as router:
        router.get(f"{GEO}/search").mock(
            return_value=httpx.Response(200, json=_nominatim())
        )
        await geocode_many(["Pune", "Mumbai"])
    assert used_today("serp") == 0


async def test_geocode_city(geo_env) -> None:
    with respx.mock(assert_all_called=False) as router:
        router.get(f"{GEO}/search").mock(
            return_value=httpx.Response(200, json=_nominatim())
        )
        assert await geocode_city("Pune") == (18.5204, 73.8567)
    with respx.mock(assert_all_called=False) as router2:
        router2.get(f"{GEO}/search").mock(return_value=httpx.Response(200, json=[]))
        assert await geocode_city("Nowhere") is None
    assert await geocode_city("") is None
    assert await geocode_city(None) is None


async def test_pacing_enforces_one_per_second(geo_env, monkeypatch) -> None:
    import time

    monkeypatch.setattr(geocode_module, "_last_call_ts", 0.0)
    with respx.mock(assert_all_called=False) as router:
        router.get(f"{GEO}/search").mock(
            return_value=httpx.Response(200, json=_nominatim())
        )
        start = time.monotonic()
        await geocode_many(["Pune", "Mumbai"])
        elapsed = time.monotonic() - start
    assert elapsed >= 0.9


async def test_search_attaches_job_coords(
    monkeypatch: pytest.MonkeyPatch, tmp_cache_path
) -> None:
    """End-to-end: /api/search jobs carry pins when geocoding is enabled."""
    import json
    from pathlib import Path

    import app.services.llm as llm_module
    import app.services.pipeline as pipeline_module
    import app.services.serp as serp_module
    from app.schemas import Profile

    async def fake_ask_json(system, user, max_tokens, *, temperature=0.2, label="llm"):
        if label == "planner":
            return {
                "job_queries": ["tailoring jobs", "stitching jobs"],
                "local_queries": ["tailoring in Pune", "boutiques in Pune"],
                "trend_keywords": ["tailoring", "stitching"],
                "forum_query": "tailoring earnings India",
            }
        path = Path(__file__).resolve().parent / "fixtures" / "ai" / "good_opportunities.json"
        return json.loads(path.read_text(encoding="utf-8"))

    async def fake_serp(engine: str, **params):
        if engine == "google_jobs":
            return {
                "jobs_results": [
                    {
                        "title": "Tailor needed",
                        "company_name": "ABC",
                        "location": "Pune, Maharashtra",
                        "description": "Stitching work in Pune",
                    }
                ]
            }
        if engine == "google_maps":
            return {"local_results": []}
        if engine == "google_trends":
            return {"interest_over_time": {"timeline_data": []}}
        return {"organic_results": []}

    monkeypatch.setattr(llm_module, "ask_json", fake_ask_json)
    monkeypatch.setattr(pipeline_module, "serp", fake_serp)
    monkeypatch.setenv("GEOCODE_ENABLED", "true")
    monkeypatch.setenv("GEOCODE_PROVIDER", "nominatim")
    monkeypatch.setenv("GEOCODE_BASE_URL", GEO)
    monkeypatch.setenv("GEOCODE_USER_AGENT", "EarnRadarTests/1.0")
    get_settings.cache_clear()
    serp_module.init_cache(tmp_cache_path)
    try:
        with respx.mock(assert_all_called=False) as router:
            router.get(f"{GEO}/search").mock(
                return_value=httpx.Response(200, json=_nominatim())
            )
            result = await pipeline_module.run_search(
                Profile.model_validate(
                    {"skills": "tailoring", "city": "Pune", "hours": 10, "budget": 0}
                )
            )
    finally:
        get_settings.cache_clear()
        serp_module.close_cache()
    assert result["jobs"][0]["lat"] == 18.5204
    assert result["jobs"][0]["lng"] == 73.8567
    assert result["jobs"][0]["geo_precision"] == "city"
