"""Pipeline module exposes the customer-mode entry points."""

import app.modes.customers.pipeline as pipeline_module


def test_pipeline_surface() -> None:
    assert callable(pipeline_module.run_leads)
    assert callable(pipeline_module.normalise_request_key)
    assert callable(pipeline_module.reset_leads_state)
