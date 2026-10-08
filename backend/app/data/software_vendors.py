"""Known software vendor names for the existing-software signal.

A whole-word, case-insensitive match of review text (or the lead's website
string) against this list sets ``likely_has_software`` — a SIGNAL that the
business may already use vendor software, never a verified fact.

Deliberately absent: delivery/marketplace platforms (Zomato, Swiggy) and
generic words ("busy", "marg", "bill") that appear in ordinary reviews.
"""

__all__ = ["KNOWN_SOFTWARE_VENDORS"]

KNOWN_SOFTWARE_VENDORS: tuple[str, ...] = (
    "petpooja",
    "posist",
    "limetray",
    "torqus",
    "slickpos",
    "tally",
    "zoho",
    "quickbooks",
    "marg erp",
    "busy accounting",
)
