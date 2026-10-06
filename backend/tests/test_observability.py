"""Redaction and request-id logging behaviour."""

from __future__ import annotations

import logging

import pytest

import app.observability as observability


def test_redact_masks_sk_prefixed_keys() -> None:
    masked: str = observability.redact("token sk-abcDEF1234567890 happened")
    assert "sk-abcDEF1234567890" not in masked
    assert "REDACTED" in masked


def test_redact_masks_configured_keys(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SERPAPI_KEY", "dummy-serpapi-key")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "dummy-anthropic-key")
    text: str = "keys dummy-serpapi-key and dummy-anthropic-key leak"
    masked: str = observability.redact(text)
    assert "dummy-serpapi-key" not in masked
    assert "dummy-anthropic-key" not in masked


def test_setup_logging_format_includes_request_id() -> None:
    observability.setup_logging("INFO")
    observability.request_id_var.set("test-req-123")
    captured: list[logging.LogRecord] = []

    class _ListHandler(logging.Handler):
        def emit(self, record: logging.LogRecord) -> None:
            captured.append(record)

    # Attach a capturing handler to the tested logger; root handler's
    # filter already proves the format, here we verify the filter logic.
    test_logger: logging.Logger = logging.getLogger("earnradar.test.capture")
    test_logger.setLevel(logging.INFO)
    list_handler: logging.Handler = _ListHandler()
    test_logger.addHandler(list_handler)
    try:
        test_logger.info("hello log line")
        # Run the same filter logic the root handler uses on a fresh record.
        record: logging.LogRecord = logging.LogRecord(
            name="earnradar.test",
            level=logging.INFO,
            pathname=__file__,
            lineno=1,
            msg="hello log line",
            args=(),
            exc_info=None,
        )
        root = logging.getLogger()
        assert root.handlers, "setup_logging must install a handler"
        handler: logging.Handler = root.handlers[0]
        for f in handler.filters:
            assert f.filter(record)
        assert getattr(record, "request_id", None) == "test-req-123"
    finally:
        test_logger.removeHandler(list_handler)
        observability.request_id_var.set("-")

    # Handler formatter must follow the required format.
    root = logging.getLogger()
    assert root.handlers, "setup_logging must install a handler"
    fmt: str = root.handlers[0].formatter._fmt  # type: ignore[union-attr]
    assert "%(asctime)s" in fmt
    assert "%(request_id)s" in fmt
    assert "%(message)s" in fmt
