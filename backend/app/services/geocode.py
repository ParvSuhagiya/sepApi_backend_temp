"""City/region geocoding for job pins and the map centre.

Optional (``GEOCODE_ENABLED``, default off) with Nominatim- or
Photon-shaped providers only. Only city/region-level strings are sent
(street detail and company names are stripped first); remote locations are
never sent. Results cache for 30 days in the existing SQLite cache (keys
are sha256 hashes, never location text), at most one upstream request per
second, at most ``GEOCODE_MAX_PER_REQUEST`` unique strings per request.
Geocoding is counted separately from SerpAPI credits (it never touches the
SerpAPI budget) and never raises: disabled or failing means ``None``
fields, never a failed request.
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import re
import threading
import time
from dataclasses import dataclass, field
from urllib.parse import urlsplit

import httpx

from app.config import get_settings
from app.schemas import Job
from app.services.serp import geocache_get, geocache_set

logger = logging.getLogger(__name__)

__all__ = [
    "is_remote_location",
    "normalise_location",
    "geocode_key",
    "geocode_many",
    "attach_job_coords",
    "geocode_city",
]

_GEOCODE_PREFIX = "geocode:"
_MIN_INTERVAL_SECONDS = 1.0
_UPSTREAM_TIMEOUT_SECONDS = 15.0
_MAX_QUERY_CHARS = 200

_PROVIDERS = ("nominatim", "photon")

#: addresstype values treated as city-level precision (Nominatim).
_CITY_ADDRESSTYPES = {"city", "town", "village", "municipality"}

#: Tokens that mark a location part as non-geographic (remote/work styles).
_REMOTE_TOKENS = {"remote", "hybrid", "wfh", "anywhere", "work", "from", "home"}

_SPLIT_RE = re.compile(r"[,;\n|/\u2013\u2014-]+")
_TOKEN_RE = re.compile(r"[a-z]+")


@dataclass
class _Provider:
    """Validated, active geocoding configuration."""

    name: str
    base_url: str
    user_agent: str


@dataclass
class GeocodeBatch:
    """Results keyed by normalised string, plus separate call accounting."""

    results: dict[str, tuple[float, float, str] | None] = field(default_factory=dict)
    upstream_calls: int = 0
    cache_hits: int = 0


_pace_lock = threading.Lock()
_last_call_ts = 0.0


def _active_config() -> _Provider | None:
    """Return validated provider config, or None (with a log line) when off."""
    try:
        settings = get_settings()
        enabled = bool(settings.geocode_enabled)
        provider = (settings.geocode_provider or "").strip().lower()
        base_url = (settings.geocode_base_url or "").strip().rstrip("/")
        user_agent = (settings.geocode_user_agent or "").strip()
    except Exception:
        logger.warning("geocode misconfigured; geocoding disabled")
        return None
    if not enabled:
        logger.debug("geocode disabled")
        return None
    if provider not in _PROVIDERS:
        logger.warning("geocode disabled: unknown provider")
        return None
    try:
        parts = urlsplit(base_url)
    except ValueError:
        logger.warning("geocode disabled: invalid base URL")
        return None
    if not base_url or parts.scheme not in ("http", "https") or not parts.hostname:
        logger.warning("geocode disabled: invalid base URL")
        return None
    if not user_agent:
        logger.warning("geocode disabled: GEOCODE_USER_AGENT is required when enabled")
        return None
    return _Provider(name=provider, base_url=base_url, user_agent=user_agent)


def is_remote_location(value: object) -> bool:
    """True for remote-style locations ("Remote", "Anywhere") that get no pin."""
    if not isinstance(value, str):
        return False
    tokens = set(_TOKEN_RE.findall(value.casefold()))
    if not tokens:
        return False
    return bool(tokens & {"remote", "anywhere", "wfh"}) and tokens <= _REMOTE_TOKENS


def normalise_location(location: object, company: object = None) -> str | None:
    """Reduce a location to a city/region query; None when remote or empty.

    Splits on separators, drops remote-style parts, parts matching the
    company name, and parts with digits (street numbers, sectors, pincodes).
    Never raises.
    """
    try:
        if not isinstance(location, str):
            return None
        text = " ".join(location.split()).strip()
        if not text:
            return None
        company_name = company.strip().casefold() if isinstance(company, str) else ""
        kept: list[str] = []
        for part in _SPLIT_RE.split(text):
            part = part.strip(" \t.,")
            if not part:
                continue
            lowered = part.casefold()
            tokens = set(_TOKEN_RE.findall(lowered))
            if tokens and tokens <= _REMOTE_TOKENS:
                continue
            if company_name and lowered == company_name:
                continue
            if re.search(r"\d", part):
                continue
            kept.append(part)
        if not kept:
            return None
        return ", ".join(kept)[:_MAX_QUERY_CHARS].strip() or None
    except Exception:
        return None


def geocode_key(normalised: str) -> str:
    """Cache key: sha256 of the normalised string (never location text)."""
    return _GEOCODE_PREFIX + hashlib.sha256(normalised.casefold().encode("utf-8")).hexdigest()


def _valid_lat(value: object) -> float | None:
    try:
        number = float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError, OverflowError):
        return None
    if number != number or not -90.0 <= number <= 90.0:
        return None
    return number


def _valid_lng(value: object) -> float | None:
    try:
        number = float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError, OverflowError):
        return None
    if number != number or not -180.0 <= number <= 180.0:
        return None
    return number


def _parse_nominatim(data: object) -> tuple[float, float, str] | None:
    if not isinstance(data, list) or not data or not isinstance(data[0], dict):
        return None
    item = data[0]
    lat = _valid_lat(item.get("lat"))
    lng = _valid_lng(item.get("lon"))
    if lat is None or lng is None:
        return None
    addresstype = item.get("addresstype")
    precision = "city" if isinstance(addresstype, str) and addresstype in _CITY_ADDRESSTYPES else "approximate"
    return lat, lng, precision


def _parse_photon(data: object) -> tuple[float, float, str] | None:
    if not isinstance(data, dict):
        return None
    features = data.get("features")
    if not isinstance(features, list) or not features or not isinstance(features[0], dict):
        return None
    geometry = features[0].get("geometry")
    coords = geometry.get("coordinates") if isinstance(geometry, dict) else None
    if not isinstance(coords, list) or len(coords) < 2:
        return None
    lng = _valid_lng(coords[0])
    lat = _valid_lat(coords[1])
    if lat is None or lng is None:
        return None
    props = features[0].get("properties")
    city_like = (
        isinstance(props, dict)
        and any(key in props for key in ("city", "town", "village"))
    )
    return lat, lng, "city" if city_like else "approximate"


async def _pace() -> None:
    """Enforce at most one upstream request per second (process-wide)."""
    global _last_call_ts
    while True:
        with _pace_lock:
            now = time.monotonic()
            wait = _MIN_INTERVAL_SECONDS - (now - _last_call_ts)
            if wait <= 0:
                _last_call_ts = now
                return
        await asyncio.sleep(wait)


async def _fetch(
    client: httpx.AsyncClient, cfg: _Provider, query: str
) -> tuple[float, float, str] | None:
    """One provider call; None on any transport/status/shape failure."""
    try:
        if cfg.name == "photon":
            response = await client.get(cfg.base_url + "/api", params={"q": query, "limit": 1})
        else:
            response = await client.get(
                cfg.base_url + "/search",
                params={"q": query, "format": "jsonv2", "limit": 1, "addressdetails": 1},
            )
    except (httpx.TimeoutException, httpx.TransportError) as exc:
        logger.warning("geocode transport failure: %s", type(exc).__name__)
        return None
    status = response.status_code
    if status == 429 or 500 <= status <= 599:
        logger.warning("geocode retryable status %s", status)
        return None
    if status != 200:
        logger.warning("geocode request failed with status %s", status)
        return None
    try:
        data = response.json()
    except Exception:
        logger.warning("geocode bad JSON response")
        return None
    try:
        if cfg.name == "photon":
            return _parse_photon(data)
        return _parse_nominatim(data)
    except Exception:
        logger.warning("geocode unparseable response shape")
        return None


def _parse_cached(blob: str | None) -> tuple[float, float, str] | None:
    if not blob:
        return None
    try:
        data = json.loads(blob)
    except (TypeError, ValueError):
        return None
    if not isinstance(data, list) or len(data) != 3:
        return None
    lat = _valid_lat(data[0])
    lng = _valid_lng(data[1])
    precision = data[2]
    if lat is None or lng is None or precision not in ("city", "approximate"):
        return None
    return lat, lng, precision


async def geocode_many(locations: object) -> GeocodeBatch:
    """Geocode normalised-or-raw strings; never raises.

    Results are keyed by normalised string. Only the first
    ``GEOCODE_MAX_PER_REQUEST`` unique strings are processed; the rest map
    to None. Failures are never cached.
    """
    batch = GeocodeBatch()
    try:
        cfg = _active_config()
    except Exception:
        return batch
    if cfg is None:
        return batch
    try:
        cap = max(0, int(get_settings().geocode_max_per_request))
    except (TypeError, ValueError):
        cap = 0
    uniques: list[str] = []
    seen: set[str] = set()
    try:
        candidates = list(locations or [])
    except TypeError:
        return batch
    for raw in candidates:
        try:
            norm = normalise_location(raw)
        except Exception:
            continue
        if not norm:
            continue
        key = norm.casefold()
        if key in seen:
            continue
        seen.add(key)
        uniques.append(norm)
    for norm in uniques[:cap]:
        batch.results[norm] = None
        try:
            cached = await asyncio.to_thread(geocache_get, geocode_key(norm))
        except Exception:
            cached = None
        parsed = _parse_cached(cached)
        if parsed is not None:
            batch.results[norm] = parsed
            batch.cache_hits += 1
    pending = [norm for norm in uniques[:cap] if batch.results.get(norm) is None]
    if not pending:
        return batch
    try:
        timeout = httpx.Timeout(_UPSTREAM_TIMEOUT_SECONDS)
        async with httpx.AsyncClient(
            timeout=timeout, headers={"User-Agent": cfg.user_agent}
        ) as client:
            for norm in pending:
                await _pace()
                try:
                    result = await _fetch(client, cfg, norm)
                except Exception:
                    result = None
                if result is None:
                    continue
                batch.upstream_calls += 1
                batch.results[norm] = result
                try:
                    await asyncio.to_thread(
                        geocache_set, geocode_key(norm), json.dumps([result[0], result[1], result[2]])
                    )
                except Exception:
                    pass
    except Exception:
        logger.warning("geocode batch aborted")
    return batch


async def attach_job_coords(jobs: list[Job]) -> tuple[list[Job], dict[str, int]]:
    """Attach (lat, lng, geo_precision) to jobs; never raises.

    Remote or unresolvable locations keep None fields. Returns the new job
    list and separate call accounting (never SerpAPI credits).
    """
    zeros = {"upstream_calls": 0, "cache_hits": 0}
    try:
        items = list(jobs or [])
    except Exception:
        return [], zeros
    if not items:
        return [], zeros
    norms: list[str | None] = []
    for job in items:
        try:
            if isinstance(job, Job):
                norms.append(normalise_location(job.location, job.company))
            else:
                norms.append(None)
        except Exception:
            norms.append(None)
    unique_norms = list(dict.fromkeys(n for n in norms if n))
    try:
        batch = await geocode_many(unique_norms)
    except Exception:
        return items, zeros
    out: list[Job] = []
    for job, norm in zip(items, norms):
        if not isinstance(job, Job) or norm is None:
            out.append(job)
            continue
        hit = batch.results.get(norm)
        if hit is None:
            out.append(job)
            continue
        try:
            out.append(job.model_copy(update={"lat": hit[0], "lng": hit[1], "geo_precision": hit[2]}))
        except Exception:
            out.append(job)
    return out, {"upstream_calls": batch.upstream_calls, "cache_hits": batch.cache_hits}


async def geocode_city(city: object) -> tuple[float, float] | None:
    """Geocode one city string for the map centre; None when unavailable."""
    try:
        if not isinstance(city, str) or not city.strip():
            return None
        batch = await geocode_many([city])
    except Exception:
        return None
    for result in batch.results.values():
        if result is not None:
            return (result[0], result[1])
    return None
