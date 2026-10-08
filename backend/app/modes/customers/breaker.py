"""Per-engine circuit breaker for customer-mode SerpAPI calls.

After 5 consecutive upstream failures for an engine within 60 s, that
engine short-circuits for 30 s: calls fail fast (so the pipeline degrades
to cached/partial data instead of waiting on timeouts) with a clear log
line. Any success closes the circuit immediately. The clock is injectable
for tests.
"""

from __future__ import annotations

import datetime as _datetime
import logging
import threading
from typing import Callable

logger = logging.getLogger(__name__)

__all__ = [
    "CIRCUIT_FAILURE_THRESHOLD",
    "CIRCUIT_WINDOW_SECONDS",
    "CIRCUIT_OPEN_SECONDS",
    "allow",
    "record_success",
    "record_failure",
    "reset_breakers",
    "set_clock",
    "reset_clock",
]

#: Consecutive failures within the window that trip the breaker.
CIRCUIT_FAILURE_THRESHOLD = 5
#: Seconds in which the consecutive failures must occur.
CIRCUIT_WINDOW_SECONDS = 60.0
#: Seconds an open circuit stays short-circuited.
CIRCUIT_OPEN_SECONDS = 30.0

_LOCK = threading.Lock()
# engine -> {"failures": int, "window_start": float, "opened_until": float | None}
_STATE: dict[str, dict[str, float | int | None]] = {}


def _utcnow() -> _datetime.datetime:
    return _datetime.datetime.now(_datetime.timezone.utc)


_CLOCK: Callable[[], _datetime.datetime] = _utcnow


def set_clock(fn: Callable[[], _datetime.datetime]) -> None:
    """Override the clock (tests only)."""
    global _CLOCK
    with _LOCK:
        _CLOCK = fn


def reset_clock() -> None:
    """Restore the real UTC clock."""
    global _CLOCK
    with _LOCK:
        _CLOCK = _utcnow


def _now() -> float:
    try:
        current = _CLOCK()
        if current.tzinfo is None:
            current = current.replace(tzinfo=_datetime.timezone.utc)
        return current.timestamp()
    except Exception:
        return _datetime.datetime.now(_datetime.timezone.utc).timestamp()


def reset_breakers() -> None:
    """Clear all breaker state (used in tests)."""
    with _LOCK:
        _STATE.clear()


def _entry_locked(engine: str) -> dict:
    entry = _STATE.get(engine)
    if entry is None:
        entry = {"failures": 0, "window_start": 0.0, "opened_until": None}
        _STATE[engine] = entry
    return entry


def allow(engine: str) -> bool:
    """True when the engine may be called; False while short-circuited."""
    now = _now()
    with _LOCK:
        entry = _entry_locked(engine)
        opened_until = entry.get("opened_until")
        if isinstance(opened_until, (int, float)) and now < float(opened_until):
            logger.warning(
                "circuit open engine=%s refusing call for %.0fs",
                engine,
                float(opened_until) - now,
            )
            return False
        if isinstance(opened_until, (int, float)):
            entry["opened_until"] = None
            entry["failures"] = 0
            entry["window_start"] = now
        return True


def record_success(engine: str) -> None:
    """Close the circuit (real or half-open) on any success."""
    with _LOCK:
        entry = _entry_locked(engine)
        entry["failures"] = 0
        entry["window_start"] = _now()
        entry["opened_until"] = None


def record_failure(engine: str) -> None:
    """Count a consecutive failure; trip the breaker at the threshold."""
    now = _now()
    with _LOCK:
        entry = _entry_locked(engine)
        try:
            window_start = float(entry.get("window_start") or 0.0)
        except (TypeError, ValueError):
            window_start = 0.0
        if now - window_start > CIRCUIT_WINDOW_SECONDS:
            entry["failures"] = 1
            entry["window_start"] = now
            return
        failures = int(entry.get("failures") or 0) + 1
        entry["failures"] = failures
        if failures >= CIRCUIT_FAILURE_THRESHOLD:
            entry["opened_until"] = now + CIRCUIT_OPEN_SECONDS
            logger.warning(
                "circuit open engine=%s after %d consecutive failures within %.0fs; "
                "short-circuiting for %.0fs",
                engine,
                failures,
                CIRCUIT_WINDOW_SECONDS,
                CIRCUIT_OPEN_SECONDS,
            )
