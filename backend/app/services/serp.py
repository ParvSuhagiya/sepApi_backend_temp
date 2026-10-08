"""Async SerpAPI wrapper with SQLite cache, per-engine TTL and credit counters."""

from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import os
import sqlite3
import threading
import time
from contextvars import ContextVar
from typing import Any

import httpx

from app.config import get_settings
from app.budget import try_consume as _budget_consume
from app.errors import SerpError
from app.observability import redact

logger = logging.getLogger(__name__)

_SERPI_BUDGET_EXHAUSTED_MESSAGE = (
    "Daily search budget exhausted. Cached results are still served; "
    "please try again tomorrow."
)

__all__ = [
    "request_stats",
    "new_request_stats",
    "lifetime_stats",
    "cache_entry_count",
    "purge_expired",
    "enforce_cache_size_limit",
    "init_cache",
    "init_serp",
    "close_serp",
    "serp",
    "cache_key",
]

SERP_BASE_URL = "https://serpapi.com/search.json"
_AUTH_FAILURE_MESSAGE = "Search provider rejected our credentials"
_GENERIC_FAILURE_MESSAGE = "Search provider request failed. Please try again shortly."
_NO_RESULTS_MARKER = "hasn't returned any results"
_NO_RESULTS_TTL_SECONDS = 3600.0
_DEFAULT_TTL_SECONDS = 24 * 3600.0
_RETRY_BACKOFF_SECONDS = 0.5
_CACHE_MAX_BYTES = 50 * 1024 * 1024

request_stats: ContextVar[dict | None] = ContextVar("serp_request_stats", default=None)

_LOCK = threading.Lock()
_DB_PATH: str | None = None
_client: httpx.AsyncClient | None = None
_lifetime: dict[str, int] = {"credits_used": 0, "cache_hits": 0}

# Cache-stampede protection: in-flight live fetches keyed by cache key. A
# second concurrent caller for the same key awaits the first instead of
# spending another credit. Entries are (event loop, future) pairs so stale
# entries from a closed loop are never awaited.
_inflight: dict[str, tuple[asyncio.AbstractEventLoop, asyncio.Future]] = {}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _resolve_db_path(explicit: str | None = None) -> str:
    if explicit:
        return explicit
    global _DB_PATH
    if _DB_PATH is not None:
        return _DB_PATH
    return get_settings().cache_db_path


def _ensure_parent(path: str) -> None:
    parent = os.path.dirname(os.path.abspath(path))
    if parent and not os.path.exists(parent):
        os.makedirs(parent, exist_ok=True)


