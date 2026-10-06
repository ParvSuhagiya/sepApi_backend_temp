"""Health-check route for EarnRadar."""

from __future__ import annotations

from fastapi import APIRouter

router: APIRouter = APIRouter()


@router.get("/api/health")
def health() -> dict[str, object]:
    """Liveness probe."""
    return {"ok": True, "version": "1.0.0"}
