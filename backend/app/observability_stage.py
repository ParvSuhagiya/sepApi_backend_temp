"""Per-stage timing helpers for multi-stage pipelines.

Usage (customer mode)::

    reset_timings()
    with stage("plan"):
        ...
    with stage("discover"):
        ...
    meta = {"timings_ms": get_timings_ms(), ...}
    log_request_summary(mode="customers", credits_used=..., ...)

Only stage names, counters and outcomes are ever logged — never user text.
"""

from __future__ import annotations

import logging
import time
from collections.abc import Iterator
from contextlib import contextmanager
from contextvars import ContextVar

from app.observability import request_id_var

logger = logging.getLogger(__name__)

__all__ = [
    "stage",
    "reset_timings",
    "get_timings_ms",
    "log_request_summary",
]

_timings_var: ContextVar[dict[str, float] | None] = ContextVar(
    "stage_timings_ms", default=None
)


def reset_timings() -> dict[str, float]:
    """Install and return a fresh per-request timings dict."""
    timings: dict[str, float] = {}
    _timings_var.set(timings)
    return timings


def get_timings_ms() -> dict[str, float]:
    """Return a snapshot of recorded stage timings (empty when none)."""
    current = _timings_var.get()
    return dict(current) if current else {}


@contextmanager
def stage(name: str) -> Iterator[None]:
    """Record wall time for one pipeline stage into the ContextVar dict."""
    timings = _timings_var.get()
    if timings is None:
        timings = reset_timings()
    start = time.perf_counter()
    try:
        yield
    finally:
        elapsed_ms = (time.perf_counter() - start) * 1000.0
        timings[name] = round(timings.get(name, 0.0) + elapsed_ms, 1)


def log_request_summary(
    *,
    mode: str,
    credits_used: int,
    cache_hits: int,
    degraded: list[str] | tuple[str, ...] = (),
    partial: list[str] | tuple[str, ...] = (),
    outcome: str,
) -> None:
    """Emit ONE structured log line for a finished request.

    Takes only fixed-vocabulary fields (mode, stage names, counters,
    source names, outcome) so no user text can leak into logs.
    """
    timings = _timings_var.get() or {}
    try:
        rid = request_id_var.get()
    except Exception:
        rid = "-"
    stages = ",".join(sorted(timings)) if timings else "-"
    logger.info(
        "request_summary request_id=%s mode=%s stages=%s credits_used=%d "
        "cache_hits=%d degraded=%s partial=%s outcome=%s timings_ms=%s",
        rid,
        mode,
        stages,
        int(credits_used),
        int(cache_hits),
        ",".join(degraded) if degraded else "-",
        ",".join(partial) if partial else "-",
        outcome,
        ",".join(f"{name}={timings[name]:.1f}" for name in sorted(timings))
        if timings
        else "-",
    )
