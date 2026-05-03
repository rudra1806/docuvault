# ============================================================
# retrieval/hybrid_searcher.py — Hybrid Search Orchestrator
# ============================================================
# Combines vector semantic search (Qdrant) with BM25 keyword
# search using Reciprocal Rank Fusion (RRF) to merge results.
# ============================================================

import logging
from typing import List, Dict
from processing.embedder import embed_single
from storage.vector_store import search_similar
from retrieval.bm25_index import bm25_search
from config.settings import get_settings

logger = logging.getLogger(__name__)


def reciprocal_rank_fusion(
    result_lists: List[List[Dict]],
    k: int = 60,
) -> List[Dict]:
    """
    Merge multiple ranked result lists using Reciprocal Rank Fusion.

    RRF score = Σ 1/(k + rank) for each source list.
    This is a proven method used by Elasticsearch and others.

    Args:
        result_lists: List of ranked result lists
        k: RRF constant (default 60, standard in literature)

    Returns:
        Merged and re-scored list of unique results
    """
    fused_scores: Dict[str, Dict] = {}

    for result_list in result_lists:
        for rank, item in enumerate(result_list):
            # Create a unique key for each chunk
            key = f"{item.get('file_id', '')}_{item.get('chunk_index', 0)}"

            if key not in fused_scores:
                fused_scores[key] = {
                    "chunk": item,
                    "rrf_score": 0.0,
                    "sources": [],
                }

            fused_scores[key]["rrf_score"] += 1.0 / (k + rank + 1)
            fused_scores[key]["sources"].append(item.get("score", 0))

    # Sort by fused score
    merged = sorted(
        fused_scores.values(),
        key=lambda x: x["rrf_score"],
        reverse=True,
    )

    # Return chunks with the RRF score
    results = []
    for entry in merged:
        chunk = entry["chunk"]
        chunk["score"] = entry["rrf_score"]
        chunk["retrieval_sources"] = entry["sources"]
        results.append(chunk)

    return results


async def hybrid_search(
    query: str,
    user_id: str,
    top_k: int = 20,
) -> List[Dict]:
    """
    Perform hybrid search combining vector + BM25 retrieval.

    Flow:
    1. Vector search (semantic similarity via Qdrant)
    2. BM25 search (keyword matching from cached index)
    3. Merge with Reciprocal Rank Fusion

    Args:
        query: User's search query
        user_id: Filter to this user's data
        top_k: Number of results after fusion

    Returns:
        Merged list of chunks, sorted by hybrid relevance score
    """
    settings = get_settings()

    # ── 1. Vector search ─────────────────────────────────────
    logger.info(f"Hybrid search: embedding query for vector search")
    query_embedding = await embed_single(query)

    vector_results = search_similar(
        query_embedding=query_embedding,
        user_id=user_id,
        top_k=settings.INITIAL_RETRIEVAL_K,
        score_threshold=settings.SCORE_THRESHOLD,
    )
    logger.info(f"Vector search returned {len(vector_results)} chunks")

    # ── 2. BM25 keyword search ───────────────────────────────
    bm25_results = []
    try:
        bm25_results = bm25_search(
            query=query,
            user_id=user_id,
            top_k=settings.INITIAL_RETRIEVAL_K,
        )
        logger.info(f"BM25 search returned {len(bm25_results)} chunks")
    except Exception as e:
        logger.warning(f"BM25 search failed, using vector-only: {e}")

    # ── 3. Merge with RRF ────────────────────────────────────
    if bm25_results:
        merged = reciprocal_rank_fusion(
            [vector_results, bm25_results],
            k=60,
        )
    else:
        # Fallback to vector-only if BM25 failed
        merged = vector_results

    # Trim to top_k
    merged = merged[:top_k]

    logger.info(
        f"Hybrid search: {len(vector_results)} vector + "
        f"{len(bm25_results)} BM25 → {len(merged)} merged results"
    )

    return merged
