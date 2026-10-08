"""Tests for customer-mode discovery: normalisation, dedupe, failures, SSRF."""

import httpx
import pytest
import respx

import app.services.serp as serp_module
from app.errors import AllSourcesFailed
from app.modes.customers.discovery import (
    MAPS_ENGINE,
    dedupe_places,
    discover,
    normalise_place,
    parse_maps_url,
    parse_phone,
    parse_price_level,
    parse_rating,
    parse_review_count,
    parse_website,
)
from app.modes.customers.schemas import LeadPlan


def _plan() -> LeadPlan:
    return LeadPlan.model_validate(
        {
            "city": "Ahmedabad",
            "product_summary": "Restaurant management system",
            "target_customer": "Mid-level restaurants in Ahmedabad",
            "buyer_roles": ["owner"],
            "maps_queries": [
                "restaurants in Ahmedabad",
                "family restaurants in Ahmedabad",
                "cafes in Ahmedabad",
            ],
            "pain_keywords": ["billing errors", "staff shifts", "order delays", "food waste"],
            "competitor_query": "restaurant billing software India",
            "pitch_angle": "Cut billing errors",
        }
    )


def _patch_serp(monkeypatch: pytest.MonkeyPatch, func) -> None:
    monkeypatch.setattr(serp_module, "serp", func)


def _maps_payload(*titles: str) -> dict:
    return {
        "local_results": [
            {
                "title": title,
                "address": "MG Road Ahmedabad",
                "rating": 4.2,
                "reviews": 320,
                "phone": "+91 98220 12345",
                "type": "Restaurant",
            }
            for title in titles
        ]
    }


# --- normalisation edge cases ---------------------------------------------

def test_full_item_normalises() -> None:
    place = normalise_place(
        {
            "title": "Sharma Restaurant",
            "type": "Restaurant",
            "address": "MG Road Ahmedabad",
            "rating": 4.2,
            "reviews": 320,
            "price_level": "$$",
            "phone": "+91 98220 12345",
            "website": "https://sharma.example.com",
            "link": "https://maps.google.com/?q=sharma",
            "place_id": "abc123",
            "operating_status": "Open",
        }
    )
    assert place is not None
    assert place.name == "Sharma Restaurant"
    assert place.rating == 4.2
    assert place.review_count == 320
    assert place.price_level == 2
    assert place.phone == "919822012345"
    assert place.website == "https://sharma.example.com"
    assert place.maps_url == "https://maps.google.com/?q=sharma"
    assert place.place_id == "abc123"


def test_missing_fields_become_none() -> None:
    place = normalise_place({"title": "Lonely Dhaba"})
    assert place is not None
    assert place.rating is None
    assert place.review_count is None
    assert place.price_level is None
    assert place.phone is None
    assert place.website is None
    assert place.maps_url is None
    assert place.place_id is None


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        (4.3, 4.3),
        ("4.3", 4.3),
        ("4.3/5", 4.3),
        (0, 0.0),
        (5, 5.0),
        (None, None),
        ("great", None),
        (7.5, None),
        (-1, None),
        (True, None),
        (float("nan"), None),
    ],
)
def test_rating_edge_cases(raw: object, expected: object) -> None:
    assert parse_rating(raw) == expected


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        (320, 320),
        ("1,234", 1234),
        ("1.2K reviews", 1200),
        ("2.5k", 2500),
        ("3M", 3_000_000),
        ("(500)", 500),
        (None, None),
        ("many", None),
        (-5, None),
        (True, None),
    ],
)
def test_review_count_edge_cases(raw: object, expected: object) -> None:
    assert parse_review_count(raw) == expected


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("$", 1),
        ("$$", 2),
        ("₹₹", 2),
        ("₹₹₹", 3),
        ("$$$$$", 4),
        ("₹200-400", 1),
        ("moderate", 2),
        ("luxury", 4),
        (2, 2),
        (9, None),
        (None, None),
        ("200-400", None),
        ("unknown words", None),
    ],
)
def test_price_level_edge_cases(raw: object, expected: object) -> None:
    assert parse_price_level(raw) == expected


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("+91 98220 12345", "919822012345"),
        ("9822012345", "9822012345"),
        ("123", None),
        ("1-800-123-4567", "18001234567"),
        ("call us", None),
        (None, None),
        (12345, None),
    ],
)
def test_phone_edge_cases(raw: object, expected: object) -> None:
    assert parse_phone(raw) == expected


def test_hostile_website_rejected() -> None:
    assert parse_website("https://ok.example.com") == "https://ok.example.com"
    assert parse_website("http://ok.example.com/x") == "http://ok.example.com/x"
    assert parse_website("ftp://files.example.com") is None
    assert parse_website("javascript:alert(1)") is None
    assert parse_website("not a url") is None
    assert parse_website("https://" + "x" * 300) is None


def test_hostile_maps_url_rejected() -> None:
    assert parse_maps_url("https://maps.google.com/?q=x") is not None
    assert parse_maps_url("https://www.google.com/maps?q=x") is not None
    assert parse_maps_url("https://maps.app.goo.gl/abc") is not None
    assert parse_maps_url("https://evil.example.com/maps") is None
    assert parse_maps_url("https://fakegoogle.com") is None
    assert parse_maps_url("https://google.com.evil.example/") is None


