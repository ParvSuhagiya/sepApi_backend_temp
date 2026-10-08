"""Tests for pure input-cleaning and normalization helpers."""

import pytest

from app.utils import (
    clamp_int,
    clean_query,
    first_skill,
    normalize_type,
    safe_get,
    truncate,
    truncate_to_sentence,
    word_count,
)


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        ("70", 70),
        ("70.6", 71),
        (None, 50),
        (-5, 0),
        (140, 100),
        ("abc", 50),
        (True, 50),
        (float("inf"), 50),
    ],
)
def test_clamp_int(value: object, expected: int) -> None:
    assert clamp_int(value, default=50) == expected


def test_clamp_int_supports_custom_bounds_and_default() -> None:
    assert clamp_int("4.4", lo=5, hi=8, default=6) == 5
    assert clamp_int("not a number", lo=5, hi=8, default=6) == 6


@pytest.mark.parametrize(
    ("value", "limit", "expected"),
    [
        ("  hello world  ", 20, "hello world"),
        ("abcdefgh", 4, "abcd"),
        (None, 4, ""),
        ("hello", 0, ""),
    ],
)
def test_truncate(value: str | None, limit: int, expected: str) -> None:
    assert truncate(value, limit) == expected


def test_clean_query_removes_controls_collapses_whitespace_and_caps_length() -> None:
    assert clean_query("  Python\r\n\tjobs\x00 in Pune  ") == "Python jobs in Pune"
    assert clean_query("x" * 250, max_len=100) == "x" * 100
    assert clean_query("query", max_len=0) == ""
    assert clean_query(None) == ""


@pytest.mark.parametrize(
    ("skills", "expected"),
    [
        ("Python basics, Excel", "Python basics"),
        ("  ", "work"),
        (";;", "work"),
        (" ;\nExcel; Python", "Excel"),
    ],
)
def test_first_skill(skills: str, expected: str) -> None:
    assert first_skill(skills) == expected


def test_safe_get_traverses_dicts_and_lists_and_uses_default_for_invalid_paths() -> None:
    data = {"results": [{"title": "Tutor"}, {"title": None}]}
    assert safe_get(data, "results", 0, "title") == "Tutor"
    assert safe_get(data, "results", 1, "title", default="fallback") is None
    assert safe_get(data, "results", 3, "title", default="fallback") == "fallback"
    assert safe_get(data, "missing", default="fallback") == "fallback"
    assert safe_get(None, "anything", default="fallback") == "fallback"
    assert safe_get({"value": "wrong type"}, "value", "child", default=0) == 0
    assert safe_get(data, "results", "not an index", default=0) == 0
    assert safe_get(data, "results", []) is None


def test_word_count() -> None:
    assert word_count("  one\t two\nthree ") == 3
    assert word_count("") == 0


def test_truncate_to_sentence_prefers_last_complete_sentence_within_limit() -> None:
    text = "One short sentence. This sentence has several words. Final sentence here."
    assert truncate_to_sentence(text, 7) == "One short sentence."
    assert truncate_to_sentence("One two three four five", 3) == "One two three"
    assert truncate_to_sentence("One sentence. Two words", 5) == "One sentence. Two words"
    assert truncate_to_sentence("One two", 0) == ""
    assert truncate_to_sentence(None, 2) == ""


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("job", "job"),
        (" Full-TiMe ", "job"),
        ("part-time", "job"),
        ("employment", "job"),
        ("work from home job", "job"),
        ("freelancing", "freelance"),
        ("gig", "freelance"),
        ("remote freelance", "freelance"),
        ("local service", "local business"),
        ("local services", "local business"),
        ("offline business", "local business"),
        ("shop", "local business"),
        ("tuition", "local business"),
        ("ecommerce", "online selling"),
        ("e-commerce", "online selling"),
        ("reselling", "online selling"),
        ("dropshipping", "online selling"),
        ("marketplace", "online selling"),
        ("content creation", "content"),
        ("youtube", "content"),
        ("blogging", "content"),
        ("social media", "content"),
        ("writing", "content"),
        ("not an opportunity", None),
        ("", None),
        (None, None),
    ],
)
def test_normalize_type(raw: str | None, expected: str | None) -> None:
    assert normalize_type(raw) == expected
