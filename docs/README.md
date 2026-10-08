# docs/ — note on the authoritative documents

The project brief names four authoritative documents:

- `EarnRadar-Master-Guide.md`
- `EarnRadar-PRD.md`
- `EarnRadar-PDD.md`
- `EarnRadar-Tech-Stack-and-Structure.md` (earlier revision)

None of them were present anywhere in this repository (verified with
`git ls-files` and a full directory listing), so there was nothing to copy
into `docs/`. To keep the repo self-describing, this folder instead contains:

- `EarnRadar-Tech-Stack-and-Structure.md` — rewritten from scratch to describe
  the system **as built** (real `app/` layout, real file list, all current env
  vars, real start command).
- `GAPS-G-1-G-15.md` — status column for gaps G-1…G-15, inferred from the work
  brief; entries that cannot be verified without the PDD are marked Unknown.
- `RELEASE_CHECKLIST.md` — release checklist (PDD §19.2 items as cited in the
  brief, plus the new operational items).
- `API.md` — `POST /api/leads` reference with a validated example.
- `ADR-0001-customer-mode.md` — why the separate mode package, signals not
  guarantees, no lead-website scraping.
- `RUNBOOK.md` — budgets, outages, cache reset, rolling back customer mode.
- `DATA-HANDLING.md` — what is collected, retention, what is never stored.
- `find-customers-scoring.md` — lead scoring signals and weights.

If the originals surface later, copy them here unchanged and reconcile any
conflicts against the code before editing.
