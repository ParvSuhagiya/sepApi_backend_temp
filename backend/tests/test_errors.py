"""Error hierarchy codes, statuses, and safety guarantees."""

from __future__ import annotations

import app.errors as errors


def test_hierarchy_catchable_as_app_error() -> None:
    for cls in (
        errors.InvalidInput,
        errors.Unauthorized,
        errors.RateLimited,
        errors.UpstreamFailure,
        errors.SerpError,
        errors.LLMError,
        errors.LLMFormatError,
        errors.AllSourcesFailed,
        errors.RankingFailed,
        errors.InternalError,
    ):
        assert issubclass(cls, errors.AppError)


def test_codes_and_statuses() -> None:
    assert (errors.InvalidInput.code, errors.InvalidInput.status) == ("invalid_input", 422)
    assert (errors.Unauthorized.code, errors.Unauthorized.status) == ("unauthorized", 401)

    rl = errors.RateLimited()
    assert (rl.code, rl.status) == ("rate_limited", 429)
    assert rl.retry_after == 60

    assert (errors.UpstreamFailure.code, errors.UpstreamFailure.status) == (
        "upstream_failure",
        502,
    )
    assert issubclass(errors.SerpError, errors.UpstreamFailure)
    assert issubclass(errors.LLMError, errors.UpstreamFailure)
    assert issubclass(errors.LLMFormatError, errors.LLMError)
    assert issubclass(errors.AllSourcesFailed, errors.UpstreamFailure)

    assert (errors.RankingFailed.code, errors.RankingFailed.status) == ("ranking_failed", 502)
    assert (errors.InternalError.code, errors.InternalError.status) == ("internal", 500)


def test_default_messages_are_safe() -> None:
    assert errors.UpstreamFailure().message == (
        "We could not reach our data sources. Please try again shortly."
    )
    assert errors.RankingFailed().message == (
        "We could not build recommendations this time. Please try again."
    )
    assert errors.InternalError().message == "Something went wrong."
    # Safe messages never contain keys, traces, or raw bodies.
    for err in (errors.UpstreamFailure(), errors.RankingFailed(), errors.InternalError()):
        lowered: str = err.message.lower()
        assert "sk-" not in lowered
        assert "traceback" not in lowered


def test_private_detail_kept_separate() -> None:
    err = errors.UpstreamFailure(detail="private: connection refused at 10.0.0.1")
    assert err.detail == "private: connection refused at 10.0.0.1"
    assert "10.0.0.1" not in err.message
