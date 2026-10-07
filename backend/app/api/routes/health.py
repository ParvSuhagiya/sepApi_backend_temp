"""Health-check route."""

from fastapi import APIRouter

router = APIRouter()


@router.get("/api/health")
async def health() -> dict[str, bool | str]:
    """Report basic service health."""
    return {"ok": True, "version": "1.0.0"}
