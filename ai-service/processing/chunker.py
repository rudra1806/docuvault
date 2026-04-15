# ============================================================
# processing/chunker.py — Token-Based Text Chunking
# ============================================================
# Splits cleaned text into overlapping chunks optimized for
# embedding and retrieval.
# ============================================================

import re
import logging
from typing import Optional, List, Dict
from config.settings import get_settings

logger = logging.getLogger(__name__)

# Approximate characters per token (English avg ~4 chars/token)
CHARS_PER_TOKEN = 4


def chunk_text(
    text: str,
    file_name: str = "",
    chunk_size: Optional[int] = None,
    chunk_overlap: Optional[int] = None,
) -> List[Dict]:
    """
    Split text into overlapping chunks optimized for embedding.

    Args:
        text: Cleaned text to chunk
        file_name: Source file name for metadata
        chunk_size: Tokens per chunk (default from settings: 400)
        chunk_overlap: Token overlap between chunks (default: 100)

    Returns:
        List of chunk dicts:
        [
            {
                "text": "chunk content...",
                "index": 0,
                "start_char": 0,
                "end_char": 1600,
                "file_name": "report.pdf"
            },
            ...
        ]
    """
    if not text or not text.strip():
        return []

    settings = get_settings()
    size_tokens = chunk_size or settings.CHUNK_SIZE
    overlap_tokens = chunk_overlap or settings.CHUNK_OVERLAP

    # Convert token counts to character counts
    size_chars = size_tokens * CHARS_PER_TOKEN
    overlap_chars = overlap_tokens * CHARS_PER_TOKEN

    # Split into sentences for smarter chunking
    sentences = _split_into_sentences(text)

    chunks = []
    current_chunk = []
    current_length = 0
    chunk_index = 0
    start_char = 0

    for sentence in sentences:
        sentence_len = len(sentence)

        # If a single sentence is longer than chunk size, split it forcefully
        if sentence_len > size_chars:
            # Flush current chunk first
            if current_chunk:
                chunk_text_str = " ".join(current_chunk)
                chunks.append({
                    "text": chunk_text_str,
                    "index": chunk_index,
                    "start_char": start_char,
                    "end_char": start_char + len(chunk_text_str),
                    "file_name": file_name,
                })
                chunk_index += 1

                # Calculate overlap for next chunk
                overlap_text = _get_overlap(chunk_text_str, overlap_chars)
                current_chunk = [overlap_text] if overlap_text else []
                current_length = len(overlap_text) if overlap_text else 0
                start_char = start_char + len(chunk_text_str) - len(overlap_text)

            # Force-split the long sentence
            for i in range(0, sentence_len, size_chars - overlap_chars):
                sub = sentence[i : i + size_chars]
                chunks.append({
                    "text": sub,
                    "index": chunk_index,
                    "start_char": start_char,
                    "end_char": start_char + len(sub),
                    "file_name": file_name,
                })
                chunk_index += 1
                start_char += len(sub) - overlap_chars

            current_chunk = []
            current_length = 0
            continue

        # Normal case: add sentence to current chunk
        if current_length + sentence_len > size_chars and current_chunk:
            # Flush current chunk
            chunk_text_str = " ".join(current_chunk)
            chunks.append({
                "text": chunk_text_str,
                "index": chunk_index,
                "start_char": start_char,
                "end_char": start_char + len(chunk_text_str),
                "file_name": file_name,
            })
            chunk_index += 1

            # Keep overlap from end of current chunk
            overlap_text = _get_overlap(chunk_text_str, overlap_chars)
            current_chunk = [overlap_text] if overlap_text else []
            current_length = len(overlap_text) if overlap_text else 0
            start_char = start_char + len(chunk_text_str) - len(overlap_text)

        current_chunk.append(sentence)
        current_length += sentence_len

    # Don't forget the last chunk
    if current_chunk:
        chunk_text_str = " ".join(current_chunk)
        if chunk_text_str.strip():
            chunks.append({
                "text": chunk_text_str,
                "index": chunk_index,
                "start_char": start_char,
                "end_char": start_char + len(chunk_text_str),
                "file_name": file_name,
            })

    logger.info(f"Chunked '{file_name}' into {len(chunks)} chunks ({size_tokens} tokens, {overlap_tokens} overlap)")
    return chunks


def _split_into_sentences(text: str) -> List[str]:
    """Split text into sentences, keeping paragraph structure."""
    # Split on sentence-ending punctuation followed by space or newline
    sentences = re.split(r"(?<=[.!?])\s+|\n\n+", text)

    # Filter empty sentences and strip
    return [s.strip() for s in sentences if s.strip()]


def _get_overlap(text: str, overlap_chars: int) -> str:
    """Get the last `overlap_chars` characters of text, at a word boundary."""
    if len(text) <= overlap_chars:
        return text

    overlap = text[-overlap_chars:]

    # Try to start at a word boundary
    space_idx = overlap.find(" ")
    if space_idx > 0 and space_idx < len(overlap) // 2:
        overlap = overlap[space_idx + 1 :]

    return overlap
