"""EarnRadar product modes.

Mode 1 "income" lives in the existing ``app.services`` / ``app.schemas``
modules (untouched by the customer-mode work). Mode 2 "customers" lives in
``app.modes.customers``. Shared infrastructure (SerpAPI client + cache,
LLM seam, budgets, rate limiting, observability, security) stays in
``app.services`` / top-level ``app`` modules and is reused, never forked.
"""

__all__: list[str] = []
