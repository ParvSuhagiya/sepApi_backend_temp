"""Tests for Scam Shield signal flags."""

import re

import pytest

from app.services.scam import RED_FLAGS, risk_level, scam_flags, scan_job

EXPECTED_LABELS = [
    "Asks for upfront fee",
    "Unrealistic income promise",
    "Personal email or chat-app contact",
    "No interview or guaranteed income",
    "Asks to buy a kit or product first",
    "Chat-app only application",
]


def test_red_flags_has_all_rules_compiled_case_insensitive() -> None:
    assert list(RED_FLAGS) == EXPECTED_LABELS
    for pattern in RED_FLAGS.values():
        assert isinstance(pattern, re.Pattern)
        assert pattern.flags & re.IGNORECASE


def test_red_flags_use_bounded_quantifiers_only() -> None:
    for label, pattern in RED_FLAGS.items():
        src = pattern.pattern
        assert "*" not in src, label
        assert "+" not in src or re.search(r"\\\+", src), label
        for bound in re.findall(r"\{[^}]*\}", src):
            assert re.fullmatch(r"\{\d+(,\d+)?\}", bound), (label, bound)


def test_two_flags_give_high_risk() -> None:
    flags = scam_flags("Pay a registration fee to join. No interview needed, start today!")
    assert flags == ["Asks for upfront fee", "No interview or guaranteed income"]
    assert risk_level(flags) == "High"


def test_single_flag_gives_medium_risk() -> None:
    flags = scam_flags("You must pay a training fee before starting work.")
    assert flags == ["Asks for upfront fee"]
    assert risk_level(flags) == "Medium"


def test_clean_text_gives_low_risk() -> None:
    assert scam_flags("Software engineer role with competitive salary and benefits.") == []
    assert risk_level([]) == "Low"


@pytest.mark.parametrize("text", [None, "", "   "])
def test_none_and_blank_inputs_are_safe(text: object) -> None:
    assert scam_flags(text) == []  # type: ignore[arg-type]
    flags, risk = scan_job(text, text)  # type: ignore[arg-type]
    assert flags == []
    assert risk == "Low"


@pytest.mark.parametrize(
    ("text", "label"),
    [
        ("There is a registration fee of Rs 200 to join.", "Asks for upfront fee"),
        ("Pay a security deposit to start work.", "Asks for upfront fee"),
        ("Earn up to ₹30,000 per day from home!", "Unrealistic income promise"),
        ("Earn Rs 5000 per week, no experience needed.", "Unrealistic income promise"),
        ("Earn 2 lakh per week from home.", "Unrealistic income promise"),
        ("Earn 50k per day guaranteed!", "Unrealistic income promise"),
        ("Earn 5000 rupees per day sitting at home.", "Unrealistic income promise"),
        ("Contact us at jobs.hr@gmail.com for details.", "Personal email or chat-app contact"),
        ("Message us on telegram for the offer.", "Personal email or chat-app contact"),
        ("Whatsapp us on 98220 12345 to apply.", "Personal email or chat-app contact"),
        ("No interview needed, join directly!", "No interview or guaranteed income"),
        ("Guaranteed income every month.", "No interview or guaranteed income"),
        ("Buy our starter kit to start earning today.", "Asks to buy a kit or product first"),
        ("Refer and earn Rs 500 per friend!", "Asks to buy a kit or product first"),
        ("A joining kit will be provided on payment.", "Asks to buy a kit or product first"),
        ("Apply only on WhatsApp with your name.", "Chat-app only application"),
        ("Apply via WhatsApp today.", "Chat-app only application"),
    ],
)
def test_each_rule_has_positive_examples(text: str, label: str) -> None:
    assert label in scam_flags(text)


@pytest.mark.parametrize(
    ("text", "label"),
    [
        ("Free training is provided by the company.", "Asks for upfront fee"),
        ("Great earning opportunity with competitive pay.", "Unrealistic income promise"),
        ("You can earn a living with steady work.", "Unrealistic income promise"),
        ("Apply on our official careers website.", "Personal email or chat-app contact"),
        ("Multiple interview rounds will be conducted.", "No interview or guaranteed income"),
        ("All tools are provided free by the company.", "Asks to buy a kit or product first"),
        ("Apply on our website with your resume.", "Chat-app only application"),
    ],
)
def test_each_rule_has_negative_examples(text: str, label: str) -> None:
    assert label not in scam_flags(text)


def test_flag_after_char_300_still_detected() -> None:
    description = "Packing parcels daily. " * 40 + "No interview, join now."
    assert len(description) > 300
    flags, risk = scan_job("Packing Helper", description)
    assert "No interview or guaranteed income" in flags
    assert risk == "Medium"


def test_stable_order_follows_red_flags_definition() -> None:
    text = "Contact on Telegram now. Pay a registration fee to join."
    assert scam_flags(text) == [
        "Asks for upfront fee",
        "Personal email or chat-app contact",
        "Chat-app only application",
    ]


def test_no_duplicates_for_repeated_signals() -> None:
    flags = scam_flags("registration fee! registration fee! REGISTRATION FEE!")
    assert flags == ["Asks for upfront fee"]


def test_scan_job_scans_title_and_full_description() -> None:
    flags, risk = scan_job("Earn 50k per day", "Genuine office work.")
    assert flags == ["Unrealistic income promise"]
    assert risk == "Medium"
