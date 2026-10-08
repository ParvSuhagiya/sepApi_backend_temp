"""Tests for Phase 1: rate limits, IP handling, body limits, budgets, CORS."""

import asyncio
import datetime as dt
import importlib

import httpx
import pytest
import respx
from fastapi.testclient import TestClient

import app.main as main_module
import app.services.pipeline as pipeline_module
import app.services.serp as serp_module
from app.budget import remaining, reset_budgets, set_clock, try_consume
from app.config import get_settings
from app.errors import BudgetExhausted
from app.security import client_ip


VALID_PROFILE = {"skills": "tailoring, stitching", "city": "Pune", "hours": 10, "budget": 0}
INVALID_PROFILE = {"skills": "x", "city": "P", "hours": 0, "budget": -1}

MIN_SEARCH_RESULT = {
    "opportunities": [],
    "jobs": [],
    "local": [],
    "trend": [],
    "trend_keyword": None,
    "trend_growth": {},
    "forum": [],
    "stats": {"credits_used": 0, "cache_hits": 0},
    "meta": {"request_id": "test", "duration_ms": 1, "degraded": []},
}


@pytest.fixture
def clean_limits():
    main_module.reset_rate_limiters()
    reset_budgets()
    yield
    main_module.reset_rate_limiters()
    reset_budgets()


@pytest.fixture
def mock_search(monkeypatch):
    async def fake_run_search(profile, request_id=None):
        return dict(MIN_SEARCH_RESULT)

    monkeypatch.setattr(pipeline_module, "run_search", fake_run_search)
    return fake_run_search


@pytest.fixture
def reloaded_main(monkeypatch):
    """Reload app.main with extra env vars; restore defaults afterwards."""
    applied: list[str] = []

    def load(**env):
        for key, value in env.items():
            monkeypatch.setenv(key, value)
            applied.append(key)
        get_settings.cache_clear()
        return importlib.reload(main_module)

    yield load

    for key in applied:
        monkeypatch.delenv(key, raising=False)
    get_settings.cache_clear()
    importlib.reload(main_module)


@pytest.fixture
async def isolated_serp(tmp_cache_path):
    await serp_module.close_serp()
    serp_module.init_cache(tmp_cache_path)
    with serp_module._LOCK:
        serp_module._lifetime["credits_used"] = 0
        serp_module._lifetime["cache_hits"] = 0
    serp_module.request_stats.set(None)
    reset_budgets()
    yield serp_module
    await serp_module.close_serp()
    serp_module.request_stats.set(None)
    reset_budgets()


# 1.1 X-Forwarded-For handling -------------------------------------------------

SEARCH_URL = "/api/search"


def test_spoofed_rotating_left_entry_cannot_evade_limit(clean_limits, mock_search):
    """Rotating the client-controlled left entry still hits one bucket."""
    with TestClient(main_module.app) as client:
        statuses = []
        for i in range(13):
            response = client.post(
                SEARCH_URL,
                json=VALID_PROFILE,
                headers={"X-Forwarded-For": f"10.9.9.{i}, 203.0.113.7"},
            )
            statuses.append(response.status_code)
    assert statuses.count(200) == 10
    assert statuses.count(429) == 3


def test_client_ip_uses_last_entry_with_default_hops():
    class FakeClient:
        host = "9.9.9.9"

    class FakeRequest:
        headers = {"x-forwarded-for": "1.1.1.1, 2.2.2.2"}
        client = FakeClient()

    assert client_ip(FakeRequest()) == "2.2.2.2"


def test_hops_zero_ignores_forwarded_header(clean_limits, mock_search, monkeypatch):
    monkeypatch.setenv("TRUSTED_PROXY_HOPS", "0")
    get_settings.cache_clear()
    with TestClient(main_module.app) as client:
        statuses = []
        for i in range(13):
            response = client.post(
                SEARCH_URL,
                json=VALID_PROFILE,
                headers={"X-Forwarded-For": f"10.9.9.{i}"},
            )
            statuses.append(response.status_code)
    assert statuses.count(200) == 10
    assert statuses.count(429) == 3


def test_malformed_forwarded_header_falls_back_safely(clean_limits, mock_search):
    with TestClient(main_module.app) as client:
        statuses = []
        for _ in range(13):
            response = client.post(
                SEARCH_URL,
                json=VALID_PROFILE,
                headers={"X-Forwarded-For": "not-an-ip!!!"},
            )
            statuses.append(response.status_code)
    assert statuses.count(200) == 10
    assert statuses.count(429) == 3


