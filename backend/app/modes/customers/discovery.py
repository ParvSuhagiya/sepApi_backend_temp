"""Customer-mode discovery: plan Maps queries -> candidate businesses.

SSRF-safety rule: this module (and the whole customer pipeline) makes NO
requests to third-party sites other than SerpAPI. Lead websites are stored
as display strings only and are never fetched. ``test_discovery_ssrf`` pins
this: with only ``serpapi.com`` mocked, discovery must succeed without any
other host being contacted.
"""

from __future__ import annotations

import asyncio
import logging
import math
import re
import unicodedata
from dataclasses import dataclass, field
from urllib.parse import urlsplit

from app.errors import AllSourcesFailed, SerpError
from app.modes.customers import breaker as _breaker_mod
from app.modes.customers.schemas import LeadPlan, LeadPlace
from app.services import serp as _serp_mod
from app.services.serp import is_no_results_error

logger = logging.getLogger(__name__)

__all__ = [
    "MAPS_ENGINE",
    "DiscoveryResult",
    "discover",
    "normalise_place",
    "dedupe_places",
    "parse_review_count",
    "parse_price_level",
    "parse_rating",
    "parse_phone",
    "parse_website",
    "parse_maps_url",
]

#: The only SerpAPI engine discovery uses. Never the Jobs engine.
MAPS_ENGINE = "google_maps"

_TAG_RE = re.compile(r"<[^<>]{0,500}>")
_NUMBER_RE = re.compile(r"([\d][\d.,]*)\s*([kKmM]?)")
_PHONE_SUB_RE = re.compile(r"\+?[\d][\d\s\-()]{5,}[\d]")
_URL_RE = re.compile(r"https?://\S+|www\.\S+", re.IGNORECASE)
_EMAIL_RE = re.compile(r"\S+@\S+\.\S+")

_CLOSED_PHRASES = ("permanently closed", "temporarily closed")

_PRICE_WORDS: dict[str, int] = {
    "cheap": 1,
    "inexpensive": 1,
    "budget": 1,
    "affordable": 1,
    "moderate": 2,
    "mid-range": 2,
    "mid range": 2,
    "midrange": 2,
    "casual": 2,
    "expensive": 3,
    "upscale": 3,
    "premium": 3,
    "luxury": 4,
    "fine dining": 4,
    "fine-dining": 4,
}


@dataclass
class DiscoveryResult:
    """Candidates plus Maps-source health for ``meta`` (wired in prompt 3)."""

    places: list[LeadPlace] = field(default_factory=list)
    maps_partial: bool = False
    queries_run: int = 0
    queries_failed: int = 0


def _clean_text(value: object) -> str:
    """Strip HTML tags and control characters; collapse whitespace."""
    if not isinstance(value, str):
        return ""
    no_tags = _TAG_RE.sub("", value)
    without_controls = "".join(
        " " if unicodedata.category(char) == "Cc" else char for char in no_tags
    )
    return " ".join(without_controls.split())


def parse_rating(value: object) -> float | None:
    """Best-effort 0..5 rating; None when missing, unusable or out of range."""
    if isinstance(value, bool):
        return None
    number: float | None = None
    if isinstance(value, (int, float)):
        try:
            number = float(value)
        except (TypeError, ValueError, OverflowError):
            return None
    elif isinstance(value, str):
        cleaned = value.strip().replace(",", "")
        if not cleaned:
            return None
        match = _NUMBER_RE.search(cleaned)
        if not match:
            return None
        try:
            number = float(match.group(1).replace(",", ""))
        except ValueError:
            return None
    else:
        return None
    if number is None or not math.isfinite(number):
        return None
    if not 0.0 <= number <= 5.0:
        return None
    return number


def parse_review_count(value: object) -> int | None:
    """Parse counts like 320, "1,234", "1.2K reviews"; None when unusable."""
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value if value >= 0 else None
    if isinstance(value, float):
        return int(value) if math.isfinite(value) and value >= 0 else None
    if not isinstance(value, str):
        return None
    match = _NUMBER_RE.search(value.strip().replace(",", ""))
    if not match:
        return None
    try:
        number = float(match.group(1))
    except ValueError:
        return None
    suffix = match.group(2).lower()
    if suffix == "k":
        number *= 1_000
    elif suffix == "m":
        number *= 1_000_000
    if not math.isfinite(number) or number < 0:
        return None
    return int(number)


def parse_price_level(value: object) -> int | None:
    """Normalise "$$", "₹₹", "₹200-400" (and a few words) to 1..4 or None."""
    if isinstance(value, bool):
        return None
    if isinstance(value, int) and not isinstance(value, bool):
        return value if 1 <= value <= 4 else None
    if isinstance(value, float):
        return int(value) if math.isfinite(value) and 1 <= value <= 4 else None
    if not isinstance(value, str):
        return None
    text = _clean_text(value)
    if not text:
        return None
    symbols = sum(1 for char in text if char in "$₹")
    if symbols:
        return max(1, min(symbols, 4))
    lowered = text.casefold()
    for phrase, level in _PRICE_WORDS.items():
        if phrase in lowered:
            return level
    return None


def parse_phone(value: object) -> str | None:
    """Keep digit strings of 7..15 digits; anything else becomes None."""
    if not isinstance(value, str):
        return None
    digits = re.sub(r"\D", "", value)
    if 7 <= len(digits) <= 15:
        return digits
    return None


