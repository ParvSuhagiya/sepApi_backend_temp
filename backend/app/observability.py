"""Logging and observability helpers for EarnRadar."""

from __future__ import annotations

import logging
import os
import re
from contextvars import ContextVar

request_id_var: ContextVar[str] = ContextVar("request_id", default="-")

_SK_KEY_PATTERN: re.Pattern[str] = re.compile(r"sk-[A-Za-z0-9\-_]{4,}")
_BEARER_PATTERN: re.Pattern[str] = re.compile(r"(?i)(bearer\s+)([A-Za-z0-9\-._~+/=]+)")


def _configured_secret_values() -> list[str]:
    """Return configured secret values from the environment, if present."""
    values: list[str] = []
    for name in ("SERPAPI_KEY", "ANTHROPIC_API_KEY", "ACCESS_CODE"):
        raw: str = os.environ.get(name, "")
        if raw:
            values.append(raw)
    return values


def redact(text: str) -> str:
    """Mask API-key-like material in ``text``.

    Masks strings starting with ``sk-`` (and bearer tokens), plus the
    exact values of the configured keys when they appear verbatim.
    """
    if not text:
        return text
    redacted: str = _SK_KEY_PATTERN.sub("sk-***REDACTED***", text)
    redacted = _BEARER_PATTERN.sub(r"\1***REDACTED***", redacted)
    for secret in _configured_secret_values():
        if secret and len(secret) >= 4 and secret in redacted:
            redacted = redacted.replace(secret, "***REDACTED***")
    # Mask long hex-like tokens that look like API keys (>= 20 chars).
    redacted = re.sub(r"\b[A-Za-z0-9]{20,}\b", "***REDACTED***", redacted)
    return redacted


class _RequestIdFilter(logging.Filter):
    """Inject ``request_id`` and redact secrets from log records."""

    def filter(self, record: logging.LogRecord) -> bool:
        if not hasattr(record, "request_id") or not getattr(record, "request_id"):
            try:
                record.request_id = request_id_var.get()  # type: ignore[attr-defined]
            except Exception:
                record.request_id = "-"  # type: ignore[attr-defined]
        # Redact the rendered message components (never mutate secrets in place beyond masking).
        try:
            if isinstance(record.msg, str):
                record.msg = redact(record.msg)
            if record.args:
                if isinstance(record.args, dict):
                    record.args = {
                        k: (redact(v) if isinstance(v, str) else v)
                        for k, v in record.args.items()
                    }
                elif isinstance(record.args, tuple):
                    record.args = tuple(
                        redact(a) if isinstance(a, str) else a for a in record.args
                    )
        except Exception:
            pass
        return True


def setup_logging(level: str = "INFO") -> None:
    """Configure root logging with a single redacting stream handler."""
    numeric: int = getattr(logging, level.upper(), logging.INFO)
    root: logging.Logger = logging.getLogger()
    root.setLevel(numeric)

    # Keep exactly one EarnRadar stream handler to avoid duplicate lines.
    for handler in list(root.handlers):
        root.removeHandler(handler)

    handler: logging.Handler = logging.StreamHandler()
    handler.setLevel(numeric)
    formatter: logging.Formatter = logging.Formatter(
        "%(asctime)s %(levelname)s [%(request_id)s] %(name)s: %(message)s"
    )
    handler.setFormatter(formatter)
    handler.addFilter(_RequestIdFilter())
    root.addHandler(handler)