# 1.3 Limiter runs after body validation ---------------------------------------

def test_invalid_requests_do_not_consume_quota(clean_limits, mock_search):
    with TestClient(main_module.app) as client:
        for _ in range(11):
            response = client.post(SEARCH_URL, json=INVALID_PROFILE)
            assert response.status_code == 422
        valid = client.post(SEARCH_URL, json=VALID_PROFILE)
    assert valid.status_code == 200


def test_valid_limit_returns_429_with_retry_after(clean_limits, mock_search):
    with TestClient(main_module.app) as client:
        statuses = []
        last_retry = None
        for _ in range(11):
            response = client.post(SEARCH_URL, json=VALID_PROFILE)
            statuses.append(response.status_code)
            last_retry = response.headers.get("Retry-After")
    assert statuses[:10] == [200] * 10
    assert statuses[10] == 429
    assert last_retry is not None
    assert statuses.count(200) == 10


# 1.4 Chunked body limit ---------------------------------------------------------

def test_chunked_oversize_body_returns_413(clean_limits):
    def big_body():
        yield b"x" * (50 * 1024)

    with TestClient(main_module.app) as client:
        response = client.post(
            SEARCH_URL,
            content=big_body(),
            headers={"Content-Type": "application/json"},
        )
    assert response.status_code == 413
    assert response.json()["error"]["code"] == "invalid_input"


def test_chunked_small_body_unaffected(clean_limits, mock_search):
    import json as jsonlib

    payload = jsonlib.dumps(VALID_PROFILE).encode()

    def small_body():
        yield payload[:10]
        yield payload[10:]

    with TestClient(main_module.app) as client:
        response = client.post(
            SEARCH_URL,
            content=small_body(),
            headers={"Content-Type": "application/json"},
        )
    assert response.status_code == 200


# 1.6 Access-code brute force -----------------------------------------------------

def test_access_code_brute_force_throttled(clean_limits, mock_search, monkeypatch):
    monkeypatch.setenv("ACCESS_CODE", "secret-code")
    get_settings.cache_clear()
    with TestClient(main_module.app) as client:
        statuses = []
        for _ in range(22):
            response = client.post(
                SEARCH_URL, json=VALID_PROFILE, headers={"X-Access-Code": "wrong"}
            )
            statuses.append(response.status_code)
        # Correct code still works (successes are never counted).
        ok = client.post(
            SEARCH_URL, json=VALID_PROFILE, headers={"X-Access-Code": "secret-code"}
        )
        retry_after = client.post(
            SEARCH_URL, json=VALID_PROFILE, headers={"X-Access-Code": "wrong"}
        ).headers.get("Retry-After")
    assert statuses[:20] == [401] * 20
    assert statuses[20] == 429
    assert statuses[21] == 429
    assert ok.status_code == 200
    assert retry_after is not None


# 1.2 / 1.5 Budgets ----------------------------------------------------------------

async def test_serp_budget_cache_served_live_blocked(
    isolated_serp, monkeypatch: pytest.MonkeyPatch
):
    from app.errors import SerpError

    monkeypatch.setenv("MAX_SERP_CALLS_PER_DAY", "1")
    get_settings.cache_clear()
    stats = isolated_serp.new_request_stats()
    with respx.mock(assert_all_called=False) as router:
        route = router.get("https://serpapi.com/search.json").mock(
            return_value=httpx.Response(200, json={"ok": True})
        )
        first = await isolated_serp.serp("google_jobs", q="prime")
        assert first == {"ok": True}
        assert route.call_count == 1
        # Cache hit is still served with an exhausted budget.
        second = await isolated_serp.serp("google_jobs", q="prime")
        assert second == {"ok": True}
        assert route.call_count == 1
        # A new live call is refused.
        with pytest.raises(SerpError):
            await isolated_serp.serp("google_jobs", q="fresh-query")
        assert route.call_count == 1
    assert stats["credits_used"] == 1
    assert remaining("serp", 1) == 0


async def test_serp_budget_zero_is_unlimited(isolated_serp, monkeypatch):
    monkeypatch.setenv("MAX_SERP_CALLS_PER_DAY", "0")
    get_settings.cache_clear()
    with respx.mock(assert_all_called=False) as router:
        route = router.get("https://serpapi.com/search.json").mock(
            return_value=httpx.Response(200, json={"ok": True})
        )
        for i in range(3):
            await isolated_serp.serp("google_jobs", q=f"q-{i}")
        assert route.call_count == 3


