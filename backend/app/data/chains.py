"""Known chain brands (stub for step 1.1).

Later steps use this list to flag businesses that look like chain outlets
(less likely to buy from an independent vendor) without inventing facts:
a match only produces a flag, never a certainty.
"""

__all__ = ["KNOWN_CHAINS"]

KNOWN_CHAINS: tuple[str, ...] = ()
