# ============================================================
# processing/cleaner.py — Text Cleaning & Normalization
# ============================================================
# Cleans extracted text before chunking and embedding.
# ============================================================

import re
import unicodedata
import logging

logger = logging.getLogger(__name__)


def clean_text(text: str) -> str:
    """
    Clean and normalize extracted text for embedding.

    Steps:
    1. Unicode normalization (NFC)
    2. Remove null bytes and control characters
    3. Normalize whitespace
    4. Remove excessive newlines
    5. Strip junk patterns (page numbers, watermarks, etc.)
    """
    if not text or not text.strip():
        return ""

    # 1. Unicode normalize
    text = unicodedata.normalize("NFC", text)

    # 2. Remove null bytes and control characters (keep newlines, tabs)
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]", "", text)

    # 3. Remove excessive spaces (but preserve newlines)
    text = re.sub(r"[^\S\n]+", " ", text)

    # 4. Collapse 3+ newlines into 2
    text = re.sub(r"\n{3,}", "\n\n", text)

    # 5. Remove common junk patterns
    # Page numbers like "Page 1 of 10", "- 5 -", "1/10"
    text = re.sub(r"\bPage\s+\d+\s+of\s+\d+\b", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\n\s*-\s*\d+\s*-\s*\n", "\n", text)

    # Remove repeated characters (e.g., "========", "--------", "........")
    text = re.sub(r"([=\-\.~_*#])\1{5,}", "", text)

    # Remove common watermark patterns
    text = re.sub(r"\b(DRAFT|CONFIDENTIAL|DO NOT DISTRIBUTE)\b", "", text, flags=re.IGNORECASE)

    # 6. Strip leading/trailing whitespace from each line
    lines = [line.strip() for line in text.split("\n")]
    text = "\n".join(lines)

    # 7. Final strip
    text = text.strip()

    return text
