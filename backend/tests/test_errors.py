"""Tests for the application error hierarchy."""

import pytest

from app.errors import (
    AllSourcesFailed,
    AppError,
    InternalError,
    InvalidInput,
    LLMError,
    LLMFormatError,
    RateLimited,
    RankingFailed,
    SerpError,
    Unauthorized,
    UpstreamFailure,
)


@pytest.mark.parametrize(
    ("error_type", "code", "status"),
    [
        (InvalidInput, "invalid_input", 422),
        (Unauthorized, "unauthorized", 401),
        (RateLimited, "rate_limited", 429),
        (UpstreamFailure, "upstream_failure", 502),
        (SerpError, "upstream_failure", 502),
        (LLMError, "upstream_failure", 502),
        (LLMFormatError, "upstream_failure", 502),
        (AllSourcesFailed, "upstream_failure", 502),
        (RankingFailed, "ranking_failed", 502),
        (InternalError, "internal", 500),
    ],
)
def test_application_error_hierarchy_has_expected_code_and_status(
    error_type: type[AppError], code: str, status: int
) -> None:
    error = error_type()

    assert isinstance(error, AppError)
    assert error.code == code
    assert error.status == status
    assert error.message


def test_rate_limited_retains_retry_after() -> None:
    assert RateLimited(retry_after=30).retry_after == 30
