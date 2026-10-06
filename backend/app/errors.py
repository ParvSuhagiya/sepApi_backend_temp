"""Typed application error hierarchy for EarnRadar.

API handlers only need to catch :class:`AppError`. User-facing
``message`` values are always safe; server-side diagnostics go in
the private ``detail`` attribute and must never be returned to clients.
"""

from __future__ import annotations

from typing import Optional


class AppError(Exception):
    """Base class for all typed application errors."""

    code: str = "internal"
    status: int = 500
    message: str = "Something went wrong."

    def __init__(self, message: Optional[str] = None, detail: Optional[str] = None) -> None:
        if message is not None:
            self.message: str = message
        self.detail: Optional[str] = detail
        super().__init__(self.message)


class InvalidInput(AppError):
    """Invalid user input."""

    code: str = "invalid_input"
    status: int = 422
    message: str = "The provided input is invalid."


class Unauthorized(AppError):
    """Authentication / authorization failure."""

    code: str = "unauthorized"
    status: int = 401
    message: str = "Unauthorized."


class RateLimited(AppError):
    """Rate limit exceeded."""

    code: str = "rate_limited"
    status: int = 429
    message: str = "Rate limit exceeded. Please try again later."

    def __init__(
        self,
        message: Optional[str] = None,
        detail: Optional[str] = None,
        retry_after: int = 60,
    ) -> None:
        self.retry_after: int = retry_after
        super().__init__(message=message, detail=detail)


class UpstreamFailure(AppError):
    """A downstream data source could not be reached."""

    code: str = "upstream_failure"
    status: int = 502
    message: str = "We could not reach our data sources. Please try again shortly."


class SerpError(UpstreamFailure):
    """SerpAPI upstream failure."""

    code: str = "upstream_failure"
    status: int = 502
    message: str = "We could not reach our data sources. Please try again shortly."


class LLMError(UpstreamFailure):
    """LLM upstream failure."""

    code: str = "upstream_failure"
    status: int = 502
    message: str = "We could not reach our data sources. Please try again shortly."


class LLMFormatError(LLMError):
    """LLM returned an unusable / unparseable response."""

    code: str = "upstream_failure"
    status: int = 502
    message: str = "We could not reach our data sources. Please try again shortly."


class AllSourcesFailed(UpstreamFailure):
    """All data sources failed."""

    code: str = "upstream_failure"
    status: int = 502
    message: str = "We could not reach our data sources. Please try again shortly."


class RankingFailed(AppError):
    """Recommendation ranking failed."""

    code: str = "ranking_failed"
    status: int = 502
    message: str = "We could not build recommendations this time. Please try again."


class InternalError(AppError):
    """Unexpected internal failure."""

    code: str = "internal"
    status: int = 500
    message: str = "Something went wrong."
