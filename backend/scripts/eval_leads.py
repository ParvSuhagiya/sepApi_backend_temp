"""Offline evaluation harness for the Find Customers pipeline (no network).

Reads recorded fixtures (3 offers x 2 cities) from
``tests/fixtures/leads/*.json`` and reports, per fixture and overall:

- mid-level filter precision/recall against the hand-labelled ``keep`` ids
  (keep = non-chain places with mid_level_signal > 0),
- AI-text acceptance rate (annotations that used AI text vs deterministic
  fallback) and the deterministic fallback rate,
- output validity (every annotation within length caps, numbers grounded in
  its evidence, no contact details) — must be 1.0,
- average SerpAPI calls a live run would issue (3 discovery + reviews for
  the researched top-N + 1 market search).

Exit non-zero when precision < 0.8 or AI acceptance ("validity") < 0.9.
"""

from __future__ import annotations

import asyncio
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault("SERPAPI_KEY", "eval-dummy-key")
os.environ.setdefault("ANTHROPIC_API_KEY", "eval-dummy-key")

FIXTURE_DIR = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "..", "tests", "fixtures", "leads"
)

PRECISION_FLOOR = 0.8
VALIDITY_FLOOR = 0.9

_NUMBER_RE = re.compile(r"\d+(?:\.\d+)?")
_URL_RE = re.compile(r"https?://\S+|www\.\S+", re.IGNORECASE)
_EMAIL_RE = re.compile(r"\S+@\S+\.\S+")
_PHONE_RE = re.compile(r"\+?[\d][\d\s\-()]{5,}[\d]")


def _evidence_numbers(evidence: dict) -> set[str]:
    return set(_NUMBER_RE.findall(json.dumps(evidence, ensure_ascii=False)))


def _annotation_valid(annotation, evidence: dict) -> bool:
    if not (0 < len(annotation.why_fit) <= 200):
        return False
    if not (0 < len(annotation.pitch_angle) <= 160):
        return False
    if not (0 < len(annotation.suggested_first_question) <= 120):
        return False
    blob = " ".join(
        [
            annotation.why_fit,
            annotation.pitch_angle,
            annotation.suggested_first_question,
        ]
    )
    if _URL_RE.search(blob) or _EMAIL_RE.search(blob) or _PHONE_RE.search(blob):
        return False
    numbers = _evidence_numbers(evidence)
    return all(n in numbers for n in _NUMBER_RE.findall(annotation.why_fit))


async def _eval_fixture(path: str) -> dict:
    from app.modes.customers import ranker as ranker_module
    from app.modes.customers import scoring as scoring_module
    from app.modes.customers.discovery import normalise_place
    from app.modes.customers.scoring import is_chain_lead, mid_level_signal

    with open(path, encoding="utf-8") as fh:
        fixture = json.load(fh)

    places = []
    for raw in fixture["places"]:
        place = normalise_place(raw)
        if place is not None:
            places.append(place)
    keep_ids = set(fixture["keep"])

    kept = [
        place
        for place in places
        if not is_chain_lead(place) and mid_level_signal(place) > 0
    ]
    kept_ids = {place.place_id for place in kept}
    true_pos = len(kept_ids & keep_ids)
    precision = true_pos / len(kept_ids) if kept_ids else 0.0
    recall = true_pos / len(keep_ids) if keep_ids else 1.0

    scored = []
    for place in kept:
        result = scoring_module.lead_score(
            mid_level=mid_level_signal(place),
            pain_hits=0,
            has_phone=bool(place.phone),
            has_website=bool(place.website),
            likely_has_software=False,
            research="pending",
        )
        scored.append(
            {
                "place": place,
                "mid_level": mid_level_signal(place),
                "score": result.score,
            }
        )

    async def fake_ask_json(system, user, max_tokens, *, temperature=0.2, label="llm"):
        return dict(fixture["ai_response"])

    import app.services.llm as llm_module

    original = llm_module.ask_json
    llm_module.ask_json = fake_ask_json
    try:
        annotations, _ = await ranker_module.explain_leads(
            scored, city=fixture["city"], default_pitch="Save staff time", pains=[]
        )
    finally:
        llm_module.ask_json = original

    evidence = [
        ranker_module.build_lead_evidence(
            entry["place"], index=i, mid_level=entry["mid_level"], score=entry["score"]
        )
        for i, entry in enumerate(scored)
    ]
    valid = sum(
        1 for ann, ev in zip(annotations, evidence) if _annotation_valid(ann, ev)
    )
    fallbacks = 0
    for ann, entry in zip(annotations, scored):
        expected = ranker_module.deterministic_annotation(
            entry["place"],
            city=fixture["city"],
            default_pitch="Save staff time",
            pains=[],
        )
        if (
            ann.why_fit == expected.why_fit
            and ann.pitch_angle == expected.pitch_angle
            and ann.suggested_first_question == expected.suggested_first_question
        ):
            fallbacks += 1
    total = len(annotations)
    acceptance = (total - fallbacks) / total if total else 1.0

    with_place_id = sum(1 for p in kept if p.place_id)
    calls = 3 + min(5, with_place_id) + 1
    return {
        "file": os.path.basename(path),
        "places": len(places),
        "kept": len(kept),
        "precision": precision,
        "recall": recall,
        "annotations": total,
        "acceptance": acceptance,
        "fallback_rate": fallbacks / total if total else 0.0,
        "validity": valid / total if total else 1.0,
        "calls": calls,
    }


async def _main_async() -> int:
    files = sorted(f for f in os.listdir(FIXTURE_DIR) if f.endswith(".json"))
    if not files:
        print("eval: no fixtures found")
        return 2
    results = [await _eval_fixture(os.path.join(FIXTURE_DIR, f)) for f in files]
    total_kept = sum(r["kept"] for r in results)
    micro_tp = sum(r["precision"] * r["kept"] for r in results)
    precision = micro_tp / total_kept if total_kept else 0.0
    total_ann = sum(r["annotations"] for r in results)
    accepted = sum(r["acceptance"] * r["annotations"] for r in results)
    validity = accepted / total_ann if total_ann else 1.0
    all_valid = all(r["validity"] == 1.0 for r in results)
    avg_calls = sum(r["calls"] for r in results) / len(results)
    avg_fallback = sum(r["fallback_rate"] for r in results) / len(results)

    for r in results:
        print(
            f"eval {r['file']}: places={r['places']} kept={r['kept']} "
            f"precision={r['precision']:.3f} recall={r['recall']:.3f} "
            f"acceptance={r['acceptance']:.3f} fallback={r['fallback_rate']:.3f} "
            f"validity={r['validity']:.3f} calls={r['calls']}"
        )
    print(
        f"eval TOTAL: precision={precision:.3f} (floor {PRECISION_FLOOR}) "
        f"validity={validity:.3f} (floor {VALIDITY_FLOOR}) "
        f"output_valid={all_valid} avg_fallback={avg_fallback:.3f} "
        f"avg_calls={avg_calls:.1f}"
    )
    if precision < PRECISION_FLOOR:
        print("eval: FAIL precision below floor")
        return 1
    if validity < VALIDITY_FLOOR:
        print("eval: FAIL validity below floor")
        return 1
    if not all_valid:
        print("eval: FAIL an annotation failed the independent validity check")
        return 1
    print("eval: PASS")
    return 0


def main() -> int:
    return asyncio.run(_main_async())


if __name__ == "__main__":
    raise SystemExit(main())
