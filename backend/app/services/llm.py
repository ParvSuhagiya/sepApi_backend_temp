"""Anthropic client integration for language-model operations."""

from __future__ import annotations

import json
import logging
import re
import threading
import time

from anthropic import (
    AsyncAnthropic,
    APIConnectionError,
    APIStatusError,
    APITimeoutError,
    AuthenticationError,
    PermissionDeniedError,
    RateLimitError,
)

from app.config import get_settings
from app.budget import seconds_until_rollover
from app.budget import try_consume as _budget_consume
from app.errors import BudgetExhausted, LLMError, LLMFormatError
from app.observability import redact

logger = logging.getLogger(__name__)

__all__ = [
    "get_client",
    "ask_text",
    "ask_json",
    "parse_json_loose",
    "llm_lifetime_stats",
]

JSON_ONLY_SUFFIX = " Reply with valid JSON only. No markdown, no code fences, no commentary."

_CREDENTIALS_MESSAGE = "AI provider credentials were rejected"
_BUSY_MESSAGE = "AI provider is busy, please retry"
_CONNECTION_MESSAGE = "Could not reach the AI provider"
_GENERIC_MESSAGE = "AI provider error"
_CUTOFF_MESSAGE = "The AI response was cut off"

_client: AsyncAnthropic | None = None
_lock = threading.Lock()
_lifetime: dict[str, int] = {"input_tokens": 0, "output_tokens": 0, "calls": 0}


def get_client() -> AsyncAnthropic:
    """Return the lazily-created shared AsyncAnthropic client."""
    global _client
    if _client is None:
        settings = get_settings()
        _client = AsyncAnthropic(
            api_key=settings.anthropic_api_key,
            timeout=float(settings.llm_timeout_seconds),
            max_retries=2,
        )
    return _client


def llm_lifetime_stats() -> dict:
    """Return a snapshot of process-lifetime LLM token counters."""
    with _lock:
        return dict(_lifetime)


def _bump_lifetime(input_tokens: int, output_tokens: int) -> None:
    with _lock:
        _lifetime["input_tokens"] = int(_lifetime.get("input_tokens", 0)) + int(input_tokens)
        _lifetime["output_tokens"] = int(_lifetime.get("output_tokens", 0)) + int(output_tokens)
        _lifetime["calls"] = int(_lifetime.get("calls", 0)) + 1


def _redacted_detail(exc: BaseException) -> str:
    try:
        return redact(f"{type(exc).__name__}: {exc}")
    except Exception:
        return type(exc).__name__


def parse_json_loose(text: str) -> dict:
    """Parse an LLM response into a JSON object, tolerating fences and prose."""
    if text is None or not str(text).strip():
        raise LLMFormatError("The AI response was empty")
    s = str(text).strip()
    # Remove ``` / ```json fences (case-insensitive).
    s = re.sub(r"```(?:json)?", "", s, flags=re.IGNORECASE).strip()
    if not s:
        raise LLMFormatError("The AI response was empty")
    try:
        parsed = json.loads(s)
    except (json.JSONDecodeError, ValueError, TypeError):
        parsed = None
    if isinstance(parsed, dict):
        return parsed
    if parsed is not None:
        # Valid JSON but not an object (array, scalar, ...).
        raise LLMFormatError("The AI response was not valid JSON")
    start = s.find("{")
    end = s.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise LLMFormatError("The AI response was not valid JSON")
    candidate = s[start : end + 1]
    try:
        parsed = json.loads(candidate)
    except (json.JSONDecodeError, ValueError, TypeError) as exc:
        raise LLMFormatError("The AI response was not valid JSON") from None
    if not isinstance(parsed, dict):
        raise LLMFormatError("The AI response was not valid JSON")
    return parsed


def _map_sdk_error(exc: BaseException) -> LLMError:
    if isinstance(exc, (AuthenticationError, PermissionDeniedError)):
        return LLMError(_CREDENTIALS_MESSAGE, detail=_redacted_detail(exc))
    if isinstance(exc, RateLimitError):
        return LLMError(_BUSY_MESSAGE, detail=_redacted_detail(exc))
    if isinstance(exc, (APIConnectionError, APITimeoutError)):
        return LLMError(_CONNECTION_MESSAGE, detail=_redacted_detail(exc))
    if isinstance(exc, APIStatusError):
        return LLMError(_GENERIC_MESSAGE, detail=_redacted_detail(exc))
    return LLMError(_GENERIC_MESSAGE, detail=_redacted_detail(exc))


def _is_temperature_rejection(exc: BaseException) -> bool:
    """True only for HTTP 400s whose message blames the temperature parameter.

    Any other 400 (e.g. an invalid model id) must surface immediately instead
    of triggering a second billed call without temperature.
    """
    status = getattr(exc, "status_code", None)
    if not (isinstance(exc, APIStatusError) and status == 400):
        return False
    try:
        message = str(exc).lower()
    except Exception:
        return False
    return "temperature" in message


def _extract_text(response: object) -> str:
    content = getattr(response, "content", None)
    if not content:
        raise LLMFormatError("The AI response was empty")
    for block in content:
        if isinstance(block, dict):
            btype = block.get("type")
            btext = block.get("text")
        else:
            btype = getattr(block, "type", None)
            btext = getattr(block, "text", None)
        if btype == "text" and isinstance(btext, str):
            return btext.strip()
    # Fall back: first block with a text attribute regardless of type.
    for block in content:
        if isinstance(block, dict):
            btext = block.get("text")
        else:
            btext = getattr(block, "text", None)
        if isinstance(btext, str) and btext.strip():
            return btext.strip()
    raise LLMFormatError("The AI response was empty")


