"""Client identity and access-gate helpers shared by routes and health checks.

``client_ip`` derives the caller address from ``X-Forwarded-For`` using only
the right-most ``TRUSTED_PROXY_HOPS`` entries (the ones appended by proxies
we operate), so a client cannot pick an arbitrary IP by spoofing the
left-most entry. ``TRUSTED_PROXY_HOPS=0`` ignores the header entirely.

``require_access_code`` enforces the optional soft-gate access code and counts
*failed* attempts per IP (20/hour) to slow brute force. The code is a soft
gate, not a secret: it ships in the frontend bundle and only keeps casual
visitors out.
"""

from __future__ import annotations

import hmac
import ipaddress
import logging
import threading
import time

from fastapi import Request

from app.config import get_settings
from app.errors import RateLimited, Unauthorized

logger = logging.getLogger(__name__)

__all__ = [
    "SlidingWindowLimiter",
    "client_ip",
    "require_access_code",
    "reset_auth_limiter",
    "AUTH_FAILS_PER_HOUR",
]

AUTH_FAILS_PER_HOUR = 20


class SlidingWindowLimiter:
    """Thread-safe per-key sliding-window rate limiter with cleanup."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._hits: dict[str, list[float]] = {}

    def check(self, key: str, limit: int, window: float = 3600.0) -> tuple[bool, int]:
        now = time.time()
        try:
            limit_n = int(limit)
        except (TypeError, ValueError):
            limit_n = 0
        if limit_n <= 0:
            # A non-positive per-IP limit blocks everything (historical
            # behaviour; use the daily budgets for "unlimited" semantics).
            return False, int(window)
        with self._lock:
            stamps = [t for t in self._hits.get(key, []) if now - t < window]
            if len(stamps) >= limit_n:
                retry_after = int(window - (now - stamps[0])) + 1
                self._hits[key] = stamps
                self._cleanup_locked(now, window)
                return False, max(retry_after, 1)
            stamps.append(now)
            self._hits[key] = stamps
            self._cleanup_locked(now, window)
            return True, 0

    def _cleanup_locked(self, now: float, window: float) -> None:
        for key in list(self._hits.keys()):
            kept = [t for t in self._hits[key] if now - t < window]
            if kept:
                self._hits[key] = kept
            else:
                del self._hits[key]

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()


_auth_fail_limiter = SlidingWindowLimiter()


def reset_auth_limiter() -> None:
    """Clear failed-access-code counters (used on startup and in tests)."""
    _auth_fail_limiter.reset()


def _is_valid_ip(value: str) -> bool:
    try:
        ipaddress.ip_address(value)
    except ValueError:
        return False
    return True


def client_ip(request: Request) -> str:
    """Return the caller IP, honouring TRUSTED_PROXY_HOPS.

    With ``hops=1`` (default) the last header entry is used; with ``hops=0``
    the header is ignored. Malformed or empty headers fall back to the
    direct peer address, never to attacker-controlled text.
    """
    try:
        hops = int(get_settings().trusted_proxy_hops)
    except (TypeError, ValueError):
        hops = 1
    if hops > 0:
        try:
            forwarded = request.headers.get("x-forwarded-for", "")
        except Exception:
            forwarded = ""
        if forwarded:
            # Never trust more entries than we have trusted proxies for, and
            # never take the left-most (client-controlled) entry.
            parts = [entry.strip() for entry in forwarded.split(",")]
            parts = [entry for entry in parts if entry]
            if parts:
                candidate = parts[max(0, len(parts) - hops)]
                if _is_valid_ip(candidate):
                    return candidate
                logger.warning("ignoring malformed X-Forwarded-For entry")
    try:
        if request.client is not None:
            return request.client.host
    except Exception:
        pass
    return "unknown"


async def require_access_code(request: Request) -> None:
    """Enforce ACCESS_CODE when set; throttle failed guesses per IP."""
    settings = get_settings()
    if not settings.access_code:
        return
    try:
        provided = request.headers.get("X-Access-Code", "")
    except Exception:
        provided = ""
    if hmac.compare_digest(provided, settings.access_code):
        return
    allowed, retry_after = _auth_fail_limiter.check(
        f"auth:{client_ip(request)}", AUTH_FAILS_PER_HOUR
    )
    if not allowed:
        raise RateLimited(
            "Too many incorrect access-code attempts. Please try again later.",
            retry_after=retry_after,
        )
    raise Unauthorized("Authentication is required.")