def _connect(path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(path, timeout=30.0)
    try:
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute(
            "CREATE TABLE IF NOT EXISTS cache"
            "(k TEXT PRIMARY KEY, engine TEXT, v TEXT, created_at REAL, ttl REAL)"
        )
        conn.commit()
    except Exception:
        conn.close()
        raise
    return conn


def init_cache(path: str | None = None) -> str:
    """Initialise the SQLite cache database and return the path in use."""
    global _DB_PATH
    resolved = _resolve_db_path(path)
    _ensure_parent(resolved)
    with _LOCK:
        conn = _connect(resolved)
        conn.close()
    _DB_PATH = resolved
    try:
        removed_expired = purge_expired()
    except Exception:
        removed_expired = 0
    try:
        removed_oversize = enforce_cache_size_limit()
    except Exception:
        removed_oversize = 0
    if removed_expired or removed_oversize:
        logger.info(
            "cache startup cleanup expired=%d oversize=%d path=%s",
            removed_expired,
            removed_oversize,
            resolved,
        )
    return resolved


def _db_path_or_init() -> str:
    if _DB_PATH is not None:
        return _DB_PATH
    return init_cache()


def cache_key(engine: str, params: dict[str, Any]) -> str:
    """Return the md5 cache key for an engine/params pair (never includes API key)."""
    raw = json.dumps([engine, params], sort_keys=True, default=str)
    return hashlib.md5(raw.encode("utf-8")).hexdigest()


def _ttl_for_engine(engine: str) -> float:
    settings = get_settings()
    mapping = {
        "google_jobs": settings.ttl_jobs_hours,
        "google_maps": settings.ttl_maps_hours,
        "google_trends": settings.ttl_trends_hours,
        "google_forums": settings.ttl_forums_hours,
    }
    hours = mapping.get(engine, 24)
    try:
        hours_f = float(hours)
    except (TypeError, ValueError):
        hours_f = 24.0
    return hours_f * 3600.0


def _is_no_results_error(payload: dict[str, Any]) -> bool:
    err = payload.get("error")
    if err is None:
        return False
    text = err if isinstance(err, str) else str(err)
    return _NO_RESULTS_MARKER.lower() in text.lower()


# -- sync sqlite primitives (run under _LOCK, called via asyncio.to_thread) --

def _read_row(key: str) -> tuple[str, str, float, float] | None:
    path = _db_path_or_init()
    with _LOCK:
        conn = _connect(path)
        try:
            cur = conn.execute(
                "SELECT k, engine, v, created_at, ttl FROM cache WHERE k = ?", (key,)
            )
            row = cur.fetchone()
            return row if row is None else (row[0], row[1], row[2], row[3], row[4])
        finally:
            conn.close()


def _write_row(key: str, engine: str, value: str, created_at: float, ttl: float) -> None:
    path = _db_path_or_init()
    with _LOCK:
        conn = _connect(path)
        try:
            conn.execute(
                "INSERT OR REPLACE INTO cache(k, engine, v, created_at, ttl)"
                " VALUES(?, ?, ?, ?, ?)",
                (key, engine, value, created_at, ttl),
            )
            conn.commit()
        finally:
            conn.close()


def cache_entry_count() -> int:
    """Return the number of rows currently in the cache."""
    path = _db_path_or_init()
    with _LOCK:
        conn = _connect(path)
        try:
            cur = conn.execute("SELECT COUNT(*) FROM cache")
            row = cur.fetchone()
            return int(row[0]) if row else 0
        finally:
            conn.close()


def purge_expired() -> int:
    """Delete expired rows; return the number of rows removed."""
    path = _db_path_or_init()
    now = time.time()
    with _LOCK:
        conn = _connect(path)
        try:
            cur = conn.execute("SELECT k, created_at, ttl FROM cache")
            expired = [
                r[0] for r in cur.fetchall()
                if r[1] is None or r[2] is None or (float(r[1]) + float(r[2]) <= now)
            ]
            if expired:
                conn.executemany("DELETE FROM cache WHERE k = ?", [(k,) for k in expired])
                conn.commit()
            return len(expired)
        finally:
            conn.close()


def enforce_cache_size_limit(max_bytes: int = _CACHE_MAX_BYTES) -> int:
    """Delete oldest rows while the DB file exceeds max_bytes; return rows removed."""
    path = _db_path_or_init()
    try:
        size = os.path.getsize(path)
    except OSError:
        return 0
    if size <= max_bytes:
        return 0
    removed = 0
    with _LOCK:
        conn = _connect(path)
        try:
            while True:
                try:
                    size = os.path.getsize(path)
                except OSError:
                    break
                if size <= max_bytes:
                    break
                cur = conn.execute(
                    "SELECT k FROM cache ORDER BY created_at ASC LIMIT 100"
                )
                oldest = [row[0] for row in cur.fetchall()]
                if not oldest:
                    break
                conn.executemany("DELETE FROM cache WHERE k = ?", [(k,) for k in oldest])
                conn.commit()
                removed += len(oldest)
        finally:
            conn.close()
    if removed:
        logger.info("cache size guard removed=%d max_bytes=%d", removed, max_bytes)
    return removed


# -- counters --

def new_request_stats() -> dict:
    """Create, install and return a fresh per-request stats dict."""
    stats = {"credits_used": 0, "cache_hits": 0}
    request_stats.set(stats)
    return stats


def lifetime_stats() -> dict:
    """Return a snapshot of process-lifetime counters."""
    with _LOCK:
        return dict(_lifetime)


def _bump_credit() -> None:
    stats = request_stats.get()
    if stats is not None:
        stats["credits_used"] = int(stats.get("credits_used", 0)) + 1
    with _LOCK:
        _lifetime["credits_used"] = int(_lifetime.get("credits_used", 0)) + 1


def _bump_hit() -> None:
    stats = request_stats.get()
    if stats is not None:
        stats["cache_hits"] = int(stats.get("cache_hits", 0)) + 1
    with _LOCK:
        _lifetime["cache_hits"] = int(_lifetime.get("cache_hits", 0)) + 1


# -- http client lifecycle --

async def init_serp() -> None:
    """Create (or recreate) the shared SerpAPI HTTP client."""
    global _client
    settings = get_settings()
    timeout = float(settings.serp_timeout_seconds)
    if _client is not None:
        try:
            await _client.aclose()
        except Exception:
            pass
        _client = None
    _client = httpx.AsyncClient(timeout=timeout)


async def close_serp() -> None:
    """Close the shared SerpAPI HTTP client if one exists."""
    global _client
    if _client is not None:
        try:
            await _client.aclose()
        except Exception:
            pass
        _client = None


def _get_or_create_client() -> httpx.AsyncClient:
    global _client
    if _client is None:
        settings = get_settings()
        _client = httpx.AsyncClient(timeout=float(settings.serp_timeout_seconds))
    return _client


def _redacted_detail(text: str) -> str:
    try:
        return redact(text)
    except Exception:
        return "[REDACTED]"


async def _fetch_from_serpapi(engine: str, params: dict[str, Any]) -> dict[str, Any]:
    settings = get_settings()
    api_key = settings.serpapi_key
    query = {"engine": engine, "api_key": api_key, **params}

    last_detail = ""
    for attempt in (0, 1):
        try:
            client = _get_or_create_client()
            response = await client.get(SERP_BASE_URL, params=query)
        except (httpx.TimeoutException, httpx.TransportError) as exc:
            last_detail = _redacted_detail(f"{type(exc).__name__}: {exc}")
            logger.warning("SerpAPI transport failure: %s", last_detail)
            if attempt == 0:
                await asyncio.sleep(_RETRY_BACKOFF_SECONDS)
                continue
            raise SerpError(_GENERIC_FAILURE_MESSAGE, detail=last_detail) from None

        status = response.status_code
        if status in (401, 403):
            detail = _redacted_detail(f"HTTP {status} from search provider")
            logger.warning("SerpAPI auth failure: %s", detail)
            raise SerpError(_AUTH_FAILURE_MESSAGE, detail=detail) from None
        if status == 429 or 500 <= status <= 599:
            # Never include raw bodies (may echo back keys/queries).
            detail = _redacted_detail(f"HTTP {status} from search provider")
            logger.warning("SerpAPI retryable status %s: %s", status, detail)
            if attempt == 0:
                await asyncio.sleep(_RETRY_BACKOFF_SECONDS)
                continue
            raise SerpError(_GENERIC_FAILURE_MESSAGE, detail=detail) from None
        if status != 200:
            detail = _redacted_detail(f"HTTP {status} from search provider")
            logger.warning("SerpAPI request failed: %s", detail)
            raise SerpError(_GENERIC_FAILURE_MESSAGE, detail=detail) from None

        try:
            payload = response.json()
        except Exception as exc:
            detail = _redacted_detail(f"Invalid JSON from search provider: {type(exc).__name__}")
            logger.warning("SerpAPI bad JSON: %s", detail)
            raise SerpError(_GENERIC_FAILURE_MESSAGE, detail=detail) from None
        if not isinstance(payload, dict):
            detail = _redacted_detail("Unexpected JSON shape from search provider")
            raise SerpError(_GENERIC_FAILURE_MESSAGE, detail=detail) from None
        return payload

    raise SerpError(_GENERIC_FAILURE_MESSAGE, detail=_redacted_detail(last_detail)) from None


async def serp(engine: str, **params: Any) -> dict:
    """Fetch SerpAPI results for an engine, using the SQLite cache when fresh."""
    # Compute key BEFORE adding api_key; api_key must never affect the key.
    key = cache_key(engine, params)
    ttl_seconds = _ttl_for_engine(engine)
    now = time.time()

    row = await asyncio.to_thread(_read_row, key)
    if row is not None:
        _, _, stored_v, created_at, stored_ttl = row
        try:
            age_ttl = float(stored_ttl)
            age_created = float(created_at)
        except (TypeError, ValueError):
            age_ttl = -1.0
            age_created = 0.0
        if now - age_created < age_ttl:
            try:
                payload = json.loads(stored_v)
            except Exception:
                payload = None
            if isinstance(payload, dict):
                _bump_hit()
                return payload
        # expired or corrupt -> fall through to live fetch

    # Cache miss: enforce the global daily credit budget. Cache hits above
    # stay free; live calls raise so the pipeline degrades instead of failing.
    try:
        serp_budget = int(get_settings().max_serp_calls_per_day)
    except (TypeError, ValueError):
        serp_budget = 0
    if not _budget_consume("serp", serp_budget):
        logger.warning("SerpAPI daily budget exhausted; refusing live call")
        raise SerpError(_SERPI_BUDGET_EXHAUSTED_MESSAGE)

    # Stampede protection: join an identical in-flight fetch if one exists.
    loop = asyncio.get_running_loop()
    with _LOCK:
        existing = _inflight.get(key)
        if existing is not None and (existing[0] is not loop or existing[1].done()):
            existing = None
        if existing is None:
            future: asyncio.Future = loop.create_future()
            # Avoid "exception was never retrieved" noise when the owner
            # fails and nobody is waiting.
            future.add_done_callback(_silence_unretrieved)
            _inflight[key] = (loop, future)
            owner = True
        else:
            future = existing[1]
            owner = False
    if not owner:
        return await asyncio.shield(future)

    try:
        payload = await _fetch_from_serpapi(engine, params)
    except BaseException as exc:
        if not future.done():
            try:
                future.set_exception(exc)
            except asyncio.InvalidStateError:
                pass
        raise
    finally:
        with _LOCK:
            if _inflight.get(key, (None, None))[1] is future:
                _inflight.pop(key, None)

    # Credit is counted only after a successful SerpAPI JSON response.
    _bump_credit()

    if "error" in payload:
        if _is_no_results_error(payload):
            await asyncio.to_thread(
                _write_row, key, engine, json.dumps(payload), time.time(),
                _NO_RESULTS_TTL_SECONDS,
            )
        # other errors are never cached
        if not future.done():
            future.set_result(payload)
        return payload

    await asyncio.to_thread(
        _write_row, key, engine, json.dumps(payload), time.time(), ttl_seconds
    )
    if not future.done():
        future.set_result(payload)
    return payload


def _silence_unretrieved(future: asyncio.Future) -> None:
    """Done-callback that marks a failed shared future as retrieved."""
    try:
        if not future.cancelled():
            future.exception()
    except Exception:
        pass
