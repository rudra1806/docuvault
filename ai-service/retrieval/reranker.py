# ============================================================
# retrieval/reranker.py — LLM-Based Chunk Re-Ranking
# ============================================================
# Uses the Groq LLM to score chunk relevance to a question,
# replacing expensive cross-encoder models with fast LLM
# inference. Processes all chunks in a single batched call.
# ============================================================

import json
import logging
from typing import List, Dict
from config.groq_client import get_groq_client
from config.settings import get_settings

logger = logging.getLogger(__name__)


async def rerank_chunks(
    question: str,
    chunks: List[Dict],
    top_k: int = 8,
) -> List[Dict]:
    """
    Re-rank retrieved chunks by relevance using LLM scoring.

    Instead of one LLM call per chunk (expensive), we batch all
    chunks into a single prompt and ask for relevance scores.

    Args:
        question: The user's question
        chunks: List of chunk dicts from hybrid retrieval
        top_k: Number of top chunks to return after re-ranking

    Returns:
        Top-k chunks sorted by LLM-assessed relevance
    """
    settings = get_settings()

    if not chunks:
        return []

    # If we have fewer chunks than top_k, no need to rerank
    if len(chunks) <= top_k:
        return chunks

    try:
        client = get_groq_client()

        # Build chunk summaries for the prompt (truncate long chunks)
        chunk_summaries = []
        for i, chunk in enumerate(chunks):
            text_preview = chunk["text"][:300]
            chunk_summaries.append(
                f"[Chunk {i}] (from {chunk.get('file_name', 'unknown')})\n{text_preview}"
            )

        chunks_text = "\n\n".join(chunk_summaries)

        # Single LLM call to score all chunks
        response = client.chat.completions.create(
            model=settings.LLM_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a relevance scoring engine. Given a question and a list of "
                        "text chunks, score each chunk's relevance to answering the question. "
                        "Return a JSON object with a 'scores' array containing objects with "
                        "'index' (chunk number) and 'score' (0-10, where 10 = perfectly relevant). "
                        "Be strict: only give high scores to chunks that directly help answer "
                        "the question. Return ONLY valid JSON, no other text."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Question: {question}\n\n"
                        f"Chunks to score:\n{chunks_text}\n\n"
                        f"Score each chunk 0-10 for relevance to the question. "
                        f"Return JSON: {{\"scores\": [{{\"index\": 0, \"score\": 7}}, ...]}}"
                    ),
                },
            ],
            max_tokens=512,
            temperature=0.0,
            response_format={"type": "json_object"},
        )

        raw = response.choices[0].message.content.strip()
        result = json.loads(raw)
        scores = result.get("scores", [])

        # Map scores back to chunks
        score_map = {}
        for entry in scores:
            idx = entry.get("index", -1)
            score = entry.get("score", 0)
            if 0 <= idx < len(chunks):
                score_map[idx] = float(score)

        # Assign scores (default to 0 for any missing chunks)
        scored_chunks = []
        for i, chunk in enumerate(chunks):
            rerank_score = score_map.get(i, 0.0)
            scored_chunks.append({
                **chunk,
                "rerank_score": rerank_score,
            })

        # Sort by rerank score descending
        scored_chunks.sort(key=lambda x: x["rerank_score"], reverse=True)

        top_chunks = scored_chunks[:top_k]

        logger.info(
            f"Reranked {len(chunks)} → {len(top_chunks)} chunks "
            f"(top score: {top_chunks[0]['rerank_score'] if top_chunks else 0})"
        )

        return top_chunks

    except Exception as e:
        logger.warning(f"Reranking failed, using original order: {e}")
        # Graceful fallback: return first top_k chunks in original order
        return chunks[:top_k]
