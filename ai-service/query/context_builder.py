# ============================================================
# query/context_builder.py — Intelligent Context Assembly
# ============================================================
# Replaces naive chunk concatenation with deduplication,
# document grouping, ordering, and token budget management.
# ============================================================

import re
import logging
from typing import List, Dict
from collections import defaultdict

logger = logging.getLogger(__name__)

# Approximate characters per token for budget calculations
CHARS_PER_TOKEN = 4


def build_context(
    chunks: List[Dict],
    max_context_tokens: int = 6000,
) -> tuple:
    """
    Build an optimized context string from retrieved chunks.

    Steps:
    1. Deduplicate overlapping chunks (>80% text overlap)
    2. Group chunks by source document
    3. Order chunks within each document by chunk_index
    4. Apply token budget (trim if context exceeds limit)
    5. Format with clear document headers

    Args:
        chunks: List of chunk dicts (after reranking)
        max_context_tokens: Maximum tokens for the context block

    Returns:
        Tuple of (formatted_context_string, unique_sources_list)
    """
    if not chunks:
        return "", []

    # ── Step 1: Deduplicate ──────────────────────────────────
    deduped = _deduplicate_chunks(chunks)
    logger.info(f"Context builder: {len(chunks)} → {len(deduped)} after dedup")

    # ── Step 2: Group by document ────────────────────────────
    doc_groups = _group_by_document(deduped)

    # ── Step 3: Order within groups ──────────────────────────
    for file_id in doc_groups:
        doc_groups[file_id].sort(key=lambda c: c.get("chunk_index", 0))

    # ── Step 4: Format with headers ──────────────────────────
    max_chars = max_context_tokens * CHARS_PER_TOKEN
    context_parts = []
    sources = []
    total_chars = 0
    seen_files = set()

    for file_id, group_chunks in doc_groups.items():
        file_name = group_chunks[0].get("file_name", "Unknown")
        file_type = group_chunks[0].get("file_type", "").upper()

        # Document header
        header = f"═══ Document: {file_name} ({file_type}) ═══"
        context_parts.append(header)
        total_chars += len(header)

        for chunk in group_chunks:
            chunk_text = chunk["text"].strip()
            chunk_label = f"[Section {chunk.get('chunk_index', 0) + 1}]"
            formatted = f"{chunk_label}\n{chunk_text}"

            # Check budget
            if total_chars + len(formatted) > max_chars:
                context_parts.append("[... context trimmed for length ...]")
                break

            context_parts.append(formatted)
            total_chars += len(formatted)

            # Build source reference
            source_key = f"{chunk.get('file_id', '')}_{chunk.get('chunk_index', 0)}"
            if source_key not in seen_files:
                # Extract human-readable location from chunk text
                location = _extract_location(
                    chunk_text,
                    chunk.get("file_type", ""),
                    chunk.get("chunk_index", 0),
                )

                sources.append({
                    "file": chunk.get("file_name", ""),
                    "file_id": chunk.get("file_id", ""),
                    "file_type": chunk.get("file_type", ""),
                    "snippet": chunk_text[:200] + ("..." if len(chunk_text) > 200 else ""),
                    "score": round(chunk.get("score", 0), 4),
                    "chunk_index": chunk.get("chunk_index", 0),
                    "location": location,
                })
                seen_files.add(source_key)

        context_parts.append("")  # Blank line between documents

    context = "\n\n".join(context_parts)

    logger.info(
        f"Context built: {len(deduped)} chunks, {len(doc_groups)} documents, "
        f"~{total_chars // CHARS_PER_TOKEN} tokens"
    )

    return context, sources


