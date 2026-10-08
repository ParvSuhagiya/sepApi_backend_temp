"""Export the FastAPI OpenAPI schema to docs/openapi.json.

Works even when ENABLE_DOCS=false: ``app.openapi()`` generates the schema
regardless of whether ``/docs`` is served (that flag only gates the route).
Output is deterministic (sorted keys) so CI can fail when the committed
file is out of date.

Usage (from ``backend/``):
    python scripts/export_openapi.py [output-path]
"""

from __future__ import annotations

import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault("SERPAPI_KEY", "export-dummy-key")
os.environ.setdefault("ANTHROPIC_API_KEY", "export-dummy-key")


def default_output_path() -> str:
    """Repo docs/openapi.json next to backend/."""
    return os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "..",
        "docs",
        "openapi.json",
    )


def build_schema(fastapi_app) -> dict:
    """Return the OpenAPI dict for a FastAPI app (never touches the network)."""
    schema = fastapi_app.openapi()
    if not isinstance(schema, dict):
        raise RuntimeError("could not build OpenAPI schema")
    return schema


def write_openapi(path: str | None = None) -> dict:
    """Write the schema for the real app to path; return the schema dict."""
    import app.main as main_module

    schema = build_schema(main_module.app)
    out_path = path or default_output_path()
    parent = os.path.dirname(os.path.abspath(out_path))
    if parent:
        os.makedirs(parent, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as fh:
        fh.write(json.dumps(schema, indent=2, sort_keys=True, ensure_ascii=False))
        fh.write("\n")
    return schema


def main(argv: list[str] | None = None) -> int:
    args = list(sys.argv[1:] if argv is None else argv)
    if args and args[0] in ("-h", "--help"):
        print(__doc__)
        return 0
    try:
        schema = write_openapi(args[0] if args else None)
    except Exception as exc:
        print(f"could not export OpenAPI schema: {type(exc).__name__}: {exc}")
        return 2
    paths = sorted(schema.get("paths", {}))
    print(f"openapi: wrote {len(paths)} paths: {', '.join(paths)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
