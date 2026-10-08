"""Tests for the SerpAPI wrapper: cache, TTL, retries and per-request counters."""

import asyncio
import hashlib
import json
import sqlite3
import time

import httpx
import pytest
import respx

import app.services.serp as serp_module
from app.config import get_settings
from app.errors import SerpError


@pytest.fixture
async def fresh_serp(tmp_cache_path):
    await serp_module.close_serp()
    serp_module.init_cache(tmp_cache_path)
    with serp_module._LOCK:
        serp_module._lifetime["credits_used"] = 0
        serp_module._lifetime["cache_hits"] = 0
    serp_module.request_stats.set(None)
    yield serp_module
    await serp_module.close_serp()
    serp_module.request_stats.set(None)


def _db_rows(path):
    conn = sqlite3.connect(path)
    try:
        return conn.execute("SELECT k, engine, v, created_at, ttl FROM cache").fetchall()
    finally:
        conn.close()


def _age_all_rows(path, seconds_old):
    conn = sqlite3.connect(path)
    try:
        conn.execute("UPDATE cache SET created_at = ?", (time.time() - seconds_old,))
        conn.commit()
    finally:
        conn.close()


# 1. Miss then hit -----------------------------------------------------------

async def test_miss_then_hit_counts_credit_once(fresh_serp, tmp_cache_path):
    stats = fresh_serp.new_request_stats()
    with respx.mock(assert_all_called=False) as router:
        route = router.get("https://serpapi.com/search.json").mock(
            return_value=httpx.Response(200, json={"jobs_results": [{"title": "A"}]})
        )
        first = await fresh_serp.serp("google_jobs", q="baker")
        assert first == {"jobs_results": [{"title": "A"}]}
        assert stats == {"credits_used": 1, "cache_hits": 0}
        assert route.call_count == 1

        second = await fresh_serp.serp("google_jobs", q="baker")
        assert second == first
        assert stats == {"credits_used": 1, "cache_hits": 1}
        assert route.call_count == 1  # zero additional HTTP calls


# 2. Expired TTL triggers a new HTTP call ------------------------------------

async def test_expired_ttl_triggers_new_call(fresh_serp, tmp_cache_path):
    stats = fresh_serp.new_request_stats()
    with respx.mock(assert_all_called=False) as router:
        route = router.get("https://serpapi.com/search.json").mock(
            return_value=httpx.Response(200, json={"ok": True})
        )
        await fresh_serp.serp("google_jobs", q="plumber")
        assert route.call_count == 1
        # Age the row well beyond its TTL (default 24h for google_jobs).
        _age_all_rows(tmp_cache_path, seconds_old=25 * 3600)
        await fresh_serp.serp("google_jobs", q="plumber")
        assert route.call_count == 2
        assert stats["credits_used"] == 2


# 3. Error handling ----------------------------------------------------------

async def test_generic_error_not_cached(fresh_serp, tmp_cache_path):
    fresh_serp.new_request_stats()
    with respx.mock(assert_all_called=False) as router:
        route = router.get("https://serpapi.com/search.json").mock(
            return_value=httpx.Response(200, json={"error": "Invalid API key"})
        )
        out1 = await fresh_serp.serp("google_jobs", q="x")
        assert out1 == {"error": "Invalid API key"}
        assert fresh_serp.cache_entry_count() == 0
        out2 = await fresh_serp.serp("google_jobs", q="x")
        assert out2 == {"error": "Invalid API key"}
        assert route.call_count == 2
        assert fresh_serp.cache_entry_count() == 0


async def test_no_results_error_cached_with_1h_ttl(fresh_serp, tmp_cache_path):
    stats = fresh_serp.new_request_stats()
    payload = {"error": "Google Jobs - hasn't returned any results for this query."}
    with respx.mock(assert_all_called=False) as router:
        route = router.get("https://serpapi.com/search.json").mock(
            return_value=httpx.Response(200, json=payload)
        )
        out = await fresh_serp.serp("google_jobs", q="zzz-no-match")
        assert out == payload
        assert route.call_count == 1
        rows = _db_rows(tmp_cache_path)
        assert len(rows) == 1
        assert rows[0][4] == pytest.approx(3600.0)
        # Second identical call is a cache hit: no new HTTP.
        out2 = await fresh_serp.serp("google_jobs", q="zzz-no-match")
        assert out2 == payload
        assert route.call_count == 1
        assert stats["cache_hits"] == 1


