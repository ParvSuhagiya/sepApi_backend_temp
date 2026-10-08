"""AI WhatsApp outreach draft with strict post-processing."""

from __future__ import annotations

import json
import logging
import re

from app.errors import LLMFormatError
from app.prompts import (
    OUTREACH_MAX_TOKENS,
    OUTREACH_SHORTEN_SUFFIX,
    OUTREACH_SYSTEM,
    build_outreach_user,
)
from app.schemas import Profile
from app.services import llm as _llm_mod
from app.utils import truncate, truncate_to_sentence, word_count

logger = logging.getLogger(__name__)

__all__ = [
    "SAFETY_NOTE",
    "clean_message",
    "draft_outreach",
]

SAFETY_NOTE = "Verify the business before paying or sharing documents."

_ALLOW_KEYS = ("name", "type", "address", "rating")

_URL_RE = re.compile(r"https?://\S+|www\.\S+", re.IGNORECASE)
# Same Indian-mobile shape as the ranker: strips real phone numbers but can
# never delete a rupee amount such as "₹15,000" or a salary range.
_PHONE_RE = re.compile(
    r"(?<![\d,])(?:\+?91[\s\-]?|0)?[6-9]\d{4}[\s\-]?\d{5}(?![\d,])"
)
_EMOJI_RE = re.compile(
    "[\U0001F000-\U0001FAFF\u2600-\u27BF\u2B00-\u2BFF\uFE00-\uFE0F"
    "\U0001F300-\U0001F5FF\U0001F600-\U0001F64F\U0001F680-\U0001F6FF\u2700-\u27BF"
    "\U0001F900-\U0001F9FF\U0001FA70-\U0001FAFF]",
    flags=re.UNICODE,
)
_MESSAGE_LABEL_RE = re.compile(r"(?i)^\s*message\s*:\s*")
_MARKDOWN_LINK_RE = re.compile(r"\[([^\]]+)\]\([^)]+\)")


async def _call_outreach_ask(system: str, user: str) -> str:
    """Call the shared LLM seam (tests patch ``app.services.llm.ask_text``)."""
    return await _llm_mod.ask_text(system, user, OUTREACH_MAX_TOKENS, label="outreach")


def clean_message(text) -> str:
    """Strip markdown/quotes, emojis, URLs, phones; collapse blanks; drop label."""
    if not isinstance(text, str):
        return ""
    s = text.strip()
    if not s:
        return ""
    # Remove code fences.
    s = s.replace("```", "").strip()
    # Strip one layer of surrounding quotes.
    if len(s) >= 2 and s[0] == s[-1] and s[0] in ("\"", "'"):
        s = s[1:-1].strip()
    # Markdown links [text](url) -> text.
    s = _MARKDOWN_LINK_RE.sub(r"\1", s)
    # Bold/italic markers.
    s = re.sub(r"\*\*(.+?)\*\*", r"\1", s)
    s = re.sub(r"__(.+?)__", r"\1", s)
    s = s.replace("`", "")
    # Leading markdown headers/quotes per line.
    lines = s.splitlines()
    cleaned_lines: list[str] = []
    for line in lines:
        stripped = line.lstrip()
        stripped = re.sub(r"^#{1,6}\s+", "", stripped)
        stripped = re.sub(r"^>\s?", "", stripped)
        cleaned_lines.append(stripped.rstrip())
    s = "\n".join(cleaned_lines)
    # Emojis.
    s = _EMOJI_RE.sub("", s)
    # URLs.
    s = _URL_RE.sub("", s)
    # Phone-like digit sequences (7+ digits, separators allowed).
    s = _PHONE_RE.sub("", s)
    # Collapse horizontal whitespace per line.
    s = "\n".join(re.sub(r"[ \t]{2,}", " ", ln).strip() for ln in s.splitlines())
    # Collapse blank lines to at most one.
    s = re.sub(r"\n\s*\n+", "\n\n", s).strip()
    # Drop leading "Message:" label.
    s = _MESSAGE_LABEL_RE.sub("", s).strip()
    # Final tidy of stray spaces before punctuation left by removals.
    s = re.sub(r"[ \t]+\n", "\n", s).strip()
    s = re.sub(r" {2,}", " ", s)
    return s.strip()


_CONTROL_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


def _recipient_json(target: dict) -> str:
    recipient: dict = {}
    if isinstance(target, dict):
        for key in _ALLOW_KEYS:
            if key not in target:
                continue
            value = target[key]
            if value is None:
                continue
            if isinstance(value, str):
                # Allow-listed keys only, capped, control characters stripped:
                # recipient fields come from Maps and the client (untrusted).
                cleaned = _CONTROL_RE.sub("", value.strip())
                capped = truncate(cleaned, 120)
                if capped:
                    recipient[key] = capped
            elif isinstance(value, (int, float)):
                if isinstance(value, bool):
                    continue
                recipient[key] = value
    return json.dumps(recipient, ensure_ascii=False)


async def draft_outreach(profile: Profile, target: dict) -> str:
    """Draft a short WhatsApp message; retry once if too long."""
    try:
        profile_json = json.dumps(profile.model_dump(mode="json"), ensure_ascii=False)
    except Exception:
        profile_json = json.dumps(
            {
                "skills": profile.skills,
                "city": profile.city,
                "hours": profile.hours,
                "budget": profile.budget,
            },
            ensure_ascii=False,
        )
    target_json = _recipient_json(target if isinstance(target, dict) else {})
    user = build_outreach_user(profile_json, target_json)

    text = await _call_outreach_ask(OUTREACH_SYSTEM, user)
    cleaned = clean_message(text)

    if word_count(cleaned) > 90:
        retry_user = user + "\n" + OUTREACH_SHORTEN_SUFFIX
        retry_text = await _call_outreach_ask(OUTREACH_SYSTEM, retry_user)
        cleaned = clean_message(retry_text)

    if word_count(cleaned) > 70:
        cleaned = truncate_to_sentence(cleaned, 70).strip()

    if not cleaned:
        raise LLMFormatError("The AI response was empty")
    return cleaned