@pytest.mark.parametrize(
    "item",
    [
        {},
        {"title": "   "},
        {"title": "X", "operating_status": "Permanently closed"},
        {"title": "X", "open_state": "Temporarily Closed"},
        {"title": "X", "closed": True},
        "not a dict",
        None,
    ],
)
def test_drops(item: object) -> None:
    assert normalise_place(item) is None


def test_time_of_day_closed_is_kept() -> None:
    place = normalise_place({"title": "Night Canteen", "hours": "Closed ⋅ Opens 9 AM"})
    assert place is not None


def test_html_and_controls_stripped() -> None:
    place = normalise_place({"title": "<b>Sharma</b>\x00 Restaurant\tX"})
    assert place is not None
    assert place.name == "Sharma Restaurant X"


def test_dedupe_by_place_id_else_name_address() -> None:
    def make(name, address, place_id=None):
        return normalise_place(
            {"title": name, "address": address, "place_id": place_id}
        )

    first, dup_id, dup_name, other = (
        make("Sharma", "MG Road", "p1"),
        make("Sharma Duplicate", "Other Road", "p1"),
        make("SHARMA ", " mg road ", None),
        make("Sharma", "CG Road", None),
    )
    assert all(p is not None for p in (first, dup_id, dup_name, other))
    unique = dedupe_places([first, dup_name, dup_id, other])  # type: ignore[list-item]
    # dup_id drops (same place_id as first); dup_name is distinct from first
    # (id-keyed vs name-keyed) but drops the later identical name+address twin.
    assert [p.name for p in unique] == ["Sharma", "SHARMA", "Sharma"]
    twins = dedupe_places([dup_name, make("sharma", "MG ROAD")])  # type: ignore[list-item]
    assert len(twins) == 1


# --- discover() behaviour ---------------------------------------------------

async def test_discover_merges_three_queries(monkeypatch: pytest.MonkeyPatch) -> None:
    seen: list[str] = []

    async def fake_serp(engine: str, **params):
        assert engine == MAPS_ENGINE
        assert engine != "google_jobs"
        seen.append(params["q"])
        return _maps_payload(f"Place for {params['q']}")

    _patch_serp(monkeypatch, fake_serp)
    result = await discover(_plan())
    assert result.maps_partial is False
    assert result.queries_run == 3
    assert result.queries_failed == 0
    assert len(result.places) == 3
    assert len(seen) == 3


async def test_discover_one_failure_marks_partial(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_serp(engine: str, **params):
        if "family" in params["q"]:
            raise RuntimeError("boom")
        return _maps_payload(f"Solo {params['q']}")

    _patch_serp(monkeypatch, fake_serp)
    result = await discover(_plan())
    assert result.maps_partial is True
    assert result.queries_failed == 1
    assert len(result.places) == 2


async def test_discover_error_payload_counts_as_failure(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_serp(engine: str, **params):
        if "cafes" in params["q"]:
            return {"error": "Invalid API key"}
        return _maps_payload(f"Solo {params['q']}")

    _patch_serp(monkeypatch, fake_serp)
    result = await discover(_plan())
    assert result.maps_partial is True
    assert result.queries_failed == 1


async def test_discover_benign_no_results_is_not_failure(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_serp(engine: str, **params):
        if "cafes" in params["q"]:
            return {"error": "Google Maps - hasn't returned any results for this query."}
        return _maps_payload(f"Solo {params['q']}")

    _patch_serp(monkeypatch, fake_serp)
    result = await discover(_plan())
    assert result.maps_partial is False
    assert result.queries_failed == 0
    assert len(result.places) == 2


async def test_discover_all_fail_raises_friendly_502(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_serp(engine: str, **params):
        raise RuntimeError("down")

    _patch_serp(monkeypatch, fake_serp)
    with pytest.raises(AllSourcesFailed) as exc_info:
        await discover(_plan())
    assert exc_info.value.status == 502
    assert exc_info.value.message == (
        "We could not reach our data sources. Please try again shortly."
    )


# --- SSRF safety: only SerpAPI is ever contacted ------------------------------

@pytest.fixture
async def real_serp(tmp_cache_path):
    await serp_module.close_serp()
    serp_module.init_cache(tmp_cache_path)
    serp_module.request_stats.set(None)
    serp_module.new_request_stats()
    yield serp_module
    await serp_module.close_serp()
    serp_module.request_stats.set(None)


async def test_discovery_contacts_only_serpapi(real_serp) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        query = request.url.params.get("q", "")
        assert request.url.params.get("engine") == "google_maps"
        return httpx.Response(
            200,
            json=_maps_payload(f"Live {query}"),
        )

    with respx.mock(assert_all_called=False) as router:
        router.get("https://serpapi.com/search.json").mock(side_effect=handler)
        result = await discover(_plan())
        assert len(result.places) == 3
        hosts = {call.request.url.host for call in router.calls}
        assert hosts == {"serpapi.com"}
