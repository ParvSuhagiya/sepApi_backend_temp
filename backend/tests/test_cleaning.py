"""Tests for cleaning raw SerpAPI responses into safe objects."""

import json
from pathlib import Path

from app.schemas import ForumItem, Job, Place, TrendPoint
from app.services.cleaning import (
    build_trend,
    choose_trend,
    clean_forum,
    clean_jobs,
    clean_places,
    trend_growth_for,
)

FIXTURES = Path(__file__).parent / "fixtures"


def _load(name: str):
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


def _points(values: list[int]) -> list[TrendPoint]:
    return [TrendPoint(date=f"2026-01-{i + 1:02d}", value=v) for i, v in enumerate(values)]


# jobs ----------------------------------------------------------------------

def test_clean_jobs_dedupe_and_cap_at_8() -> None:
    jobs = clean_jobs(_load("jobs.json"))
    assert len(jobs) == 8
    assert all(isinstance(job, Job) for job in jobs)
    titles = [job.title for job in jobs]
    assert titles == [
        "Data Entry Operator",
        "Delivery Partner",
        "Home Tutor",
        "Packing Helper",
        "Telecaller",
        "",
        "Security Guard",
        "Content Writer",
    ]
    assert titles.count("Data Entry Operator") == 1
    assert "Driver" not in titles  # beyond the cap of 8


def test_clean_jobs_flags_salary_links_and_desc() -> None:
    jobs = clean_jobs(_load("jobs.json"))
    first = jobs[0]
    assert first.flags == ["Asks for upfront fee"]
    assert first.risk == "Medium"
    assert first.salary == "₹15,000/month"
    assert first.link == "https://example.test/apply/data-entry"

    assert jobs[1].link == "https://example.test/share/delivery"  # ftp dropped, share kept
    assert jobs[2].salary is None
    assert jobs[3].link is None  # mailto: dropped, no share_link
    assert "<" not in jobs[3].desc and ">" not in jobs[3].desc  # HTML stripped


def test_desc_truncated_to_300_but_flags_use_full_text() -> None:
    description = "Clean office work. " + "Sweeping and mopping daily. " * 30
    description += "Pay a security deposit to start."
    jobs = clean_jobs([{"jobs_results": [{
        "title": "Cleaner",
        "company_name": "ShineCo",
        "location": "Pune",
        "description": description,
        "apply_options": [{"link": "https://example.test/apply/cleaner"}],
    }]}])
    assert len(jobs) == 1
    assert len(jobs[0].desc) <= 300
    assert "security deposit" not in jobs[0].desc
    assert jobs[0].flags == ["Asks for upfront fee"]


def test_clean_jobs_never_raises_on_malformed_data() -> None:
    jobs = clean_jobs([{}, {"jobs_results": None}, None, {"jobs_results": [{}, "bad", None]}])
    assert len(jobs) == 1
    assert jobs[0].title == ""
    assert jobs[0].risk == "Low"
    assert clean_jobs([]) == []


# places --------------------------------------------------------------------

def test_clean_places_dedupe_cap_and_coercion() -> None:
    places = clean_places(_load("maps.json"))
    assert all(isinstance(place, Place) for place in places)
    names = [place.name for place in places]
    assert names == [
        "Sharma Tailoring",
        "City Bakery",
        "Fast Cyber Cafe",
        "Mystery Store",
        "Daily Grocery",
        "Fresh Laundry",
    ]
    assert "Beyond Cap Shop" not in names  # only first 5 per response

    bakery = places[1]
    assert bakery.rating == 4.2
    assert bakery.reviews == 1234
    assert places[0].phone == "+91 98220 12345"
    assert places[2].rating is None
    assert places[2].reviews is None
    assert places[2].phone is None
    assert places[3].rating is None  # "excellent" is not a number
    assert places[3].reviews is None  # "many" is not a number
    assert places[4].reviews == 5  # float 5.0 coerced


