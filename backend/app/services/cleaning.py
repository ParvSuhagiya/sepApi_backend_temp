"""Turn raw SerpAPI JSON into compact, safe objects.

Every parser is defensive: any key may be missing or None, list items may
have the wrong type, and malformed entries are skipped instead of raising.
"""

import math
import re
import unicodedata
from typing import Any

from app.schemas import ForumItem, Job, Place, TrendPoint
from app.services.scam import scan_job
from app.utils import clamp_int, safe_get, truncate

__all__ = [
    "clean_jobs",
    "clean_places",
    "build_trend",
    "trend_growth_for",
    "choose_trend",
    "clean_forum",
]

_TAG_RE = re.compile(r"<[^<>]{0,500}>")


def _text(value: object) -> str:
    """Strip control characters, collapse whitespace; non-strings become ""."""
    if not isinstance(value, str):
        return ""
    without_controls = "".join(
        " " if unicodedata.category(char) == "Cc" else char for char in value
    )
    return " ".join(without_controls.split())


def _opt_text(value: object) -> str | None:
    """Cleaned string, or None when empty/missing."""
    return _text(value) or None


def _http_link(value: object) -> str | None:
    """Return the stripped URL only when it uses http(s); else None."""
    if not isinstance(value, str):
        return None
    cleaned = value.strip()
    if cleaned.lower().startswith(("http://", "https://")):
        return cleaned
    return None


def _to_int(value: object, default: int = 0) -> int:
    """Best-effort int coercion for trend values; never raises."""
    if isinstance(value, bool):
        return default
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value) if math.isfinite(value) else default
    if isinstance(value, str):
        cleaned = value.strip().replace(",", "")
        if not cleaned:
            return default
        try:
            return int(cleaned)
        except ValueError:
            try:
                number = float(cleaned)
            except ValueError:
                return default
            return int(number) if math.isfinite(number) else default
    return default


def _to_float(value: object) -> float | None:
    """Best-effort float coercion for ratings; None when unusable."""
    if isinstance(value, bool):
        return None
    try:
        number = float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError, OverflowError):
        return None
    return number if math.isfinite(number) else None


def _to_coord(value: object, lo: float, hi: float) -> float | None:
    """Best-effort coordinate coercion; None when missing/unusable/out of range."""
    number = _to_float(value)
    if number is None or not lo <= number <= hi:
        return None
    return number


def _gps_coords(item: dict) -> tuple[float | None, float | None]:
    """Extract (lat, lng) from a SerpAPI gps_coordinates block or flat keys."""
    source: Any = item.get("gps_coordinates")
    if isinstance(source, dict):
        lat_raw = source.get("latitude", source.get("lat"))
        lng_raw = source.get("longitude", source.get("lng"))
    else:
        lat_raw = item.get("latitude", item.get("lat"))
        lng_raw = item.get("longitude", item.get("lng"))
    return _to_coord(lat_raw, -90.0, 90.0), _to_coord(lng_raw, -180.0, 180.0)


def _build_job(item: dict) -> Job:
    title_raw = item.get("title") if isinstance(item.get("title"), str) else ""
    desc_raw = item.get("description") if isinstance(item.get("description"), str) else ""
    flags, risk = scan_job(title_raw, desc_raw)

    desc = truncate(_text(_TAG_RE.sub("", desc_raw)), 300)

    link: str | None = None
    apply_options = item.get("apply_options")
    if isinstance(apply_options, list):
        for option in apply_options:
            if not isinstance(option, dict):
                continue
            candidate = _http_link(option.get("link"))
            if candidate is not None:
                link = candidate
                break
    if link is None:
        link = _http_link(item.get("share_link"))

    salary_raw = safe_get(item, "detected_extensions", "salary")
    if isinstance(salary_raw, str):
        salary = _text(salary_raw) or None
    elif salary_raw is None:
        salary = None
    else:
        salary = _text(str(salary_raw)) or None

    return Job(
        title=_text(item.get("title")),
        company=_text(item.get("company_name")),
        location=_text(item.get("location")),
        via=_text(item.get("via")),
        salary=salary,
        desc=desc,
        link=link,
        flags=flags,
        risk=risk,
    )


def clean_jobs(responses: list[dict], cap: int = 8) -> list[Job]:
    """Merge jobs_results, dedupe by (title, company), keep first-seen order."""
    try:
        limit = max(int(cap), 0)
    except (TypeError, ValueError):
        limit = 8
    if limit == 0:
        return []
    merged: list[object] = []
    for response in responses or []:
        if not isinstance(response, dict):
            continue
        items = response.get("jobs_results")
        if isinstance(items, list):
            merged.extend(items)
    jobs: list[Job] = []
    seen: set[tuple[str, str]] = set()
    for item in merged:
        if not isinstance(item, dict):
            continue
        key = (_text(item.get("title")).lower(), _text(item.get("company_name")).lower())
        if key in seen:
            continue
        seen.add(key)
        try:
            jobs.append(_build_job(item))
        except Exception:
            continue
        if len(jobs) >= limit:
            break
    return jobs


