"""Safe, typed application errors for consistent API and upstream failure handling."""

__all__ = [
    "AppError",
    "InvalidInput",
    "Unauthorized",
    "RateLimited",
    "UpstreamFailure",
    "SerpError",
    "LLMError",
    "LLMFormatError",
    "AllSourcesFailed",
    "RankingFailed",
    "InternalError",
]


class AppError(Exception):
    """Base class for expected application failures safe to expose to API clients."""

    code = "application_error"
    status = 500
    default_message = "Something went wrong."

    def __init__(self, message: str | None = None, *, detail: str | None = None) -> None:
        self.code = type(self).code
        self.status = type(self).status
        self.message = message if message is not None else type(self).default_message
        self._detail = detail
        super().__init__(self.message)


class InvalidInput(AppError):
    """The request failed validation."""

    code = "invalid_input"
    status = 422
    default_message = "The request was invalid."


class Unauthorized(AppError):
    """The request is not authorized."""

    code = "unauthorized"
    status = 401
    default_message = "Authentication is required."


class RateLimited(AppError):
    """The caller exceeded a configured request limit."""

    code = "rate_limited"
    status = 429
    default_message = "Too many requests. Please try again later."

    def __init__(
        self,
        message: str | None = None,
        *,
        retry_after: int = 0,
        detail: str | None = None,
    ) -> None:
        self.retry_after = retry_after
        super().__init__(message, detail=detail)


class UpstreamFailure(AppError):
    """A required external data source could not be used."""

    code = "upstream_failure"
    status = 502
    default_message = (
        "We could not reach our data sources. Please try again shortly."
    )


class SerpError(UpstreamFailure):
    """A search-provider request failed."""


class LLMError(UpstreamFailure):
    """A language-model request failed."""


class LLMFormatError(LLMError):
    """A language-model response did not match the expected format."""


class AllSourcesFailed(UpstreamFailure):
    """All configured recommendation data sources failed."""


class RankingFailed(AppError):
    """Recommendations could not be ranked."""

    code = "ranking_failed"
    status = 502
    default_message = (
        "We could not build recommendations this time. Please try again."
    )


class InternalError(AppError):
    """An unexpected internal failure with a safe client-facing message."""

    code = "internal"
    status = 500
    default_message = "Something went wrong."