def _extract_usage(response: object) -> tuple[int, int]:
    usage = getattr(response, "usage", None)
    if usage is None:
        return 0, 0
    if isinstance(usage, dict):
        try:
            return int(usage.get("input_tokens", 0) or 0), int(usage.get("output_tokens", 0) or 0)
        except (TypeError, ValueError):
            return 0, 0
    try:
        return int(getattr(usage, "input_tokens", 0) or 0), int(
            getattr(usage, "output_tokens", 0) or 0
        )
    except (TypeError, ValueError):
        return 0, 0


async def _call(
    system: str,
    user: str,
    max_tokens: int,
    temperature: float | None,
    label: str,
) -> str:
    settings = get_settings()
    try:
        llm_budget = int(settings.max_llm_calls_per_day)
    except (TypeError, ValueError):
        llm_budget = 0
    if not _budget_consume("llm", llm_budget):
        logger.warning("LLM daily budget exhausted label=%s", label)
        raise BudgetExhausted(
            "Our daily AI budget is exhausted. Please try again tomorrow.",
            retry_after=seconds_until_rollover(),
        )
    client = get_client()
    logger.debug(
        "llm request label=%s system_len=%d user_len=%d max_tokens=%d",
        label,
        len(system),
        len(user),
        max_tokens,
    )
    start = time.perf_counter()
    attempt_kwargs: list[dict] = []
    if temperature is None:
        attempt_kwargs.append({})
    else:
        # First attempt includes temperature; on a 400 we retry without it.
        attempt_kwargs.append({"temperature": temperature})
        attempt_kwargs.append({})

    last_error: BaseException | None = None
    for attempt_index, extra in enumerate(attempt_kwargs):
        kwargs: dict = {
            "model": settings.anthropic_model,
            "system": system,
            "messages": [{"role": "user", "content": user}],
            "max_tokens": max_tokens,
            **extra,
        }
        try:
            response = await client.messages.create(**kwargs)
        except (AuthenticationError, PermissionDeniedError) as exc:
            detail = _redacted_detail(exc)
            logger.warning("llm auth failure label=%s: %s", label, detail)
            raise _map_sdk_error(exc) from None
        except RateLimitError as exc:
            detail = _redacted_detail(exc)
            logger.warning("llm rate limited label=%s: %s", label, detail)
            raise _map_sdk_error(exc) from None
        except (APIConnectionError, APITimeoutError) as exc:
            detail = _redacted_detail(exc)
            logger.warning("llm connection failure label=%s: %s", label, detail)
            raise _map_sdk_error(exc) from None
        except APIStatusError as exc:
            if (
                temperature is not None
                and attempt_index == 0
                and _is_temperature_rejection(exc)
            ):
                logger.warning(
                    "llm temperature rejected label=%s, retrying without temperature: %s",
                    label,
                    _redacted_detail(exc),
                )
                last_error = exc
                continue
            detail = _redacted_detail(exc)
            logger.warning("llm provider error label=%s: %s", label, detail)
            raise _map_sdk_error(exc) from None
        except (LLMError, LLMFormatError):
            raise
        except Exception as exc:  # Never leak raw provider payloads/keys.
            detail = _redacted_detail(exc)
            logger.warning("llm provider error label=%s: %s", label, detail)
            raise _map_sdk_error(exc) from None
        else:
            latency_ms = (time.perf_counter() - start) * 1000.0
            stop_reason = getattr(response, "stop_reason", None)
            input_tokens, output_tokens = _extract_usage(response)
            _bump_lifetime(input_tokens, output_tokens)
            logger.info(
                "llm call label=%s input_tokens=%d output_tokens=%d stop_reason=%s latency_ms=%.1f",
                label,
                input_tokens,
                output_tokens,
                stop_reason,
                latency_ms,
            )
            try:
                response_len: int = 0
                content = getattr(response, "content", None) or []
                for block in content:
                    t = block.get("text") if isinstance(block, dict) else getattr(block, "text", None)
                    if isinstance(t, str):
                        response_len += len(t)
                logger.debug(
                    "llm response label=%s response_len=%d", label, response_len
                )
            except Exception:
                pass
            if stop_reason == "max_tokens":
                raise LLMFormatError(_CUTOFF_MESSAGE)
            text = _extract_text(response)
            if not text:
                raise LLMFormatError("The AI response was empty")
            return text

    # If we exhausted attempts it means the temperature retry also failed
    # at the SDK level (last_error set) — map it safely.
    if last_error is not None:
        raise _map_sdk_error(last_error) from None
    raise LLMError(_GENERIC_MESSAGE)


async def ask_text(
    system: str,
    user: str,
    max_tokens: int,
    *,
    temperature: float = 0.3,
    label: str = "llm",
) -> str:
    """Ask the model for free text; return the first text block, stripped."""
    return await _call(system, user, max_tokens, temperature, label)


async def ask_json(
    system: str,
    user: str,
    max_tokens: int,
    *,
    temperature: float = 0.2,
    label: str = "llm",
) -> dict:
    """Ask the model for JSON; enforce the JSON-only suffix and parse loosely."""
    text = await _call(system + JSON_ONLY_SUFFIX, user, max_tokens, temperature, label)
    return parse_json_loose(text)
