"""Prompt-3 placeholder modules (ranker, pipeline) import cleanly."""

import app.modes.customers.pipeline as pipeline_module
import app.modes.customers.ranker as ranker_module


def test_placeholders_import() -> None:
    assert pipeline_module.__all__ == []
    assert ranker_module.__all__ == []
