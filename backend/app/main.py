"""FastAPI application entry point."""

from __future__ import annotations

import logging
import time
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import RequestResponseEndpoint
from starlette.requests import ClientDisconnect
from starlette.requests import Request as StarletteRequest
from starlette.responses import Response

from app.api.routes.health import router as health_router
from app.budget import reset_budgets
from app.config import get_settings
from app.errors import AppError, RateLimited
from app.observability import request_id_var, setup_logging
from app.schemas import OutreachRequest, OutreachResponse, Profile, SearchResponse
from app.security import (
    SlidingWindowLimiter,
    client_ip,
    require_access_code,
    reset_auth_limiter,
)
from app.services import pipeline as _pipeline
from app.services.outreach import SAFETY_NOTE
from app.services.serp import close_cache, close_serp, init_cache, init_serp

logger = logging.getLogger(__name__)

_BODY_LIMIT_BYTES = 20 * 1024

_search_limiter = SlidingWindowLimiter()
_outreach_limiter = SlidingWindowLimiter()


def reset_rate_limiters() -> None:
    """Clear in-memory rate-limit counters (used on startup and in tests)."""
    _search_limiter.reset()
    _outreach_limiter.reset()
    reset_auth_limiter()
    reset_budgets()


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
        close_cache()


try:
    _docs_enabled = get_settings().docs_enabled
except Exception:
    _docs_enabled = True

# NOTE: docs flags and CORS origins are fixed at import time from the
# environment. Tests that need the other mode re-import this module.
app = FastAPI(
    title="EarnRadar API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if _docs_enabled else None,
    redoc_url="/redoc" if _docs_enabled else None,
    openapi_url="/openapi.json" if _docs_enabled else None,
)
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
        # NOTE: Starlette routes `Exception` handlers to the OUTERMOST
        # ServerErrorMiddleware, so this response never passes through
        # CORSMiddleware: echo an allowed origin explicitly, plus the
        # request id, so browsers surface the envelope instead of a CORS error.
        headers=_safe_error_headers(request, rid),
    )


def _safe_error_headers(request: Request, rid: str) -> dict[str, str]:
    """CORS + request-id headers for error responses born outside CORS."""
    headers: dict[str, str] = {}
    try:
        origin = request.headers.get("origin", "")
    except Exception:
        origin = ""
    if origin:
        try:
            allowed = get_settings().origins
        except Exception:
            allowed = []
        if origin in allowed:
            headers["Access-Control-Allow-Origin"] = origin
    if isinstance(rid, str) and rid and rid != "-":
        headers["X-Request-ID"] = rid
    return headers


async def _enforce_search_limit(request: Request) -> None:
    settings = get_settings()
    allowed, retry_after = _search_limiter.check(
        f"search:{client_ip(request)}", settings.rate_limit_search_per_hour
    )
    if not allowed:
        raise RateLimited(retry_after=retry_after)


async def _enforce_outreach_limit(request: Request) -> None:
    settings = get_settings()
    allowed, retry_after = _outreach_limiter.check(
        f"outreach:{client_ip(request)}", settings.rate_limit_outreach_per_hour
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
    """Reject request bodies over 20 KB with a 413 error envelope.

    The Content-Length header is only a fast path: chunked uploads without
    it are measured while reading the stream (bounded at limit + 1 byte).
    Bodies within the limit are cached on the request so downstream handlers
    transparently receive the full body again.
    """
    has_length = False
    length = 0
    try:
        raw = request.headers.get("content-length", "")
        if raw != "":
            length = int(raw)
            has_length = True
    except (TypeError, ValueError):
        has_length = False
        length = 0
    if has_length and length > _BODY_LIMIT_BYTES:
        rid = getattr(request.state, "request_id", None) or request_id_var.get()
        return JSONResponse(
            status_code=413,
            content=_error_body("invalid_input", "Request body too large.", rid),
            headers={"X-Request-ID": rid} if isinstance(rid, str) else None,
        )
    if has_length:
        return await call_next(request)
    # No (valid) Content-Length, e.g. chunked transfer: measure the stream.
    try:
        total = 0
        chunks: list[bytes] = []
        async for chunk in request.stream():
            if not chunk:
                continue
            total += len(chunk)
            if total > _BODY_LIMIT_BYTES:
                rid = getattr(request.state, "request_id", None) or request_id_var.get()
                return JSONResponse(
                    status_code=413,
                    content=_error_body(
                        "invalid_input", "Request body too large.", rid
                    ),
                    headers={"X-Request-ID": rid} if isinstance(rid, str) else None,
                )
            chunks.append(chunk)
        # Replay for downstream: Starlette's _CachedRequest serves `request._body`.
        request._body = b"".join(chunks)
    except ClientDisconnect:
        pass
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


@app.post("/api/search", response_model=SearchResponse)
async def api_search(profile: Profile, request: Request) -> dict:
    """Run the full search pipeline for a user profile.

    Body validation runs before this handler, so invalid (422) requests never
    consume rate-limit quota. The access-code check stays first.
    """
    await require_access_code(request)
    await _enforce_search_limit(request)
    rid = _request_id(request)
    return await _pipeline.run_search(profile, request_id=rid)


@app.post("/api/outreach", response_model=OutreachResponse)
async def api_outreach(body: OutreachRequest, request: Request) -> dict:
    """Draft a short outreach message for a profile/target pair."""
    await require_access_code(request)
    await _enforce_outreach_limit(request)
    message = await _pipeline.draft_message(body.profile, body.target)
    return {"message": message, "safety_note": SAFETY_NOTE}