# 4. API key never in key or stored values ------------------------------------

async def test_api_key_absent_from_cache(fresh_serp, tmp_cache_path):
    settings = get_settings()
    api_key = settings.serpapi_key
    assert api_key == "test-serpapi-key"
    with respx.mock(assert_all_called=False) as router:
        route = router.get("https://serpapi.com/search.json").mock(
            return_value=httpx.Response(200, json={"data": "ok"})
        )
        await fresh_serp.serp("google_jobs", q="baker")
        # Key was sent over HTTP...
        assert route.calls[0].request.url.params.get("api_key") == api_key
    rows = _db_rows(tmp_cache_path)
    assert len(rows) == 1
    blob = json.dumps(rows) + rows[0][0]
    assert api_key not in blob
    assert api_key not in rows[0][2]


# 5. Retries and auth failures ------------------------------------------------

async def test_503_then_200_succeeds_with_one_credit(fresh_serp):
    stats = fresh_serp.new_request_stats()
    with respx.mock(assert_all_called=False) as router:
        route = router.get("https://serpapi.com/search.json").mock(
            side_effect=[
                httpx.Response(503, json={"error": "busy"}),
                httpx.Response(200, json={"ok": True}),
            ]
        )
        out = await fresh_serp.serp("google_jobs", q="retry-ok")
        assert out == {"ok": True}
        assert route.call_count == 2
        assert stats["credits_used"] == 1


async def test_two_failures_raise_serp_error(fresh_serp):
    fresh_serp.new_request_stats()
    with respx.mock(assert_all_called=False) as router:
        route = router.get("https://serpapi.com/search.json").mock(
            side_effect=[
                httpx.Response(503, json={"e": 1}),
                httpx.Response(500, json={"e": 2}),
            ]
        )
        with pytest.raises(SerpError):
            await fresh_serp.serp("google_jobs", q="down")
        assert route.call_count == 2


async def test_401_raises_without_retry(fresh_serp):
    fresh_serp.new_request_stats()
    with respx.mock(assert_all_called=False) as router:
        route = router.get("https://serpapi.com/search.json").mock(
            return_value=httpx.Response(401, json={"error": "bad key"})
        )
        with pytest.raises(SerpError, match="rejected our credentials"):
            await fresh_serp.serp("google_jobs", q="auth")
        assert route.call_count == 1


async def test_timeouts_retried_once_then_succeed(fresh_serp):
    stats = fresh_serp.new_request_stats()
    with respx.mock(assert_all_called=False) as router:
        route = router.get("https://serpapi.com/search.json").mock(
            side_effect=[
                httpx.ConnectTimeout("boom"),
                httpx.Response(200, json={"ok": True}),
            ]
        )
        out = await fresh_serp.serp("google_jobs", q="t")
        assert out == {"ok": True}
        assert route.call_count == 2
        assert stats["credits_used"] == 1


async def test_double_timeout_raises_serp_error(fresh_serp):
    with respx.mock(assert_all_called=False) as router:
        route = router.get("https://serpapi.com/search.json").mock(
            side_effect=[httpx.ConnectTimeout("a"), httpx.ConnectTimeout("b")]
        )
        with pytest.raises(SerpError):
            await fresh_serp.serp("google_jobs", q="t")
        assert route.call_count == 2


# 6. Sequential simulated requests -------------------------------------------

async def test_sequential_requests_have_isolated_counters(fresh_serp):
    with respx.mock(assert_all_called=False) as router:
        route = router.get("https://serpapi.com/search.json").mock(
            return_value=httpx.Response(200, json={"v": 1})
        )
        s1 = fresh_serp.new_request_stats()
        await fresh_serp.serp("google_jobs", q="same")
        assert s1["credits_used"] == 1
        assert route.call_count == 1

        s2 = fresh_serp.new_request_stats()
        await fresh_serp.serp("google_jobs", q="same")
        assert s2["credits_used"] == 0
        assert s2["cache_hits"] == 1
        assert route.call_count == 1


# 7. Parallel gather shares one dict ------------------------------------------

