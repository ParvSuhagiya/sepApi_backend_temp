"""Known software vendor names (stub for step 1.1).

Later steps use this list to spot competitor mentions in reviews/snippets.
A match only produces a "possible competitor mention" signal, never a
verified fact.
"""

__all__ = ["KNOWN_SOFTWARE_VENDORS"]

KNOWN_SOFTWARE_VENDORS: tuple[str, ...] = ()
