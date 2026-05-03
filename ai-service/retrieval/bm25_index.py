# ============================================================
# retrieval/bm25_index.py — BM25 Keyword Search Index
# ============================================================
# Builds an in-memory BM25 index from Qdrant chunks for a
# given user. Cached with TTL to avoid rebuilding on every query.
# ============================================================

import time
import logging
import re
from typing import List, Dict, Optional
from rank_bm25 import BM25Okapi
from config.settings import get_settings

logger = logging.getLogger(__name__)

# Cache: { user_id: { "index": BM25Okapi, "chunks": [...], "built_at": float } }
_bm25_cache: Dict[str, Dict] = {}


def _tokenize(text: str) -> List[str]:
    """Simple whitespace + punctuation tokenizer for BM25."""
    # Lowercase, split on non-alphanumeric (keep numbers for exact matching)
    tokens = re.findall(r"[a-z0-9]+", text.lower())
    return tokens


def _build_index(user_id: str) -> Optional[Dict]:
    """
    Build a BM25 index by scrolling all chunks for a user from Qdrant.

    Returns:
        Dict with "index" (BM25Okapi), "chunks" (list of chunk dicts),
        and "built_at" (timestamp).
    """
    from storage.vector_store import scroll_user_chunks

    logger.info(f"Building BM25 index for user {user_id}...")
    start = time.time()

    chunks = scroll_user_chunks(user_id, max_chunks=5000)

    if not chunks:
        logger.warning(f"No chunks found for user {user_id}, skipping BM25 index")
        return None

    # Tokenize all chunk texts
    tokenized_corpus = [_tokenize(c["text"]) for c in chunks]

    # Build BM25 index
    index = BM25Okapi(tokenized_corpus)

    elapsed = time.time() - start
    logger.info(
        f"BM25 index built for user {user_id}: "
        f"{len(chunks)} chunks in {elapsed:.2f}s"
    )

    return {
        "index": index,
        "chunks": chunks,
        "built_at": time.time(),
    }


def _get_or_build_index(user_id: str) -> Optional[Dict]:
    """Get cached BM25 index or build a new one."""
    settings = get_settings()
    now = time.time()

    cached = _bm25_cache.get(user_id)
    if cached and (now - cached["built_at"]) < settings.BM25_CACHE_TTL:
        return cached

    # Build fresh index
    entry = _build_index(user_id)
    if entry:
        _bm25_cache[user_id] = entry
    return entry


def bm25_search(
    query: str,
    user_id: str,
    top_k: int = 20,
) -> List[Dict]:
    """
    Search for chunks matching the query using BM25 keyword matching.

    Args:
        query: User's search query
        user_id: Filter to this user's chunks only
        top_k: Number of results to return

    Returns:
        List of chunk dicts with BM25 scores, sorted by relevance.
        Each dict has: text, file_name, file_id, file_type, chunk_index,
        source, score (BM25 score).
    """
    entry = _get_or_build_index(user_id)
    if not entry:
        return []

    index: BM25Okapi = entry["index"]
    chunks: List[Dict] = entry["chunks"]

    # Tokenize the query
    query_tokens = _tokenize(query)
    if not query_tokens:
        return []

    # Get BM25 scores for all documents
    scores = index.get_scores(query_tokens)

    # Pair chunks with scores and sort
    scored_chunks = [
        {**chunk, "score": float(score)}
        for chunk, score in zip(chunks, scores)
        if score > 0  # Only include non-zero scores
    ]

    # Sort by score descending
    scored_chunks.sort(key=lambda x: x["score"], reverse=True)

    return scored_chunks[:top_k]


def invalidate_user_cache(user_id: str) -> None:
    """Invalidate BM25 cache for a user (call after document upload/delete)."""
    if user_id in _bm25_cache:
        del _bm25_cache[user_id]
        logger.info(f"BM25 cache invalidated for user {user_id}")