def test_budget_resets_on_new_utc_day(monkeypatch):
    monkeypatch.setenv("MAX_SERP_CALLS_PER_DAY", "1")
    get_settings.cache_clear()
    day_one = dt.datetime(2026, 1, 5, 23, 59, tzinfo=dt.timezone.utc)
    day_two = dt.datetime(2026, 1, 6, 0, 1, tzinfo=dt.timezone.utc)
    set_clock(lambda: day_one)
    assert try_consume("serp", 1) is True
    assert try_consume("serp", 1) is False
    set_clock(lambda: day_two)
    assert try_consume("serp", 1) is True


async def test_llm_budget_exhausted_raises_without_network(monkeypatch):
    from app.services import llm as llm_module

    monkeypatch.setenv("MAX_LLM_CALLS_PER_DAY", "1")
    get_settings.cache_clear()
    assert try_consume("llm", 1) is True
    with pytest.raises(BudgetExhausted) as exc_info:
        await llm_module.ask_text("system", "user", 10)
    assert exc_info.value.code == "budget_exhausted"
    assert exc_info.value.status == 429


def test_llm_budget_exhausted_maps_to_429(clean_limits, monkeypatch):
    async def boom(profile, request_id=None):
        raise BudgetExhausted(retry_after=60)

    monkeypatch.setattr(pipeline_module, "run_search", boom)
    with TestClient(main_module.app) as client:
        response = client.post(SEARCH_URL, json=VALID_PROFILE)
    assert response.status_code == 429
    body = response.json()
    assert body["error"]["code"] == "budget_exhausted"
    assert "Retry-After" in response.headers


# 1.7 CORS --------------------------------------------------------------------------

def test_trailing_slash_origin_normalised(reloaded_main):
    reloaded = reloaded_main(ALLOWED_ORIGINS="https://x.vercel.app/")
    with TestClient(reloaded.app) as client:
        response = client.get(
            "/api/health", headers={"Origin": "https://x.vercel.app"}
        )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "https://x.vercel.app"


def test_forced_500_carries_cors_and_envelope(reloaded_main, monkeypatch):
    reloaded = reloaded_main(ALLOWED_ORIGINS="https://x.vercel.app")

    async def boom(profile, request_id=None):
        raise RuntimeError("forced")

    monkeypatch.setattr(pipeline_module, "run_search", boom)
    with TestClient(reloaded.app, raise_server_exceptions=False) as client:
        response = client.post(
            SEARCH_URL,
            json=VALID_PROFILE,
            headers={"Origin": "https://x.vercel.app"},
        )
    assert response.status_code == 500
    assert response.headers.get("access-control-allow-origin") == "https://x.vercel.app"
    assert response.json()["error"]["code"] == "internal"
    assert response.headers.get("x-request-id")


def test_disallowed_origin_gets_no_cors_header(reloaded_main, mock_search):
    reloaded = reloaded_main(ALLOWED_ORIGINS="https://x.vercel.app")
    with TestClient(reloaded.app) as client:
        response = client.post(
            SEARCH_URL,
            json=VALID_PROFILE,
            headers={"Origin": "https://evil.example"},
        )
    assert response.status_code == 200
    assert "access-control-allow-origin" not in response.headers


# 1.8 Stampede --------------------------------------------------------------------------

async def test_concurrent_identical_calls_fetch_once(isolated_serp, monkeypatch):
    calls = 0

    async def fake_fetch(engine, params):
        nonlocal calls
        calls += 1
        await asyncio.sleep(0.05)
        return {"engine": engine, "ok": True}

    monkeypatch.setattr(serp_module, "_fetch_from_serpapi", fake_fetch)
    stats = isolated_serp.new_request_stats()
    first, second = await asyncio.gather(
        isolated_serp.serp("google_jobs", q="stampede"),
        isolated_serp.serp("google_jobs", q="stampede"),
    )
    assert first == second == {"engine": "google_jobs", "ok": True}
    assert calls == 1
    assert stats["credits_used"] == 1


# Docs toggle --------------------------------------------------------------------------

def test_docs_disabled_in_production(reloaded_main):
    reloaded = reloaded_main(APP_ENV="production")
    assert reloaded.app.docs_url is None
    assert reloaded.app.openapi_url is None
    with TestClient(reloaded.app) as client:
        assert client.get("/openapi.json").status_code == 404
        assert client.get("/docs").status_code == 404


def test_docs_enabled_outside_production(reloaded_main):
    reloaded = reloaded_main(APP_ENV="development")
    assert reloaded.app.docs_url == "/docs"
    with TestClient(reloaded.app) as client:
        assert client.get("/openapi.json").status_code == 200
