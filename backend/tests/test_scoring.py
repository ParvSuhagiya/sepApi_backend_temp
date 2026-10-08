"""Tests for deterministic scoring: EarnScore, guardrails, signals, blend."""

import pytest

from app.config import get_settings
from app.services import scoring
from app.services.scoring import (
    apply_guardrails,
    earn_score,
    rank_opportunities,
    score_breakdown,
    signal_competition,
    signal_demand,
)


def _opp(**overrides):
    base = {
        "title": "Test",
        "type": "freelance",
        "demand": 80,
        "competition": 40,
        "fit": 70,
        "cost_ease": 100,
        "trust": 90,
    }
    base.update(overrides)
    return base


RICH_SIGNALS = {
    "job_count": 10,
    "high_risk_job_count": 0,
    "local_business_count": 5,
    "avg_local_rating": 4.0,
    "best_trend_growth_percent": 40,
    "forum_result_count": 4,
    "budget": 1000,
}


@pytest.fixture
def ai_mode(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("SCORE_MODE", "ai")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


# EarnScore ---------------------------------------------------------------------

def test_t4_weighted_score_is_80(ai_mode):
    assert earn_score(_opp()) == 80


def test_earn_score_clamps_out_of_range(ai_mode):
    assert earn_score(_opp(demand=1000, competition=-50, trust="high")) == earn_score(
        _opp(demand=100, competition=0, trust=50)
    )
    assert 0 <= earn_score(_opp(demand=-5, competition=500)) <= 100


def test_breakdown_sums_to_score(ai_mode):
    item = _opp()
    parts = score_breakdown(item)
    assert set(["demand", "fit", "trust", "low_competition", "cost_ease"]) <= set(parts)
    assert round(sum(parts[k] for k in ("demand", "fit", "trust", "low_competition", "cost_ease"))) == earn_score(item)


# Guardrails ---------------------------------------------------------------------

def test_guardrail_all_sources_degraded(ai_mode):
    (item,) = apply_guardrails([_opp(demand=90, trust=95)], {}, ["jobs", "maps", "trends"])
    assert item["demand"] == 50
    assert item["trust"] == 60
    assert any("50" in adj and "60" in adj for adj in item["adjustments"])


def test_guardrail_no_market_evidence(ai_mode):
    signals = {"job_count": 0, "local_business_count": 0, "best_trend_growth_percent": 0}
    (item,) = apply_guardrails([_opp(demand=90)], signals, [])
    assert item["demand"] == 55
    assert any("55" in adj for adj in item["adjustments"])


def test_guardrail_all_jobs_high_risk_caps_trust(ai_mode):
    signals = {"job_count": 3, "high_risk_job_count": 3}
    (item,) = apply_guardrails([_opp(type="job", trust=90)], signals, [])
    assert item["trust"] <= 40
    assert "Trust capped at 40: all matching jobs show scam signals" in item["adjustments"]


def test_guardrail_zero_budget_costly_idea(ai_mode):
    (item,) = apply_guardrails([_opp(fit=90, cost_ease=10)], {"budget": 0}, [])
    assert item["fit"] == 60
    assert any("60" in adj for adj in item["adjustments"])


def test_guardrails_do_not_mutate_inputs(ai_mode):
    original = _opp(demand=90, trust=95)
    snapshot = dict(original)
    apply_guardrails([original], {}, ["jobs", "maps", "trends"])
    assert original == snapshot


# Trust floor from scam signals -----------------------------------------------------

def test_trust_penalty_proportional_to_high_risk_share(ai_mode):
    signals = {"job_count": 4, "high_risk_job_count": 2, "budget": 500}
    (item,) = apply_guardrails([_opp(type="job", trust=90)], signals, [])
    # share 0.5 -> round(15 * 0.5) = 8 (7 in banker's rounding? check range)
    assert item["trust"] in (82, 83)
    assert any("lowered by" in adj for adj in item["adjustments"])


def test_trust_penalty_skipped_for_non_job_or_clean(ai_mode):
    (freelance,) = apply_guardrails(
        [_opp(type="freelance", trust=90)],
        {"job_count": 4, "high_risk_job_count": 4},
        [],
    )
    assert freelance["trust"] == 90
    (clean,) = apply_guardrails(
        [_opp(type="job", trust=90)], {"job_count": 4, "high_risk_job_count": 0}, []
    )
    assert clean["trust"] == 90


# Deterministic signals -------------------------------------------------------------

def test_signal_demand_blend():
    # 0.5*40 + 0.3*100 + 0.2*100 = 70
    assert signal_demand(RICH_SIGNALS) == 70
    assert signal_demand({}) == 0
    assert signal_demand({"best_trend_growth_percent": -20, "job_count": 0}) == 0
    assert signal_demand({"job_count": 50}) == 30  # capped jobs: 0.3*100


def test_signal_competition_blend():
    # listings 5*20=100, rating 4/5*100=80 -> 0.5*100+0.5*80 = 90
    assert signal_competition(RICH_SIGNALS) == 90
    assert signal_competition({}) == 50  # neutral without local evidence
    assert signal_competition({"local_business_count": 0, "avg_local_rating": None}) == 50


# Blend mode --------------------------------------------------------------------------

def test_blend_averages_ai_and_signal(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("SCORE_MODE", "blend")
    get_settings.cache_clear()
    (item,) = rank_opportunities([_opp(demand=80, competition=40)], RICH_SIGNALS, [])
    # demand: 0.5*80 + 0.5*70 = 75 ; competition: 0.5*40 + 0.5*90 = 65
    assert item["demand"] == 75
    assert item["competition"] == 65
    extras = item["score_breakdown"]
    assert extras["demand_ai"] == 80
    assert extras["demand_signal"] == 70
    assert extras["demand_final"] == 75
    assert extras["competition_ai"] == 40
    assert extras["competition_signal"] == 90
    assert extras["competition_final"] == 65
    # Original contribution keys intact.
    assert set(["demand", "fit", "trust", "low_competition", "cost_ease"]) <= set(extras)
    get_settings.cache_clear()


def test_ai_mode_reproduces_unblended_scores(ai_mode):
    (item,) = rank_opportunities([_opp(demand=80, competition=40)], RICH_SIGNALS, [])
    assert item["demand"] == 80
    assert item["competition"] == 40
    assert item["earn_score"] == earn_score(_opp(demand=80, competition=40))


def test_rank_is_stable_sorted_desc(ai_mode):
    items = rank_opportunities(
        [_opp(title="b", demand=50), _opp(title="a", demand=50), _opp(title="c", demand=90)],
        {},
        [],
    )
    assert [i["title"] for i in items] == ["c", "b", "a"]
    assert items[1]["earn_score"] == items[2]["earn_score"]


def test_adjustments_survive_ranking(ai_mode):
    (item,) = rank_opportunities([_opp(demand=99)], {"job_count": 0}, [])
    assert isinstance(item["adjustments"], list)

    from app.schemas import Opportunity

    Opportunity.model_validate(
        {
            "title": "t",
            "type": "freelance",
            "why": "w",
            "income_estimate": "INR 1 (estimate)",
            "demand": item["demand"],
            "competition": item["competition"],
            "fit": 70,
            "cost_ease": 100,
            "trust": 90,
            "evidence": ["a", "b"],
            "plan_7_days": ["1", "2", "3", "4", "5", "6", "7"],
            "earn_score": item["earn_score"],
            "score_breakdown": item["score_breakdown"],
            "adjustments": item["adjustments"],
        }
    )


def test_unknown_score_mode_falls_back_to_blend(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("SCORE_MODE", "whatever")
    get_settings.cache_clear()
    assert scoring._score_mode() == "blend"
    get_settings.cache_clear()
