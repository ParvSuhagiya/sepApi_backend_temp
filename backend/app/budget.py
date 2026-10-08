"""Process-wide, UTC-day-bucketed credit circuit breakers.

SerpAPI and LLM calls share one reservation mechanism: each live (non-cache)
call reserves one unit of the configured daily budget. A limit of 0 (or less)
means unlimited. Counters reset automatically when the UTC day rolls over.

The clock is injectable so tests can simulate a new day without waiting.
"""

from __future__ import annotations

import datetime as _datetime
import threading
from typing import Callable

__all__ = [
    "try_consume",
    "remaining",
    "used_today",
    "seconds_until_rollover",
    "reset_budgets",
    "set_clock",
    "reset_clock",
]

_LOCK = threading.Lock()
# kind -> (utc-day iso string, count used that day)
_COUNTS: dict[str, tuple[str, int]] = {}
_CLOCK: Callable[[], _datetime.datetime] = lambda: _datetime.datetime.now(
    _datetime.timezone.utc
)


def set_clock(fn: Callable[[], _datetime.datetime]) -> None:
    """Override the clock (tests only)."""
    global _CLOCK
    with _LOCK:
        _CLOCK = fn


def reset_clock() -> None:
    """Restore the real UTC clock."""
    global _CLOCK
    with _LOCK:
        _CLOCK = lambda: _datetime.datetime.now(_datetime.timezone.utc)  # noqa: E731


def _today() -> str:
    try:
        return _CLOCK().date().isoformat()
    except Exception:
        return _datetime.datetime.now(_datetime.timezone.utc).date().isoformat()


def _normalise_limit(limit: object) -> int:
    try:
        return int(limit)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return 0


def try_consume(kind: str, limit: object) -> bool:
    """Reserve one unit of ``kind`` budget; False when exhausted (nothing consumed).

    A non-positive limit means unlimited (always True, nothing recorded).
    """
    budget = _normalise_limit(limit)
    if budget <= 0:
        return True
    today = _today()
    with _LOCK:
        day, used = _COUNTS.get(kind, (today, 0))
        if day != today:
            used = 0
            day = today
        if used >= budget:
            _COUNTS[kind] = (day, used)
            return False
        _COUNTS[kind] = (day, used + 1)
        return True


def used_today(kind: str) -> int:
    """Units of ``kind`` consumed in the current UTC day."""
    today = _today()
    with _LOCK:
        day, used = _COUNTS.get(kind, (today, 0))
        return used if day == today else 0


def remaining(kind: str, limit: object) -> int | None:
    """Units of ``kind`` left today, or None when unlimited."""
    budget = _normalise_limit(limit)
    if budget <= 0:
        return None
    return max(0, budget - used_today(kind))


def seconds_until_rollover() -> int:
    """Seconds from now until the next UTC midnight (for Retry-After)."""
    try:
        now = _CLOCK()
        if now.tzinfo is None:
            now = now.replace(tzinfo=_datetime.timezone.utc)
    except Exception:
        now = _datetime.datetime.now(_datetime.timezone.utc)
    midnight = (now + _datetime.timedelta(days=1)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    return max(1, int((midnight - now).total_seconds()))


def reset_budgets() -> None:
    """Clear all counters (used on startup and in tests)."""
    with _LOCK:
        _COUNTS.clear()
