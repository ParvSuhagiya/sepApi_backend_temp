"""Tests for customer-mode schemas: boundaries, cleaning, garbage rejection."""

import pytest
from pydantic import ValidationError

from app.modes.customers.schemas import (
    Lead,
    LeadMeta,
    LeadPlan,
    LeadsResponse,
    OfferInput,
)

OFFER = (
    "i am a devops engineer and i have made a restaurant management system: "
    "manager assigns customers, waiter takes order, cook prepares food, "
    "waiter serves, manager handles bills. 800 rupees/month. "
    "target mid level restaurants that have waiter, manager, cook"
)

# Messy ~360-char variant: control chars, collapsed whitespace, extra detail.
MESSY_OFFER = (
    "  i am a\x00devops engineer\tand i have made\na restaurant management system:  "
    "manager assigns customers,\x07 waiter takes order, cook prepares food, "
    "waiter serves,   manager handles bills. 800 rupees/month. target mid "
    "level restaurants that have waiter, manager, cook and want billing "
    "reports, staff payroll, inventory alerts and daily sales summaries.  "
)


def test_messy_example_is_360_chars_and_accepted() -> None:
    assert 340 <= len(MESSY_OFFER) <= 380, len(MESSY_OFFER)
    parsed = OfferInput.model_validate({"offer": MESSY_OFFER, "city": "Ahmedabad"})
    assert "\x00" not in parsed.offer
    assert "\x07" not in parsed.offer
    assert "  " not in parsed.offer
    assert "restaurant management system" in parsed.offer
    assert parsed.max_leads == 10


def test_offer_boundaries() -> None:
    assert OfferInput.model_validate({"offer": "x" * 19 + "y", "city": "Pune"})
    assert OfferInput.model_validate({"offer": "x" * 1000, "city": "Pune"})
    with pytest.raises(ValidationError):
        OfferInput.model_validate({"offer": "x" * 19, "city": "Pune"})
    with pytest.raises(ValidationError):
        OfferInput.model_validate({"offer": "x" * 1001, "city": "Pune"})


def test_offer_control_chars_stripped_and_whitespace_collapsed() -> None:
    parsed = OfferInput.model_validate(
        {"offer": "  restaurant\x00software\tfor\n\n billing   and staff  ", "city": "Pune"}
    )
    assert parsed.offer == "restaurant software for billing and staff"


@pytest.mark.parametrize("garbage", ["", "   ", "!!!", "12345 !!! ### @@@ $$$ %%% ???"])
def test_empty_and_garbage_offers_rejected(garbage: str) -> None:
    with pytest.raises(ValidationError):
        OfferInput.model_validate({"offer": garbage, "city": "Pune"})


def test_offer_symbol_heavy_text_rejected() -> None:
    with pytest.raises(ValidationError):
        OfferInput.model_validate(
            {"offer": "!!!@@@###$$$%%%^^^&&&***+++===~~~<<<>>>???", "city": "Pune"}
        )


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("city", "X"),
        ("city", "x" * 81),
        ("monthly_price", -1),
        ("monthly_price", 1_000_001),
        ("max_leads", 4),
        ("max_leads", 21),
    ],
)
def test_offer_input_rejects_out_of_range(field: str, value: object) -> None:
    with pytest.raises(ValidationError):
        OfferInput.model_validate({"offer": OFFER, "city": "Ahmedabad", field: value})


def test_offer_input_boundaries_and_defaults() -> None:
    parsed = OfferInput.model_validate(
        {
            "offer": OFFER,
            "city": "Ah",
            "monthly_price": 0,
            "max_leads": 5,
        }
    )
    assert parsed.monthly_price == 0
    assert parsed.max_leads == 5
    top = OfferInput.model_validate(
        {"offer": OFFER, "city": "A" * 80, "monthly_price": 1_000_000, "max_leads": 20}
    )
    assert top.city == "A" * 80
    assert top.monthly_price == 1_000_000


def test_offer_input_rejects_extra_fields() -> None:
    with pytest.raises(ValidationError):
        OfferInput.model_validate({"offer": OFFER, "city": "Pune", "skills": "x"})


