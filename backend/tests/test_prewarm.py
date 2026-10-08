"""Unit tests for the prewarm readiness check (no network)."""

import pytest

from scripts.prewarm import _demo_readiness, load_profiles, main


def _result(jobs=None, local=None, trend=None):
    return {
        "jobs": jobs or [],
        "local": local or [],
        "trend": trend or [],
    }


def _summary(result):
    return {"ok": True, "result": result}


def test_readiness_ready_when_all_signals_present():
    summaries = [
        _summary(
            _result(
                jobs=[{"risk": "High"}],
                local=[{"phone": "+91 1"}],
                trend=[{"date": "2026-01-01", "value": 5}],
            )
        )
    ]
    ready, problems = _demo_readiness(summaries)
    assert ready is True
    assert problems == []


def test_readiness_reports_each_gap():
    ready, problems = _demo_readiness([_summary(_result())])
    assert ready is False
    assert len(problems) == 3


def test_readiness_fails_without_success():
    ready, problems = _demo_readiness([{"ok": False}])
    assert ready is False
    assert problems


def test_load_profiles_defaults_and_file(tmp_path):
    defaults = load_profiles(None)
    assert len(defaults) == 4
    assert defaults[0]["city"] == "Ahmedabad"

    path = tmp_path / "profiles.json"
    path.write_text('[{"skills": "x生き", "city": "Pune", "hours": 1, "budget": 0}]', encoding="utf-8")
    assert len(load_profiles(str(path))) == 1


def test_main_help_and_empty(tmp_path, capsys):
    assert main(["--help"]) == 0
    empty = tmp_path / "empty.json"
    empty.write_text("[]", encoding="utf-8")
    assert main([str(empty)]) == 2
    assert "no profiles" in capsys.readouterr().out
