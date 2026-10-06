"""EarnRadar FastAPI application entrypoint."""

from __future__ import annotations

from fastapi import FastAPI

from app.api.routes.health import router as health_router

app: FastAPI = FastAPI(title="EarnRadar", version="1.0.0")

app.include_router(health_router)
