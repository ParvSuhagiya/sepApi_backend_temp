"""Tests for the typed contract: OpenAPI export shape and freshness."""

import importlib
import json
from pathlib import Path

import pytest

import app.main as main_module
from app.config import get_settings
from scripts.export_openapi import build_schema, default_output_path, write_openapi

DOCS_PATH = Path(__file__).resolve().parent.parent.parent / "docs" / "openapi.json"


def test_export_lists_all_endpoints_and_coordinate_fields() -> None:
    schema = build_schema(main_module.app)
    assert sorted(schema["paths"]) == [
        "/api/health",
        "/api/leads",
        "/api/outreach",
        "/api/search",
    ]
    models = schema["components"]["schemas"]
    assert sorted(models["Job"]["properties"]) == [
        "company",
        "desc",
        "flags",
        "geo_precision",
        "lat",
        "link",
        "lng",
        "location",
        "risk",
        "salary",
        "title",
        "via",
    ]
    assert sorted(models["Place"]["properties"]) == [
        "address",
        "lat",
        "lng",
        "name",
        "phone",
        "rating",
        "reviews",
        "type",
    ]
    assert "city_center" in models["Meta"]["properties"]
    assert "CityCenter" in models


def test_export_works_when_docs_disabled(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ENABLE_DOCS", "false")
    get_settings.cache_clear()
    reloaded = importlib.reload(main_module)
    try:
        assert reloaded.app.docs_url is None
        assert reloaded.app.openapi_url is None
        schema = build_schema(reloaded.app)
        assert "/api/search" in schema["paths"]
        assert "/api/leads" in schema["paths"]
    finally:
        monkeypatch.delenv("ENABLE_DOCS", raising=False)
        get_settings.cache_clear()
        importlib.reload(main_module)


def test_write_openapi_roundtrip(tmp_path) -> None:
    out = tmp_path / "openapi.json"
    schema = write_openapi(str(out))
    assert out.exists()
    assert json.loads(out.read_text(encoding="utf-8")) == schema


def test_committed_openapi_is_fresh(tmp_path) -> None:
    """The committed docs/openapi.json must match a fresh export (CI pins this)."""
    assert DOCS_PATH.exists(), "docs/openapi.json missing: run scripts/export_openapi.py"
    fresh_path = tmp_path / "fresh.json"
    fresh = write_openapi(str(fresh_path))
    committed = json.loads(DOCS_PATH.read_text(encoding="utf-8"))
    assert committed == fresh, "docs/openapi.json is stale: run scripts/export_openapi.py"


def test_default_output_path_points_at_docs() -> None:
    assert Path(default_output_path()).name == "openapi.json"
    assert default_output_path().endswith("openapi.json")
