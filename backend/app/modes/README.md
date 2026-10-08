# Modes boundary

- **Shared infra** lives in `app/services/` (SerpAPI client + per-engine TTL
  cache, LLM seam `app/services/llm.py`, cleaning, scoring helpers) and in
  top-level `app/` modules (`config`, `budget`, `security`, `observability`,
  `errors`, `prompts` for income mode, `utils`).
- **Mode logic** lives in `app/modes/<mode>/`:
  - `app/modes/customers/` is Mode 2 "customers" (find customer businesses
    for a product owner). It reuses shared infra and never forks it.
  - Mode 1 "income" (jobs/local/trends/forums ranked income ideas) keeps its
    existing files in `app/services/` and `app/schemas.py` untouched.

Rules:

1. Never move or rename existing income-mode files.
2. Never call the Google Jobs engine from customer mode.
3. New shared helpers go in `app/services/` or `app/` only when both modes
   need them; otherwise keep them inside the mode package.
4. Static reference data lives in `app/data/` (`chains.py`, known chain
   brands; `software_vendors.py`, known software vendor names).