def test_clean_places_never_raises_on_malformed_data() -> None:
    assert clean_places([{}, {"local_results": None}, None]) == []
    assert clean_places([]) == []


def test_clean_places_pass_through_gps_coordinates() -> None:
    places = clean_places([{"local_results": [
        {
            "title": "Sharma Tailoring",
            "address": "MG Road Pune",
            "gps_coordinates": {"latitude": 18.5204, "longitude": 73.8567},
        },
        {
            "title": "No Coords Shop",
            "address": "MG Road Pune",
        },
        {
            "title": "Out Of Range Shop",
            "address": "MG Road Pune",
            "gps_coordinates": {"latitude": 91.0, "longitude": -181.0},
        },
        {
            "title": "String Coords Shop",
            "address": "MG Road Pune",
            "gps_coordinates": {"latitude": "18.5", "longitude": "73.8"},
        },
        {
            "title": "Bad Coords Shop",
            "address": "MG Road Pune",
            "gps_coordinates": {"latitude": "north", "longitude": None},
        },
    ]}])
    assert len(places) == 5
    assert (places[0].lat, places[0].lng) == (18.5204, 73.8567)
    assert places[1].lat is None and places[1].lng is None
    assert places[2].lat is None and places[2].lng is None  # out of range
    assert (places[3].lat, places[3].lng) == (18.5, 73.8)
    assert places[4].lat is None and places[4].lng is None


# trends --------------------------------------------------------------------

def test_build_trend_skips_malformed_points() -> None:
    data = _load("trends.json")
    series = build_trend(data["responses"][0])
    assert len(series) == 8
    assert series[0].date == "2026-08-01"
    assert series[0].value == 20
    assert series[-1].value == 30
    assert build_trend({}) == []
    assert build_trend(None) == []


def test_trend_growth_examples() -> None:
    assert trend_growth_for(_points([20, 20, 20, 20, 30, 30, 30, 30])) == 50
    assert trend_growth_for(_points([10, 10, 10])) == 0
    assert trend_growth_for(_points([0, 0, 0, 0, 0, 0, 0, 0])) == 0
    assert trend_growth_for(_points([30, 30, 30, 30, 20, 20, 20, 20])) == -33
    assert trend_growth_for([]) == 0


def test_choose_trend_picks_first_keyword_with_data() -> None:
    data = _load("trends.json")
    series, keyword, growth = choose_trend(data["keywords"], data["responses"])
    assert keyword == "baking classes"
    assert len(series) == 8
    assert growth == {"baking classes": 50}


def test_choose_trend_returns_empty_when_no_data() -> None:
    assert choose_trend(["a"], [None]) == ([], None, {})
    assert choose_trend(["a", "b"], [{}, None]) == ([], None, {})


def test_choose_trend_skips_keywords_without_data() -> None:
    data = _load("trends.json")
    series, keyword, growth = choose_trend(
        ["empty", "good"], [{}, data["responses"][0]]
    )
    assert keyword == "good"
    assert growth == {"good": 50}
    assert len(series) == 8


# forum ---------------------------------------------------------------------

def test_clean_forum_cap_and_filters() -> None:
    items = clean_forum(_load("forums.json"))
    assert len(items) == 4
    assert all(isinstance(item, ForumItem) for item in items)
    assert all(link.startswith("https://") for link in [i.link for i in items])
    assert items[0].title == "Home baking business tips"
    assert len(items[0].snippet) <= 240
    assert items[2].snippet == ""  # missing snippet key
    assert "Fallback thread" not in [i.title for i in items]  # beyond cap


def test_clean_forum_falls_back_to_forum_results() -> None:
    items = clean_forum([{"forum_results": [{
        "title": "Fallback thread",
        "link": "https://forum.test/t/fallback",
        "snippet": "Via fallback.",
    }]}])
    assert [i.title for i in items] == ["Fallback thread"]


def test_clean_forum_never_raises_on_malformed_data() -> None:
    assert clean_forum([{}, None, {"organic_results": None}]) == []
    assert clean_forum([]) == []
