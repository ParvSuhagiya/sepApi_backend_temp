"""Known chain brands (Indian and global).

A whole-word, case-insensitive match against this list means a business
looks like a chain outlet — less likely to buy from an independent vendor.
A match only produces a flag (score 0 via ``mid_level_signal``), never a
certainty: chains are matched by name text alone.

Single generic words (e.g. "pizza", "cafe", "pharmacy") are deliberately
absent so independent businesses are not misflagged.
"""

__all__ = ["KNOWN_CHAINS"]

KNOWN_CHAINS: tuple[str, ...] = (
    # Global food & beverage.
    "mcdonalds",
    "burger king",
    "kfc",
    "pizza hut",
    "dominos",
    "subway",
    "starbucks",
    "dunkin donuts",
    "taco bell",
    # Indian food & beverage.
    "cafe coffee day",
    "barbeque nation",
    "haldirams",
    "bikanervala",
    "saravana bhavan",
    "wow momo",
    "faasos",
    "behrouz biryani",
    "oven story",
    "la pinoz",
    "chaayos",
    "chai point",
    "baskin robbins",
    "sagar ratna",
    # Health & pharmacy.
    "apollo pharmacy",
    "apollo hospitals",
    "medplus",
    "fortis",
    "max healthcare",
    "dr lal pathlabs",
    "lenskart",
    # Fitness.
    "cultfit",
    "golds gym",
    "anytime fitness",
    "talwalkars",
    # Salon.
    "lakme salon",
    "jawed habib",
    "green trends",
    "vlcc",
    # Hotels & retail.
    "oyo",
    "taj hotels",
    "marriott",
    "lemon tree",
    "treebo",
    "dmart",
    "decathlon",
    "reliance",
    "tata",
)
