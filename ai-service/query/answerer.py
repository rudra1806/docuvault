# ============================================================
# query/answerer.py — RAG Answer Generation
# ============================================================
# Embeds the user's question, searches Qdrant for relevant
# chunks, and generates an answer using Groq's Mixtral LLM.
# ============================================================

import logging
from groq import Groq
from processing.embedder import embed_single
from storage.vector_store import search_similar
from config.settings import get_settings

logger = logging.getLogger(__name__)

# System prompt for the LLM
SYSTEM_PROMPT = """You are DocuVault AI — an intelligent document assistant. Your job is to answer questions based ONLY on the provided document context.

Rules:
1. Answer ONLY based on the given context. Do not use outside knowledge.
2. If the answer is not in the context, say "I couldn't find this information in your uploaded documents."
3. Always cite the source file name(s) in your answer.
4. Be concise but thorough.
5. If the context contains data from spreadsheets or tables, format your answer clearly.
6. Use markdown formatting for better readability (bold, lists, etc.).
"""


async def answer_question(question: str, user_id: str) -> dict:
    """
    Full RAG pipeline: embed question → search → generate answer.

    Args:
        question: User's natural language question
        user_id: MongoDB user ID (for data isolation)

    Returns:
        {
            "answer": str,
            "sources": [{ "file": str, "snippet": str, "score": float }],
            "chunks_found": int
        }
    """
    settings = get_settings()

    # ── Step 1: Embed the question ──────────────────────────
    logger.info(f"Embedding question: '{question[:80]}...'")
    query_embedding = await embed_single(question)

    # ── Step 2: Search Qdrant for relevant chunks ───────────
    chunks = search_similar(
        query_embedding=query_embedding,
        user_id=user_id,
        top_k=5,
        score_threshold=0.3,
    )

    if not chunks:
        return {
            "answer": "I couldn't find any relevant information in your uploaded documents. Try uploading more documents or rephrasing your question.",
            "sources": [],
            "chunks_found": 0,
        }

    # ── Step 3: Build context from top chunks ───────────────
    context_parts = []
    sources = []
    seen_files = set()

    for chunk in chunks:
        context_parts.append(
            f"[Source: {chunk['file_name']}, Chunk {chunk['chunk_index'] + 1}]\n"
            f"{chunk['text']}"
        )

        # Build unique source references
        source_key = f"{chunk['file_name']}_{chunk['chunk_index']}"
        if source_key not in seen_files:
            sources.append({
                "file": chunk["file_name"],
                "file_id": chunk["file_id"],
                "file_type": chunk["file_type"],
                "snippet": chunk["text"][:200] + ("..." if len(chunk["text"]) > 200 else ""),
                "score": round(chunk["score"], 3),
                "chunk_index": chunk["chunk_index"],
            })
            seen_files.add(source_key)

    context = "\n\n---\n\n".join(context_parts)

    # ── Step 4: Generate answer with Groq LLM ──────────────
    logger.info(f"Generating answer with {settings.LLM_MODEL} ({len(chunks)} chunks)")

    try:
        client = Groq(api_key=settings.GROQ_API_KEY)

        response = client.chat.completions.create(
            model=settings.LLM_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": f"Context:\n{context}\n\n---\n\nQuestion: {question}",
                },
            ],
            max_tokens=1024,
            temperature=0.2,
            top_p=0.9,
        )

        answer = response.choices[0].message.content.strip()

        logger.info(f"Answer generated ({len(answer)} chars, {len(sources)} sources)")

        return {
            "answer": answer,
            "sources": sources,
            "chunks_found": len(chunks),
        }

    except Exception as e:
        logger.error(f"LLM generation error: {e}", exc_info=True)
        return {
            "answer": "I encountered an error while generating the answer. Please try again.",
            "sources": sources,
            "chunks_found": len(chunks),
            "error": str(e),
        }
