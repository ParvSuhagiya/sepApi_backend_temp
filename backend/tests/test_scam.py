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
    "Asks for ID or bank details up front",
    "Chat-app contact",
    "Asks for money in Hinglish",
]


def test_red_flags_has_all_rules_compiled_case_insensitive() -> None:
    assert list(RED_FLAGS) == EXPECTED_LABELS
    for pattern in RED_FLAGS.values():
        assert isinstance(pattern, re.Pattern)
        assert pattern.flags & re.IGNORECASE


def test_red_flags_use_bounded_quantifiers_only() -> None:
    # Safety property: no unbounded content repetition (.* / .+). Bare
    # whitespace runs (\s+, \s*) are allowed: they cannot blow up matching
    # and the income rule needs them (e.g. "5000 / day").
    for label, pattern in RED_FLAGS.items():
        src = pattern.pattern
        for match in re.finditer(r"(?<!\\)[*+]", src):
            start = match.start()
            assert src[start - 2 : start] == "\\s", (label, src)
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


# --- Phase 2: income-promise regression + extended rules ---------------------

INCOME_POSITIVES = [
    "Earn ₹5000/day from home",
    "Earn up to ₹50,000 per week from home",
    "Earn rs 2000 per day, no experience",
    "Earn 5k per day from home",
    "Earn 1 lakh per week easily",
    "Earn 25,000 a day from your phone",
    "Earn 5000 / day without investment",
]

INCOME_NEGATIVES = [
    "Earn ₹15,000 per month as a junior clerk",
    "Learn to earn money online with these skills",
]


@pytest.mark.parametrize("text", INCOME_POSITIVES)
def test_income_promise_matches_daily_weekly_amounts(text: str) -> None:
    assert "Unrealistic income promise" in scam_flags(text)


@pytest.mark.parametrize("text", INCOME_NEGATIVES)
def test_income_promise_ignores_monthly_and_generic(text: str) -> None:
    assert "Unrealistic income promise" not in scam_flags(text)


@pytest.mark.parametrize(
    "text",
    [
        "Refundable deposit of Rs 500 to apply",
        "Registration charges of Rs 200 apply",
        "Pay a joining fee to start work",
        "Training charges of Rs 2000 must be paid first",
        "Pay a deposit of Rs 1000 to start work",
        "Pay a deposit now to begin earning",
    ],
)
def test_upfront_fee_extended_variants(text: str) -> None:
    assert "Asks for upfront fee" in scam_flags(text)


@pytest.mark.parametrize(
    "text",
    [
        "Send your Aadhaar number to apply",
        "Share your bank details on WhatsApp to join",
        "Submit your PAN card copy with the form",
        "Give us the OTP you received to verify",
        "Bank account details must be shared before joining",
    ],
)
def test_id_or_bank_details_up_front(text: str) -> None:
    assert "Asks for ID or bank details up front" in scam_flags(text)


@pytest.mark.parametrize(
    "text",
    [
        "Submit your application before Friday",
        "Give us a call for more details",
        "Share this job post with your friends",
    ],
)
def test_id_rule_ignores_requests_without_id_terms(text: str) -> None:
    assert "Asks for ID or bank details up front" not in scam_flags(text)


@pytest.mark.parametrize(
    "text",
    [
        "WhatsApp your CV to apply now",
        "Send your resume on Telegram",
        "Share your CV to WhatsApp for quick joining",
    ],
)
def test_chat_app_contact(text: str) -> None:
    assert "Chat-app contact" in scam_flags(text)


@pytest.mark.parametrize(
    "text",
    [
        "Apply with your resume on our portal",
        "Send your resume to jobs@example.com",
    ],
)
def test_chat_app_contact_ignores_plain_applications(text: str) -> None:
    assert "Chat-app contact" not in scam_flags(text)


@pytest.mark.parametrize(
    "text",
    [
        "Pehle paisa bhejo, phir kaam milega",
        "Registration charge lagega Rs 500",
        "Ghar baithe 50000 kamao daily",
        "Ghar baithe 2 lakh mahina kamao",
    ],
)
def test_hinglish_lures(text: str) -> None:
    assert "Asks for money in Hinglish" in scam_flags(text)


def test_hinglish_ignores_plain_home_work() -> None:
    assert "Asks for money in Hinglish" not in scam_flags("Ghar baithe kaam karein")


# PDD cases ---------------------------------------------------------------------

def test_t1_registration_fee_plus_no_interview_is_high() -> None:
    flags, risk = scan_job(
        "Data entry operator",
        "Pay a registration fee of Rs 500. No interview, start today!",
    )
    assert "Asks for upfront fee" in flags
    assert "No interview or guaranteed income" in flags
    assert risk == "High"


def test_t2_training_fee_is_medium() -> None:
    flags, risk = scan_job(
        "Packing helper", "Training fee of Rs 1500 applies before joining."
    )
    assert flags == ["Asks for upfront fee"]
    assert risk == "Medium"


def test_t3_clean_listing_is_low() -> None:
    flags, risk = scan_job(
        "Delivery partner",
        "Deliver parcels across the city. Weekly payouts, fuel allowance.",
    )
    assert flags == []
    assert risk == "Low"


# False-positive guards ------------------------------------------------------------

@pytest.mark.parametrize(
    "text",
    [
        "No deposit needed for this role",
        "We charge no processing fee for this bank job",
        "Free training is provided by the company",
    ],
)
def test_legitimate_money_mentions_are_not_upfront_fees(text: str) -> None:
    assert "Asks for upfront fee" not in scam_flags(text)


def test_telegram_mention_is_a_signal_not_a_verdict() -> None:
    # Documented known-signal behaviour: any Telegram mention flags, even
    # innocent ones. Scam Shield is a signal, never a verdict.
    assert scam_flags("We use Telegram internally for team chat.") == [
        "Personal email or chat-app contact"
    ]