def _deduplicate_chunks(chunks: List[Dict], threshold: float = 0.80) -> List[Dict]:
    """
    Remove chunks with >threshold text overlap.
    Uses a simple character overlap ratio check.
    """
    if len(chunks) <= 1:
        return chunks

    deduped = [chunks[0]]

    for chunk in chunks[1:]:
        is_duplicate = False
        chunk_text = chunk["text"].strip().lower()

        for existing in deduped:
            existing_text = existing["text"].strip().lower()

            # Quick length check — if lengths are very different, not a duplicate
            len_ratio = min(len(chunk_text), len(existing_text)) / max(len(chunk_text), len(existing_text), 1)
            if len_ratio < 0.5:
                continue

            # Check substring overlap
            shorter = chunk_text if len(chunk_text) <= len(existing_text) else existing_text
            longer = existing_text if len(chunk_text) <= len(existing_text) else chunk_text

            if shorter in longer:
                is_duplicate = True
                break

            # Approximate overlap using common prefix/suffix
            overlap = _text_overlap_ratio(chunk_text, existing_text)
            if overlap > threshold:
                is_duplicate = True
                break

        if not is_duplicate:
            deduped.append(chunk)

    return deduped


def _text_overlap_ratio(text_a: str, text_b: str) -> float:
    """
    Calculate approximate text overlap ratio using word sets.
    Fast O(n) approximation instead of full edit distance.
    """
    words_a = set(text_a.split())
    words_b = set(text_b.split())

    if not words_a or not words_b:
        return 0.0

    intersection = words_a & words_b
    smaller_set = min(len(words_a), len(words_b))

    return len(intersection) / smaller_set if smaller_set > 0 else 0.0


def _group_by_document(chunks: List[Dict]) -> Dict[str, List[Dict]]:
    """Group chunks by their source document (file_id)."""
    groups = defaultdict(list)
    for chunk in chunks:
        key = chunk.get("file_id", "unknown")
        groups[key].append(chunk)
    return dict(groups)


def _extract_location(chunk_text: str, file_type: str, chunk_index: int) -> str:
    """
    Extract a human-readable location reference from chunk text.

    Parses markers like [Page 3], [Slide 2], [Sheet: Sales], Row 15
    that were embedded during content extraction.

    Returns:
        Human-readable string like "Page 3-4", "Slide 2", "Sheet: Sales",
        or "Section 3" as fallback.
    """
    file_type = file_type.lower()

    # PDF → extract page numbers
    if file_type == "pdf":
        pages = re.findall(r"\[Page\s+(\d+)\]", chunk_text)
        if pages:
            page_nums = sorted(set(int(p) for p in pages))
            if len(page_nums) == 1:
                return f"Page {page_nums[0]}"
            elif len(page_nums) == 2:
                return f"Pages {page_nums[0]}-{page_nums[1]}"
            else:
                return f"Pages {page_nums[0]}-{page_nums[-1]}"

    # PPTX/PPT → extract slide numbers
    if file_type in ("pptx", "ppt"):
        slides = re.findall(r"\[Slide\s+(\d+)\]", chunk_text)
        if slides:
            slide_nums = sorted(set(int(s) for s in slides))
            if len(slide_nums) == 1:
                return f"Slide {slide_nums[0]}"
            else:
                return f"Slides {slide_nums[0]}-{slide_nums[-1]}"

    # XLSX/XLS/CSV → extract sheet name and row references
    if file_type in ("xlsx", "xls", "csv"):
        sheets = re.findall(r"\[Sheet:\s*(.+?)\]", chunk_text)
        rows = re.findall(r"Row\s+(\d+)", chunk_text)
        parts = []
        if sheets:
            parts.append(f"Sheet: {sheets[0]}")
        if rows:
            row_nums = sorted(set(int(r) for r in rows))
            if len(row_nums) >= 2:
                parts.append(f"Rows {row_nums[0]}-{row_nums[-1]}")
            elif len(row_nums) == 1:
                parts.append(f"Row {row_nums[0]}")
        if parts:
            return ", ".join(parts)

    # Images
    if file_type in ("jpg", "jpeg", "png", "gif", "webp"):
        return "Image content"

    # JSON/XML
    if file_type in ("json", "xml"):
        return "Data content"

    # Fallback: use section number based on chunk index
    return f"Section {chunk_index + 1}"
