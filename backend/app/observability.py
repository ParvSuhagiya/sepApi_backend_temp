"""Request-scoped logging context and API-key redaction helpers."""

from contextvars import ContextVar
import logging
import os
import re
import sys

request_id_var: ContextVar[str] = ContextVar("request_id", default="-")

__all__ = ["request_id_var", "setup_logging", "redact"]

_API_KEY_PATTERN = re.compile(r"\bsk-[A-Za-z0-9_-]+\b")
_REDACTED = "[REDACTED]"


def redact(text: str) -> str:
    """Mask recognizable API keys and configured provider key values in text."""
    redacted = _API_KEY_PATTERN.sub(_REDACTED, text)
    for name in ("SERPAPI_KEY", "ANTHROPIC_API_KEY"):
        key = os.getenv(name)
        if key:
            redacted = redacted.replace(key, _REDACTED)
    return redacted


class _RequestContextFilter(logging.Filter):
    """Attach request context and redact secrets from every emitted log message."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_var.get()
        record.msg = redact(record.getMessage())
        record.args = ()
        return True


def setup_logging(level: str) -> None:
    """Configure the root logger with one redacting stream handler."""
    root_logger = logging.getLogger()
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)

    handler = logging.StreamHandler(sys.stderr)
    handler.addFilter(_RequestContextFilter())
    handler.setFormatter(
        logging.Formatter(
            "%(asctime)s %(levelname)s [%(request_id)s] %(name)s: %(message)s"
        )
    )
    root_logger.addHandler(handler)
    root_logger.setLevel(level.upper())
