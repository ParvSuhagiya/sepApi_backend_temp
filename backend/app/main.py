"""FastAPI application entry point."""

from __future__ import annotations

import hmac
import logging
import threading
import time
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from uuid import uuid4

from fastapi import Depends, FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import RequestResponseEndpoint
from starlette.requests import Request as StarletteRequest
from starlette.responses import Response

from app.api.routes.health import router as health_router
from app.config import get_settings
from app.errors import AppError, RateLimited
from app.observability import request_id_var, setup_logging
from app.schemas import OutreachRequest, OutreachResponse, Profile, SearchResponse
from app.services import pipeline as _pipeline
from app.services.serp import close_serp, init_cache, init_serp

logger = logging.getLogger(__name__)

_BODY_LIMIT_BYTES = 20 * 1024


class _SlidingWindowLimiter:
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


_search_limiter = _SlidingWindowLimiter()
_outreach_limiter = _SlidingWindowLimiter()


def reset_rate_limiters() -> None:
    """Clear in-memory rate-limit counters (used on startup and in tests)."""
    _search_limiter.reset()
    _outreach_limiter.reset()


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    """Validate config, set up logging/cache/HTTP, reset limiters."""
    settings = get_settings()
    setup_logging(settings.log_level)
    init_cache()
    await init_serp()
    reset_rate_limiters()
    try:
        yield
    finally:
        await close_serp()


app = FastAPI(title="EarnRadar API", version="1.0.0", lifespan=lifespan)
app.include_router(health_router)


def _request_id(request: StarletteRequest) -> str:
    rid = getattr(request.state, "request_id", None)
    if isinstance(rid, str) and rid:
        return rid
    try:
        current = request_id_var.get()
    except Exception:
        current = "-"
    return current if isinstance(current, str) and current else "-"


def _error_body(code: str, message: str, request_id: str) -> dict:
    return {"error": {"code": code, "message": message, "request_id": request_id}}


@app.exception_handler(AppError)
async def _handle_app_error(request: Request, exc: AppError) -> JSONResponse:
    rid = _request_id(request)
    headers: dict[str, str] | None = None
    if isinstance(exc, RateLimited):
        try:
            retry_after = int(exc.retry_after)
        except (TypeError, ValueError):
            retry_after = 0
        headers = {"Retry-After": str(max(retry_after, 1))}
    return JSONResponse(
        status_code=exc.status,
        content=_error_body(exc.code, exc.message, rid),
        headers=headers,
    )


@app.exception_handler(RequestValidationError)
async def _handle_validation_error(request: Request, exc: RequestValidationError) -> JSONResponse:
    rid = _request_id(request)
    fields: list[str] = []
    try:
        for err in exc.errors():
            loc = err.get("loc", ())
            for part in reversed(tuple(loc)):
                if isinstance(part, str) and part != "body":
                    if part not in fields:
                        fields.append(part)
                    break
    except Exception:
        fields = []
    if fields:
        message = "Invalid request: " + ", ".join(sorted(set(fields))) + "."
    else:
        message = "The request was invalid."
    return JSONResponse(
        status_code=422,
        content=_error_body("invalid_input", message, rid),
    )


@app.exception_handler(Exception)
async def _handle_unexpected(request: Request, exc: Exception) -> JSONResponse:
    rid = _request_id(request)
    logger.exception("unhandled error request_id=%s: %s", rid, type(exc).__name__)
    return JSONResponse(
        status_code=500,
        content=_error_body("internal", "Something went wrong.", rid),
    )


def _client_ip(request: Request) -> str:
    try:
        forwarded = request.headers.get("x-forwarded-for", "")
    except Exception:
        forwarded = ""
    if forwarded:
        first = forwarded.split(",")[0].strip()
        if first:
            return first
    try:
        if request.client is not None:
            return request.client.host
    except Exception:
        pass
    return "unknown"


async def _require_access_code(request: Request) -> None:
    from app.errors import Unauthorized

    settings = get_settings()
    if not settings.access_code:
        return
    try:
        provided = request.headers.get("X-Access-Code", "")
    except Exception:
        provided = ""
    if not hmac.compare_digest(provided, settings.access_code):
        raise Unauthorized()


async def _enforce_search_limit(request: Request) -> None:
    settings = get_settings()
    allowed, retry_after = _search_limiter.check(
        f"search:{_client_ip(request)}", settings.rate_limit_search_per_hour
    )
    if not allowed:
        raise RateLimited(retry_after=retry_after)


async def _enforce_outreach_limit(request: Request) -> None:
    settings = get_settings()
    allowed, retry_after = _outreach_limiter.check(
        f"outreach:{_client_ip(request)}", settings.rate_limit_outreach_per_hour
    )
    if not allowed:
        raise RateLimited(retry_after=retry_after)


# NOTE: Starlette runs the last-registered "http" middleware first, so these
# are registered bottom-up to execute in spec order:
# request id -> body-size limit -> access log -> route.
@app.middleware("http")
async def access_log(
    request: StarletteRequest,
    call_next: RequestResponseEndpoint,
) -> Response:
    """Emit one access-log line per request with timing and status."""
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = int((time.perf_counter() - start) * 1000)
    try:
        rid = getattr(request.state, "request_id", None) or request_id_var.get()
    except Exception:
        rid = "-"
    logger.info(
        "request id=%s method=%s path=%s status=%s duration_ms=%d",
        rid,
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    return response


@app.middleware("http")
async def enforce_body_limit(
    request: StarletteRequest,
    call_next: RequestResponseEndpoint,
) -> Response:
    """Reject request bodies over 20 KB with a 413 error envelope."""
    length = 0
    try:
        raw = request.headers.get("content-length", "")
        length = int(raw) if raw else 0
    except (TypeError, ValueError):
        length = 0
    if length > _BODY_LIMIT_BYTES:
        rid = getattr(request.state, "request_id", None) or request_id_var.get()
        return JSONResponse(
            status_code=413,
            content=_error_body("invalid_input", "Request body too large.", rid),
            headers={"X-Request-ID": rid} if isinstance(rid, str) else None,
        )
    return await call_next(request)


@app.middleware("http")
async def add_request_context(
    request: StarletteRequest,
    call_next: RequestResponseEndpoint,
) -> Response:
    """Set a unique request ID for logs generated while handling each request."""
    rid = str(uuid4())
    token = request_id_var.set(rid)
    request.state.request_id = rid
    try:
        response = await call_next(request)
    finally:
        request_id_var.reset(token)
    response.headers["X-Request-ID"] = rid
    return response


try:
    _cors_origins = get_settings().origins
except Exception:
    _cors_origins = ["http://localhost:5173"]
if "*" in _cors_origins:
    _cors_origins = [origin for origin in _cors_origins if origin != "*"]
    if not _cors_origins:
        _cors_origins = ["http://localhost:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "X-Access-Code"],
    expose_headers=["X-Request-ID"],
)


@app.post(
    "/api/search",
    response_model=SearchResponse,
    dependencies=[Depends(_require_access_code), Depends(_enforce_search_limit)],
)
async def api_search(profile: Profile, request: Request) -> dict:
    """Run the full search pipeline for a user profile."""
    rid = _request_id(request)
    return await _pipeline.run_search(profile, request_id=rid)


@app.post(
    "/api/outreach",
    response_model=OutreachResponse,
    dependencies=[Depends(_require_access_code), Depends(_enforce_outreach_limit)],
)
async def api_outreach(body: OutreachRequest) -> dict:
    """Draft a short outreach message for a profile/target pair."""
    message = await _pipeline.draft_message(body.profile, body.target)
    return {"message": message}
