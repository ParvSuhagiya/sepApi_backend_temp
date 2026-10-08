"""Table-driven tests for mid_level_signal: every branch, monotonicity, chains."""

import pytest

from app.modes.customers.constants import MID_LEVEL_BANDS, bands_for
from app.modes.customers.scoring import (
    W_MID_PRICE,
    W_MID_RATING,
    W_MID_REVIEWS,
    is_chain,
    is_chain_lead,
    mid_level_signal,
    score_price_level,
    score_rating_value,
    score_review_count,
)
from app.modes.customers.schemas import LeadPlace


def _place(**overrides) -> LeadPlace:
    base: dict = {"name": "Sharma Restaurant"}
    base.update(overrides)
    return LeadPlace.model_validate(base)


def _bands():
    return MID_LEVEL_BANDS["restaurant"]


# --- component tables -------------------------------------------------------

@pytest.mark.parametrize(
    ("count", "expected"),
    [
        (None, 50.0),
        (0, 40.0),
        (40, 70.0),
        (80, 100.0),
        (500, 100.0),
        (1500, 100.0),
        (3000, 60.0),
        (10000, 60.0),
    ],
)
def test_review_count_branches(count, expected) -> None:
    assert score_review_count(count, _bands()) == pytest.approx(expected)


@pytest.mark.parametrize(
    ("rating", "expected"),
    [
        (None, 50.0),
        (3.8, 100.0),
        (4.6, 100.0),
        (4.2, 100.0),
        (5.0, 60.0),
        (4.7, 90.0),
        (2.8, 20.0),
        (1.0, 20.0),
    ],
)
def test_rating_branches(rating, expected) -> None:
    assert score_rating_value(rating, _bands()) == pytest.approx(expected)


@pytest.mark.parametrize(
    ("level", "expected"),
    [(2, 100.0), (3, 75.0), (1, 50.0), (4, 40.0), (None, 50.0)],
)
def test_price_branches(level, expected) -> None:
    assert score_price_level(level) == pytest.approx(expected)


def test_mid_weights_sum_to_one() -> None:
    assert W_MID_REVIEWS + W_MID_RATING + W_MID_PRICE == pytest.approx(1.0)


# --- combined signal ----------------------------------------------------------

def test_perfect_mid_level_place_scores_100() -> None:
    place = _place(rating=4.2, review_count=320, price_level=2, phone="919822012345")
    assert mid_level_signal(place) == 100


def test_unknown_everything_is_neutral() -> None:
    assert mid_level_signal(_place()) == 50


def test_phone_gives_bonus() -> None:
    without = mid_level_signal(_place(rating=4.2, review_count=320, price_level=3))
    with_phone = mid_level_signal(
        _place(rating=4.2, review_count=320, price_level=3, phone="919822012345")
    )
    assert (without, with_phone) == (95, 100)


def test_monotonic_in_reviews_and_rating() -> None:
    climbing = [
        mid_level_signal(_place(review_count=n, rating=4.2, price_level=2))
        for n in (0, 10, 79, 80, 500, 1500)
    ]
    assert climbing == sorted(climbing)
    decaying = [
        mid_level_signal(_place(review_count=n, rating=4.2, price_level=2))
        for n in (1500, 1501, 3000, 9000)
    ]
    assert decaying == sorted(decaying, reverse=True)
    ratings_up = [
        mid_level_signal(_place(review_count=300, rating=r, price_level=2))
        for r in (1.0, 2.0, 3.0, 3.8, 4.2, 4.6)
    ]
    assert ratings_up == sorted(ratings_up)
    ratings_down = [
        mid_level_signal(_place(review_count=300, rating=r, price_level=2))
        for r in (4.6, 4.8, 5.0)
    ]
    assert ratings_down == sorted(ratings_down, reverse=True)


def test_price_ordering() -> None:
    scores = {
        level: mid_level_signal(_place(review_count=300, rating=4.2, price_level=level))
        for level in (1, 2, 3, 4)
    }
    assert scores[2] > scores[3] > scores[1] > scores[4]


# --- chains -------------------------------------------------------------------

@pytest.mark.parametrize(
    "name",
    [
        "Dominos Pizza Cafe",
        "DOMINOS PIZZA",
        "McDonald's Family Restaurant",
        "KFC Outlet Ahmedabad",
        "Cafe Coffee Day MG Road",
        "Lenskart Store",
        "OYO Rooms Satellite",
        "Gold's Gym South",
    ],
)
def test_chain_names_flagged(name: str) -> None:
    assert is_chain(name) is True
    assert is_chain_lead(_place(name=name)) is True
    assert mid_level_signal(_place(name=name, rating=4.5, review_count=500)) == 0


@pytest.mark.parametrize(
    "name",
    [
        "Domino Effect Cafe",
        "Sharma Restaurant",
        "Pizza By The Bay",
        "Cafe Sholay",
        "The Burger Barn",
        "Hotel Surya",
        "",
    ],
)
def test_chain_false_positives_guarded(name: str) -> None:
    assert is_chain(name) is False
    assert mid_level_signal(_place(name=name or "X")) > 0


# --- bands / ordering -----------------------------------------------------------

def test_bands_fallback_to_restaurant_for_extension_points() -> None:
    assert bands_for("restaurant") == MID_LEVEL_BANDS["restaurant"]
    for pending in ("salon", "clinic", "gym", "unknown", ""):
        assert bands_for(pending) == MID_LEVEL_BANDS["restaurant"]


def test_stable_ordering_for_ties() -> None:
    places = [_place(name=f"Place {i}") for i in range(5)]
    assert {mid_level_signal(p) for p in places} == {50}
    ordered = sorted(places, key=mid_level_signal, reverse=True)
    assert [p.name for p in ordered] == [f"Place {i}" for i in range(5)]