def _plan_data(**overrides: object) -> dict[str, object]:
    return {
        "city": "Ahmedabad",
        "product_summary": "Restaurant management system with billing",
        "target_customer": "Mid-level restaurants in Ahmedabad",
        "buyer_roles": ["owner", "manager"],
        "maps_queries": [
            "restaurants in Ahmedabad",
            "family restaurants in Ahmedabad",
            "fine dining restaurants in Ahmedabad",
        ],
        "pain_keywords": ["billing errors", "staff scheduling", "order delays"],
        "competitor_query": "restaurant billing software India",
        "pitch_angle": "Cut billing errors and save staff time",
        **overrides,
    }


def test_lead_plan_accepts_valid() -> None:
    plan = LeadPlan.model_validate(
        _plan_data(
            pain_keywords=["billing errors", "staff shifts", "order delays", "food waste"]
        )
    )
    assert len(plan.maps_queries) == 3


def test_lead_plan_rejects_bad_queries() -> None:
    with pytest.raises(ValidationError):  # only 2 queries
        LeadPlan.model_validate(
            _plan_data(maps_queries=["restaurants in Ahmedabad", "cafes in Ahmedabad"])
        )
    with pytest.raises(ValidationError):  # duplicates
        LeadPlan.model_validate(
            _plan_data(
                maps_queries=[
                    "restaurants in Ahmedabad",
                    "Restaurants in Ahmedabad",
                    "cafes in Ahmedabad",
                ]
            )
        )
    with pytest.raises(ValidationError):  # missing city
        LeadPlan.model_validate(
            _plan_data(
                maps_queries=[
                    "restaurants in Ahmedabad",
                    "cafes in Ahmedabad",
                    "restaurants",
                ]
            )
        )
    with pytest.raises(ValidationError):  # too few pains
        LeadPlan.model_validate(_plan_data(pain_keywords=["a", "b", "c"]))
    with pytest.raises(ValidationError):  # too many pains
        LeadPlan.model_validate(
            _plan_data(pain_keywords=["pain %d" % i for i in range(9)])
        )


def test_lead_plan_rejects_extra_fields() -> None:
    with pytest.raises(ValidationError):
        LeadPlan.model_validate(_plan_data(job_queries=["x"]))


def _lead_data(**overrides: object) -> dict[str, object]:
    return {
        "name": "Sharma Restaurant",
        "address": "MG Road Ahmedabad",
        "rating": 4.2,
        "user_ratings_total": 130,
        "business_type": "restaurant",
        "match_score": 80,
        "match_reasons": ["Serves dine-in customers", "Mid-size team mentioned in reviews"],
        **overrides,
    }


def test_lead_and_response_shapes() -> None:
    lead = Lead.model_validate(_lead_data())
    assert lead.match_score == 80
    response = LeadsResponse.model_validate(
        {
            "offer_summary": "Restaurant management system",
            "leads": [_lead_data()],
            "market_notes": ["Many mid-size restaurants in the area"],
            "meta": {
                "credits_used": 3,
                "cache_hits": 1,
                "degraded": [],
                "partial": [],
                "notes": [],
                "timings_ms": {"plan": 12.5, "discover": 30.0},
            },
            "disclaimer": "Signals only.",
        }
    )
    assert response.schema_version == "1.0"
    assert response.meta.timings_ms == {"plan": 12.5, "discover": 30.0}


def test_leads_response_defaults_disclaimer_and_rejects_extras() -> None:
    response = LeadsResponse.model_validate(
        {
            "offer_summary": "Gym software",
            "leads": [],
            "market_notes": [],
            "meta": {"credits_used": 0, "cache_hits": 0},
        }
    )
    assert "signals" in response.disclaimer.lower()
    with pytest.raises(ValidationError):
        LeadsResponse.model_validate(
            {
                "offer_summary": "Gym software",
                "leads": [],
                "market_notes": ["n%d" % i for i in range(6)],
                "meta": {"credits_used": 0, "cache_hits": 0},
            }
        )
    with pytest.raises(ValidationError):
        Lead.model_validate({**_lead_data(), "phone": "+91"})
    with pytest.raises(ValidationError):
        LeadMeta.model_validate({"credits_used": 0, "cache_hits": 0, "bogus": 1})
