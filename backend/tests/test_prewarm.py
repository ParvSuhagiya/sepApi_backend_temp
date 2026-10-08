"""Unit tests for the prewarm readiness check (no network)."""

import pytest

from scripts.prewarm import (
    _demo_readiness,
    _leads_readiness,
    load_profiles,
    main,
    prewarm_leads_one,
)


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
    path.write_text(
        '[{"skills": "x生き", "city": "Pune", "hours": 1, "budget": 0}]',
        encoding="utf-8",
    )
    assert len(load_profiles(str(path))) == 1


def test_main_help_and_empty(tmp_path, capsys):
    assert main(["--help"]) == 0
    empty = tmp_path / "empty.json"
    empty.write_text("[]", encoding="utf-8")
    assert main([str(empty)]) == 2
    assert "no profiles" in capsys.readouterr().out


def _leads_summary(leads=6, with_phone=4):
    return {
        "ok": True,
        "credits_used": 7,
        "cache_hits": 0,
        "leads": leads,
        "with_phone": with_phone,
    }


def test_leads_readiness_ready_when_thresholds_met():
    ready, problems = _leads_readiness(_leads_summary(), 0)
    assert ready is True
    assert problems == []


def test_leads_readiness_reports_each_gap():
    ready, problems = _leads_readiness(_leads_summary(leads=2, with_phone=1), 3)
    assert ready is False
    assert len(problems) == 3


def test_leads_readiness_fails_without_success():
    ready, problems = _leads_readiness({"ok": False, "error": "UpstreamFailure"}, 0)
    assert ready is False
    assert problems


async def test_prewarm_leads_one_ok_and_error(monkeypatch):
    import app.modes.customers.pipeline as pipeline_module

    async def fake_run(body, request_id=None):
        return {
            "leads": [{"phone": "123"} for _ in range(6)],
            "meta": {"credits_used": 7, "cache_hits": 0, "notes": []},
        }

    async def boom(body, request_id=None):
        raise RuntimeError("down")

    from scripts.prewarm import LEADS_EXAMPLE

    monkeypatch.setattr(pipeline_module, "run_leads", fake_run)
    summary = await prewarm_leads_one(dict(LEADS_EXAMPLE))
    assert summary["ok"] is True
    assert summary["leads"] == 6
    assert summary["with_phone"] == 6

    monkeypatch.setattr(pipeline_module, "run_leads", boom)
    failed = await prewarm_leads_one(dict(LEADS_EXAMPLE))
    assert failed["ok"] is False
    assert failed["error"] == "RuntimeError"
