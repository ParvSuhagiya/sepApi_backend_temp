"""Tests for lead_score: hand-computed cases, guardrails, seeded properties."""

import random

import pytest

from app.modes.customers.scoring import (
    PAIN_HITS_FULL,
    REACH_MAX_POINTS,
    UNREACHABLE_SCORE_CAP,
    W_MID_LEVEL,
    W_NO_SOFTWARE,
    W_PAIN,
    W_REACHABILITY,
    lead_score,
)


def test_weights_sum_to_one() -> None:
    assert W_MID_LEVEL + W_PAIN + W_REACHABILITY + W_NO_SOFTWARE == pytest.approx(1.0)
    assert REACH_MAX_POINTS == 15
    assert PAIN_HITS_FULL == 3


def test_perfect_lead_scores_100() -> None:
    result = lead_score(
        mid_level=100,
        pain_hits=3,
        has_phone=True,
        has_website=True,
        likely_has_software=False,
    )
    assert result.score == 100
    assert result.breakdown == {
        "mid_level": 100.0,
        "pain": 100.0,
        "reachability": 100.0,
        "no_software": 100.0,
    }
    assert result.adjustments == []


def test_hand_computed_partial_lead() -> None:
    result = lead_score(
        mid_level=50,
        pain_hits=0,
        has_phone=True,
        has_website=False,
        likely_has_software=False,
    )
    # 0.4*50 + 0.3*0 + 0.15*(10/15*100) + 0.15*100 = 20 + 0 + 10 + 15
    assert result.score == 45
    assert result.breakdown["reachability"] == pytest.approx(66.7, abs=0.1)


def test_pain_capped_at_three() -> None:
    full = lead_score(
        mid_level=80, pain_hits=3, has_phone=True,
        has_website=True, likely_has_software=False,
    )
    over = lead_score(
        mid_level=80, pain_hits=99, has_phone=True,
        has_website=True, likely_has_software=False,
    )
    assert full.score == over.score
    assert over.breakdown["pain"] == 100.0


def test_software_detected_zeroes_component() -> None:
    without = lead_score(
        mid_level=80, pain_hits=0, has_phone=True,
        has_website=True, likely_has_software=False,
    )
    with_software = lead_score(
        mid_level=80, pain_hits=0, has_phone=True,
        has_website=True, likely_has_software=True,
    )
    assert without.score - with_software.score == 15
    assert with_software.breakdown["no_software"] == 0.0


def test_unreachable_caps_at_60_with_adjustment() -> None:
    result = lead_score(
        mid_level=100,
        pain_hits=3,
        has_phone=False,
        has_website=False,
        likely_has_software=False,
    )
    assert result.score == UNREACHABLE_SCORE_CAP
    assert "Hard to reach: no public phone or website" in result.adjustments


def test_partial_research_removes_pain_bonus() -> None:
    full = lead_score(
        mid_level=80, pain_hits=3, has_phone=True,
        has_website=True, likely_has_software=False, research="ok",
    )
    partial = lead_score(
        mid_level=80, pain_hits=3, has_phone=True,
        has_website=True, likely_has_software=False, research="partial",
    )
    assert partial.breakdown["pain"] == 0.0
    assert partial.score == full.score - 30
    assert "Reviews unavailable, score uses listing data only" in partial.adjustments


def _sample(rng: random.Random) -> dict:
    return {
        "mid_level": rng.randint(0, 100),
        "pain_hits": rng.randint(0, 6),
        "has_phone": rng.random() < 0.5,
        "has_website": rng.random() < 0.5,
        "likely_has_software": rng.random() < 0.5,
        "research": rng.choice(["ok", "ok", "partial", "pending"]),
    }


def test_properties_seeded_1000_cases() -> None:
    rng = random.Random(20261008)
    for _ in range(1000):
        args = _sample(rng)
        result = lead_score(**args)
        assert isinstance(result.score, int)
        assert 0 <= result.score <= 100
        # Deterministic for the same input.
        assert lead_score(**args) == result
        # Monotonic in each positive component.
        base = dict(args)
        up_mid = dict(base, mid_level=min(100, base["mid_level"] + 7))
        assert lead_score(**up_mid).score >= result.score
        up_pain = dict(base, pain_hits=base["pain_hits"] + 1)
        assert lead_score(**up_pain).score >= result.score
        up_reach = dict(base, has_phone=True, has_website=True)
        assert lead_score(**up_reach).score >= result.score
        no_soft = dict(base, likely_has_software=False)
        assert lead_score(**no_soft).score >= result.score
