"""FastAPI application entry point."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from uuid import uuid4

from fastapi import FastAPI
from starlette.middleware.base import RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from app.api.routes.health import router as health_router
from app.config import get_settings
from app.observability import request_id_var, setup_logging


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    """Validate required configuration and initialize application logging."""
    settings = get_settings()
    setup_logging(settings.log_level)
    yield


app = FastAPI(title="EarnRadar API", version="1.0.0", lifespan=lifespan)
app.include_router(health_router)


@app.middleware("http")
async def add_request_context(
    request: Request,
    call_next: RequestResponseEndpoint,
) -> Response:
    """Set a unique request ID for logs generated while handling each request."""
    token = request_id_var.set(str(uuid4()))
    try:
        return await call_next(request)
    finally:
        request_id_var.reset(token)
