"""Pure helpers for input cleanup, safe access, and value normalization."""

import math
import re
import unicodedata
from typing import Any

__all__ = [
    "clamp_int",
    "truncate",
    "clean_query",
    "first_skill",
    "safe_get",
    "word_count",
    "truncate_to_sentence",
    "normalize_type",
]

_SENTENCE_END = re.compile(r"[.!?](?:[\"'”’)\]]*)$")

_TYPE_SYNONYMS = {
    "job": {
        "job",
        "full-time",
        "part-time",
        "employment",
        "work from home job",
    },
    "freelance": {
        "freelance",
        "freelancing",
        "gig",
        "remote freelance",
    },
    "local business": {
        "local business",
        "local service",
        "local services",
        "offline business",
        "shop",
        "tuition",
    },
    "online selling": {
        "online selling",
        "ecommerce",
        "e-commerce",
        "reselling",
        "dropshipping",
        "marketplace",
    },
    "content": {
        "content",
        "content creation",
        "youtube",
        "blogging",
        "social media",
        "writing",
    },
}


def clamp_int(
    v: int | float | str | None,
    lo: int = 0,
    hi: int = 100,
    default: int = 50,
) -> int:
    """Convert a numeric value to a rounded integer, clamp it, or return default."""
    if isinstance(v, bool) or v is None:
        return default
    try:
        number = float(v)
    except (TypeError, ValueError, OverflowError):
        return default
    if not math.isfinite(number):
        return default
    return max(lo, min(hi, int(round(number))))


def truncate(s: str | None, n: int) -> str:
    """Strip a string and hard-cut it at n characters."""
    if s is None or n <= 0:
        return ""
    return s.strip()[:n]


def clean_query(s: str | None, max_len: int = 100) -> str:
    """Replace control characters, collapse whitespace, and cap query length."""
    if s is None or max_len <= 0:
        return ""
    without_controls = "".join(
        " " if unicodedata.category(character) == "Cc" else character
        for character in s
    )
    return " ".join(without_controls.split())[:max_len].strip()


def first_skill(skills: str | None) -> str:
    """Return the first non-empty skill from a comma/semicolon/newline list."""
    if skills:
        for skill in re.split(r"[,;\n]+", skills):
            if cleaned := skill.strip():
                return cleaned
    return "work"


def safe_get(d: Any, *path: Any, default: Any = None) -> Any:
    """Safely traverse dictionaries and lists, returning default on invalid paths."""
    value = d
    for part in path:
        if isinstance(value, dict):
            try:
                value = value[part]
            except (KeyError, TypeError):
                return default
        elif isinstance(value, list) and isinstance(part, int):
            try:
                value = value[part]
            except IndexError:
                return default
        else:
            return default
    return value


def word_count(s: str | None) -> int:
    """Count whitespace-separated words."""
    return len(s.split()) if s else 0


def truncate_to_sentence(s: str | None, max_words: int) -> str:
    """Keep the last complete sentence within max_words, or hard-cut by words."""
    if not s or max_words <= 0:
        return ""

    words = list(re.finditer(r"\S+", s))
    if len(words) <= max_words:
        return s.strip()

    window = words[:max_words]
    sentence_end = next(
        (
            word
            for word in reversed(window)
            if _SENTENCE_END.search(word.group())
        ),
        None,
    )
    if sentence_end is not None:
        return s[: sentence_end.end()].strip()
    return s[: window[-1].end()].strip()


def normalize_type(raw: str | None) -> str | None:
    """Normalize known opportunity labels and synonyms to canonical types."""
    if not isinstance(raw, str):
        return None
    normalized = raw.strip().casefold()
    for canonical, synonyms in _TYPE_SYNONYMS.items():
        if normalized in synonyms:
            return canonical
    return None