async def test_parallel_gather_updates_shared_dict(fresh_serp):
    stats = fresh_serp.new_request_stats()
    with respx.mock(assert_all_called=False) as router:
        router.get("https://serpapi.com/search.json").mock(
            return_value=httpx.Response(200, json={"ok": True})
        )
        results = await asyncio.gather(
            fresh_serp.serp("google_jobs", q="one"),
            fresh_serp.serp("google_jobs", q="two"),
            fresh_serp.serp("google_jobs", q="three"),
        )
        assert results == [{"ok": True}] * 3
    # All three increments landed in the single dict the caller holds.
    assert stats["credits_used"] == 3
    assert stats["cache_hits"] == 0


# 8. Param order ---------------------------------------------------------------

def test_param_order_does_not_change_key():
    k1 = serp_module.cache_key("google_jobs", {"a": 1, "b": 2})
    k2 = serp_module.cache_key("google_jobs", {"b": 2, "a": 1})
    k3 = serp_module.cache_key("google_jobs", {"a": 1, "b": 3})
    assert k1 == k2
    assert k1 != k3
    expected = hashlib.md5(
        json.dumps(["google_jobs", {"a": 1, "b": 2}], sort_keys=True).encode()
    ).hexdigest()
    assert k1 == expected


async def test_param_order_hits_cache(fresh_serp):
    fresh_serp.new_request_stats()
    with respx.mock(assert_all_called=False) as router:
        route = router.get("https://serpapi.com/search.json").mock(
            return_value=httpx.Response(200, json={"ok": 1})
        )
        await fresh_serp.serp("google_jobs", a="1", b="2")
        await fresh_serp.serp("google_jobs", b="2", a="1")
        assert route.call_count == 1
        await fresh_serp.serp("google_jobs", a="1", b="3")
        assert route.call_count == 2


# 9. SerpError messages never contain the key ----------------------------------

async def test_serp_error_messages_never_contain_key(fresh_serp):
    api_key = get_settings().serpapi_key
    with respx.mock(assert_all_called=False) as router:
        route = router.get("https://serpapi.com/search.json").mock(
            return_value=httpx.Response(401, text="bad " + api_key)
        )
        with pytest.raises(SerpError) as ei:
            await fresh_serp.serp("google_jobs", q="k")
        assert api_key not in str(ei.value)
        assert api_key not in (ei.value.message or "")
        detail = getattr(ei.value, "_detail", "") or ""
        assert api_key not in detail
        assert route.call_count == 1

    with respx.mock(assert_all_called=False) as router2:
        router2.get("https://serpapi.com/search.json").mock(
            side_effect=[
                httpx.Response(503, text="oops " + api_key),
                httpx.Response(503, text="oops " + api_key),
            ]
        )
        with pytest.raises(SerpError) as ei2:
            await fresh_serp.serp("google_maps", q="k2")
        assert api_key not in str(ei2.value)
        assert api_key not in (getattr(ei2.value, "_detail", "") or "")


# 10. purge_expired -------------------------------------------------------------

async def test_purge_expired_removes_only_expired(fresh_serp, tmp_cache_path):
    now = time.time()
    conn = sqlite3.connect(tmp_cache_path)
    try:
        conn.execute(
            "INSERT OR REPLACE INTO cache(k, engine, v, created_at, ttl)"
            " VALUES(?, ?, ?, ?, ?)",
            ("fresh1", "google_jobs", json.dumps({"a": 1}), now, 3600.0),
        )
        conn.execute(
            "INSERT OR REPLACE INTO cache(k, engine, v, created_at, ttl)"
            " VALUES(?, ?, ?, ?, ?)",
            ("old1", "google_jobs", json.dumps({"a": 2}), now - 7200, 3600.0),
        )
        conn.execute(
            "INSERT OR REPLACE INTO cache(k, engine, v, created_at, ttl)"
            " VALUES(?, ?, ?, ?, ?)",
            ("old2", "google_maps", json.dumps({"a": 3}), now - 100, 50.0),
        )
        conn.commit()
    finally:
        conn.close()
    assert fresh_serp.cache_entry_count() == 3
    removed = fresh_serp.purge_expired()
    assert removed == 2
    assert fresh_serp.cache_entry_count() == 1
    remaining = _db_rows(tmp_cache_path)
    assert [r[0] for r in remaining] == ["fresh1"]
