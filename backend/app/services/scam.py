"""Scam Shield: regex signal flags for earning opportunities.

Flags are a SIGNAL, never a verdict. All rules live in one ``RED_FLAGS``
dict mapping a stable human-readable label to a compiled,
case-insensitive pattern. Matching text is lower-cased before searching.
Every pattern uses bounded quantifiers only.
"""

import re
from typing import Literal

__all__ = ["RED_FLAGS", "scam_flags", "risk_level", "scan_job"]

Risk = Literal["Low", "Medium", "High"]

RED_FLAGS: dict[str, re.Pattern[str]] = {
    "Asks for upfront fee": re.compile(
        r"registration fee|security deposit|training fee|pay .{0,20}to (start|join)"
        r"|refundable deposit|registration charges?|joining fee|training charges?"
        r"|deposit .{0,20}to (start|join|begin)",
        re.IGNORECASE,
    ),
    "Unrealistic income promise": re.compile(
        r"earn(?:ing|s)?\s+(?:up\s*to\s+|upto\s+)?.{0,30}?"
        r"(?:\d{1,3}(?:,\d{3}){1,4}|\d{4,6}|\d{1,3}\s?k\b|\d{1,2}(?:\.\d{1,2})?\s?lakhs?)"
        r".{0,15}?\s*(?:per|/|a|every)\s*(?:day|week)\b",
        re.IGNORECASE,
    ),
    "Personal email or chat-app contact": re.compile(
        r"@(?:gmail\.com|yahoo\.com|outlook\.com|hotmail\.com|rediffmail\.com)"
        r"|telegram|whatsapp us",
        re.IGNORECASE,
    ),
    "No interview or guaranteed income": re.compile(
        r"no interview|guaranteed (job|income)",
        re.IGNORECASE,
    ),
    "Asks to buy a kit or product first": re.compile(
        r"buy .{0,20}(kit|starter pack|product) to (start|begin)"
        r"|refer and earn|joining kit",
        re.IGNORECASE,
    ),
    "Chat-app only application": re.compile(
        r"apply (only )?(on|via|through) (whatsapp|telegram)"
        r"|contact (only )?on (whatsapp|telegram)",
        re.IGNORECASE,
    ),
    "Asks for ID or bank details up front": re.compile(
        r"(?:aadhaar|aadhar|pan card|bank (account )?details|otp)"
        r".{0,40}(?:send|share|submit|give)"
        r"|(?:send|share|submit|give)"
        r".{0,40}(?:aadhaar|aadhar|pan card|bank (account )?details|otp)",
        re.IGNORECASE,
    ),
    "Chat-app contact": re.compile(
        r"whatsapp (your )?(cv|resume)"
        r"|(send|share) (your )?(cv|resume) (on|to) (whatsapp|telegram)",
        re.IGNORECASE,
    ),
    "Asks for money in Hinglish": re.compile(
        r"paisa bhej|pehle paisa|registration charge lag"
        r"|ghar baithe .{0,20}(lakh|\d{4,6})",
        re.IGNORECASE,
    ),
}


def scam_flags(text: str | None) -> list[str]:
    """Return matching RED_FLAGS labels in stable dict order, without duplicates."""
    if not isinstance(text, str) or not text:
        return []
    lowered = text.lower()
    return [label for label, pattern in RED_FLAGS.items() if pattern.search(lowered)]


def risk_level(flags: list[str]) -> Risk:
    """Map a flag list to Low (0), Medium (1) or High (2+) risk."""
    count = len(flags) if isinstance(flags, list) else 0
    if count >= 2:
        return "High"
    if count == 1:
        return "Medium"
    return "Low"


def scan_job(
    title: str | None, description: str | None
) -> tuple[list[str], Risk]:
    """Scan title plus the FULL description; return (flags, risk)."""
    title_part = title if isinstance(title, str) else ""
    desc_part = description if isinstance(description, str) else ""
    flags = scam_flags(f"{title_part} {desc_part}")
    return flags, risk_level(flags)
