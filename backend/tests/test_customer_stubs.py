"""Prompt-3 placeholder module (pipeline) imports cleanly."""

import app.modes.customers.pipeline as pipeline_module


def test_placeholder_imports() -> None:
    assert pipeline_module.__all__ == []