def _build_place(item: dict) -> Place:
    rating = _to_float(item.get("rating"))

    reviews_raw = item.get("reviews")
    if isinstance(reviews_raw, bool):
        reviews: int | None = None
    elif isinstance(reviews_raw, int):
        reviews = reviews_raw
    elif isinstance(reviews_raw, float):
        reviews = int(reviews_raw) if math.isfinite(reviews_raw) else None
    elif isinstance(reviews_raw, str):
        reviews = clamp_int(
            reviews_raw.strip().replace(",", ""), 0, 1_000_000_000, default=None
        )
    else:
        reviews = None

    lat, lng = _gps_coords(item)

    return Place(
        name=_text(item.get("title")),
        rating=rating,
        reviews=reviews,
        phone=_opt_text(item.get("phone")),
        address=_opt_text(item.get("address")),
        type=_opt_text(item.get("type")),
        lat=lat,
        lng=lng,
    )


def clean_places(responses: list[dict], per_query: int = 5) -> list[Place]:
    """Take the first per_query local_results per response, dedupe by (name, address)."""
    try:
        per = max(int(per_query), 0)
    except (TypeError, ValueError):
        per = 5
    places: list[Place] = []
    seen: set[tuple[str, str]] = set()
    for response in responses or []:
        if not isinstance(response, dict):
            continue
        items = response.get("local_results")
        if not isinstance(items, list):
            continue
        for item in items[:per]:
            if not isinstance(item, dict):
                continue
            key = (_text(item.get("title")).lower(), _text(item.get("address")).lower())
            if key in seen:
                continue
            seen.add(key)
            try:
                places.append(_build_place(item))
            except Exception:
                continue
    return places


def build_trend(response: dict) -> list[TrendPoint]:
    """Build dated trend points; skip malformed entries."""
    if not isinstance(response, dict):
        return []
    timeline = safe_get(response, "interest_over_time", "timeline_data")
    if not isinstance(timeline, list):
        return []
    points: list[TrendPoint] = []
    for entry in timeline:
        if not isinstance(entry, dict):
            continue
        date = entry.get("date")
        if date is None:
            continue
        date_str = date if isinstance(date, str) else str(date)
        if not date_str.strip():
            continue
        values = entry.get("values")
        extracted: object = 0
        if isinstance(values, list) and values and isinstance(values[0], dict):
            extracted = values[0].get("extracted_value", 0)
        try:
            points.append(TrendPoint(date=date_str.strip(), value=_to_int(extracted, 0)))
        except Exception:
            continue
    return points


def trend_growth_for(series: list[TrendPoint]) -> int:
    """Percent change of the last-4 mean vs the first-4 mean; 0 when < 8 points."""
    if not series or len(series) < 8:
        return 0
    try:
        first = sum(point.value for point in series[:4]) / 4
        last = sum(point.value for point in series[-4:]) / 4
    except Exception:
        return 0
    return int(round((last - first) / max(first, 1) * 100))


def choose_trend(
    keywords: list[str], responses: list[dict | None]
) -> tuple[list[TrendPoint], str | None, dict[str, int]]:
    """Chart the first keyword with data; ([], None, {}) when nothing has data."""
    growth: dict[str, int] = {}
    charted: list[TrendPoint] = []
    charted_keyword: str | None = None
    for keyword, response in zip(keywords or [], responses or []):
        if not isinstance(keyword, str) or not keyword.strip():
            continue
        series = build_trend(response) if isinstance(response, dict) else []
        if not series:
            continue
        growth[keyword] = trend_growth_for(series)
        if charted_keyword is None:
            charted = series
            charted_keyword = keyword
    if charted_keyword is None:
        return ([], None, {})
    return (charted, charted_keyword, growth)


def clean_forum(responses: list[dict], cap: int = 4) -> list[ForumItem]:
    """First cap valid organic_results (forum_results fallback); http(s) links only."""
    try:
        limit = max(int(cap), 0)
    except (TypeError, ValueError):
        limit = 4
    if limit == 0:
        return []
    items: list[object] = []
    for response in responses or []:
        if not isinstance(response, dict):
            continue
        results = response.get("organic_results")
        if not isinstance(results, list):
            results = response.get("forum_results")
        if isinstance(results, list):
            items.extend(results)
    forum: list[ForumItem] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        link = _http_link(item.get("link"))
        if link is None:
            continue
        try:
            forum.append(
                ForumItem(
                    title=_text(item.get("title")),
                    link=link,
                    snippet=truncate(_text(item.get("snippet")), 240),
                )
            )
        except Exception:
            continue
        if len(forum) >= limit:
            break
    return forum