def _parse_http_url(value: object, max_len: int) -> str | None:
    if not isinstance(value, str):
        return None
    cleaned = value.strip()
    if not cleaned or len(cleaned) > max_len:
        return None
    if not cleaned.lower().startswith(("http://", "https://")):
        return None
    try:
        parts = urlsplit(cleaned)
    except ValueError:
        return None
    if not parts.hostname:
        return None
    return cleaned


def parse_website(value: object) -> str | None:
    """Keep only parseable http(s) URLs up to 200 chars."""
    return _parse_http_url(value, 200)


def parse_maps_url(value: object) -> str | None:
    """Keep only Google Maps URLs (google.com hosts or maps.app.goo.gl)."""
    if not isinstance(value, str):
        return None
    cleaned = value.strip()
    if not cleaned or len(cleaned) > 500:
        return None
    if not cleaned.lower().startswith(("http://", "https://")):
        return None
    try:
        host = (urlsplit(cleaned).hostname or "").lower()
    except ValueError:
        return None
    if host == "maps.app.goo.gl" or host == "google.com" or host.endswith(".google.com"):
        return cleaned
    return None


def _is_closed(item: dict) -> bool:
    """True for permanently/temporarily closed listings (dropped)."""
    if item.get("closed") is True:
        return True
    for key in ("operating_status", "open_state", "hours"):
        raw = item.get(key)
        if isinstance(raw, str) and any(
            phrase in raw.casefold() for phrase in _CLOSED_PHRASES
        ):
            return True
    return False


def _first_text(item: dict, *keys: str) -> str | None:
    for key in keys:
        cleaned = _clean_text(item.get(key))
        if cleaned:
            return cleaned
    return None


def normalise_place(item: object) -> LeadPlace | None:
    """Normalise one raw Maps item; None drops (no name, closed, invalid)."""
    if not isinstance(item, dict):
        return None
    if _is_closed(item):
        return None
    name = _clean_text(item.get("title")) or _clean_text(item.get("name"))
    if not name:
        return None
    maps_url: str | None = None
    for key in ("maps_url", "link", "share_link", "url"):
        candidate = parse_maps_url(item.get(key))
        if candidate is not None:
            maps_url = candidate
            break
    try:
        return LeadPlace(
            name=name[:200],
            type=(_first_text(item, "type", "category") or "")[:120] or None,
            address=(_first_text(item, "address") or "")[:300] or None,
            rating=parse_rating(item.get("rating")),
            review_count=parse_review_count(item.get("reviews")),
            price_level=parse_price_level(item.get("price_level", item.get("price"))),
            phone=parse_phone(item.get("phone")),
            website=parse_website(item.get("website")),
            maps_url=maps_url,
            place_id=_first_text(item, "place_id", "data_id", "data_cid"),
            operating_status=_first_text(item, "operating_status", "open_state"),
        )
    except Exception:
        return None


def dedupe_places(places: list[LeadPlace]) -> list[LeadPlace]:
    """Dedupe by place_id, else normalised name+address; keep first-seen order."""
    seen: set[str] = set()
    unique: list[LeadPlace] = []
    for place in places:
        if place.place_id:
            key = "id:" + place.place_id.strip().casefold()
        else:
            key = (
                "na:"
                + place.name.strip().casefold()
                + "|"
                + (place.address or "").strip().casefold()
            )
        if key in seen:
            continue
        seen.add(key)
        unique.append(place)
    return unique


async def _fetch_query(
    semaphore: asyncio.Semaphore, query: str
) -> dict | BaseException:
    async with semaphore:
        if not _breaker_mod.allow(MAPS_ENGINE):
            return SerpError("Search provider short-circuited after repeated failures")
        try:
            result = await _serp_mod.serp(MAPS_ENGINE, q=query, type="search")
        except asyncio.CancelledError:
            raise  # deadlines must propagate, never become partial data
        except BaseException as exc:  # noqa: BLE001 - gathered below
            _breaker_mod.record_failure(MAPS_ENGINE)
            return exc
        if (
            isinstance(result, dict)
            and "error" in result
            and not is_no_results_error(result)
        ):
            _breaker_mod.record_failure(MAPS_ENGINE)
        else:
            _breaker_mod.record_success(MAPS_ENGINE)
        return result


async def discover(plan: LeadPlan) -> DiscoveryResult:
    """Run the plan's 3 Maps queries concurrently; normalise + dedupe.

    One failing query sets ``maps_partial``; all failing raises
    :class:`AllSourcesFailed` (the existing friendly 502).
    """
    semaphore = asyncio.Semaphore(3)
    raw_results = await asyncio.gather(
        *(_fetch_query(semaphore, query) for query in plan.maps_queries),
        return_exceptions=True,
    )
    failed = 0
    places: list[LeadPlace] = []
    for result in raw_results:
        if isinstance(result, BaseException):
            failed += 1
            logger.warning(
                "lead discovery fetch failed: %s", type(result).__name__
            )
        elif (
            isinstance(result, dict)
            and "error" in result
            and not is_no_results_error(result)
        ):
            failed += 1
            logger.warning("lead discovery provider error payload")
        elif isinstance(result, dict):
            items = result.get("local_results")
            if isinstance(items, list):
                for item in items:
                    place = normalise_place(item)
                    if place is not None:
                        places.append(place)
        else:
            failed += 1
    if failed == len(plan.maps_queries):
        raise AllSourcesFailed()
    return DiscoveryResult(
        places=dedupe_places(places),
        maps_partial=failed > 0,
        queries_run=len(plan.maps_queries),
        queries_failed=failed,
    )
