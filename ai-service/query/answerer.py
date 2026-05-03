# ============================================================
# query/answerer.py — Enhanced RAG Answer Generation
# ============================================================
# Full upgraded pipeline:
# 1. Analyze & decompose the question
# 2. Hybrid retrieval (vector + BM25) per sub-query
# 3. Re-rank retrieved chunks with LLM scoring
# 4. Build optimized context (dedup, group, budget)
# 5. Generate answer with dynamic prompting
# 6. Validate answer quality (self-reflection)
# 7. Store conversation turn for follow-ups
# ============================================================

import logging
from config.groq_client import get_groq_client
from config.settings import get_settings
from query.query_analyzer import analyze_question, get_max_tokens, get_temperature
from query.context_builder import build_context
from query.conversation import format_history_for_prompt, add_turn
from query.validator import validate_answer, maybe_regenerate
from retrieval.hybrid_searcher import hybrid_search
from retrieval.reranker import rerank_chunks

logger = logging.getLogger(__name__)

# ── System Prompts ──────────────────────────────────────────

SYSTEM_PROMPT_BASE = """You are DocuVault AI — an expert document analyst and intelligent assistant.

CAPABILITIES:
- Analyze and synthesize information across multiple documents
- Compare data from different sources and highlight differences
- Perform calculations and data analysis on extracted numbers
- Identify trends, patterns, and discrepancies in data
- Summarize complex documents with key takeaways

RESPONSE GUIDELINES:
1. For complex questions, think step-by-step before answering
2. For comparisons, use tables or structured side-by-side formats
3. For analytical questions, show your reasoning process clearly
4. Always cite the specific document name(s) as your source
5. If information is partial, explicitly state what you found AND what's missing
6. Use rich markdown formatting: **bold**, *italic*, bullet lists, numbered lists, tables
7. For numerical data, quote exact figures from the context
8. Structure long answers with clear section headers (## or ###)

CRITICAL RULES:
- Base answers ONLY on the provided document context
- If the context doesn't contain enough information, say so clearly — never fabricate data
- If multiple documents provide conflicting information, highlight the discrepancy
- When uncertain, express the degree of confidence
"""

SYNTHESIS_PROMPT = """
SYNTHESIS TASK:
The following context comes from multiple searches related to different aspects of the question.
You MUST synthesize information across all provided document sections to give a unified, comprehensive answer.
{instruction}
"""

COMPARISON_PROMPT = """
COMPARISON TASK:
The user is asking you to compare or contrast information. Structure your answer as:
1. First, present each item/document's data separately
2. Then provide a direct comparison (preferably in a table)
3. Finally, highlight key differences and similarities
"""

ANALYTICAL_PROMPT = """
ANALYSIS TASK:
The user is asking for analysis or trend identification. Structure your answer as:
1. Present the relevant data points from the documents
2. Identify patterns, trends, or anomalies
3. Provide your analytical conclusions with supporting evidence
4. Note any limitations in the available data
"""

SUMMARY_PROMPT = """
SUMMARY TASK:
Provide a comprehensive yet concise summary. Structure as:
1. Start with a brief overview (2-3 sentences)
2. Cover key points with bullet points
3. End with notable findings or takeaways
"""


def _get_system_prompt(complexity: str, synthesis_instruction: str = None) -> str:
    """Build a dynamic system prompt based on question complexity."""
    prompt = SYSTEM_PROMPT_BASE

    if complexity == "comparative":
        prompt += COMPARISON_PROMPT
    elif complexity == "analytical":
        prompt += ANALYTICAL_PROMPT
    elif complexity == "summary":
        prompt += SUMMARY_PROMPT
    elif complexity in ("multi_part",) and synthesis_instruction:
        prompt += SYNTHESIS_PROMPT.format(instruction=synthesis_instruction)

    return prompt


async def answer_question(
    question: str,
    user_id: str,
    conversation_id: str = None,
) -> dict:
    """
    Full enhanced RAG pipeline:
    Analyze → Retrieve (hybrid) → Re-rank → Build Context → Generate → Validate

    Args:
        question: User's natural language question
        user_id: MongoDB user ID (for data isolation)
        conversation_id: Optional session ID for multi-turn conversations

    Returns:
        {
            "answer": str,
            "sources": [{ "file": str, "snippet": str, "score": float }],
            "chunks_found": int,
            "complexity": str,
            "sub_queries_used": int,
            "validation_score": float,
        }
    """
    settings = get_settings()

    # ── Step 1: Analyze the question ─────────────────────────
    logger.info(f"[Step 1/7] Analyzing question: '{question[:80]}...'")
    analysis = await analyze_question(question)

    complexity = analysis["complexity"]
    sub_queries = analysis["sub_queries"]

    logger.info(
        f"Question classified as '{complexity}' with "
        f"{len(sub_queries)} sub-queries: {sub_queries}"
    )

    # ── Step 2: Hybrid retrieval per sub-query ───────────────
    logger.info(f"[Step 2/7] Hybrid retrieval for {len(sub_queries)} sub-queries")
    all_chunks = []
    seen_chunk_keys = set()

    for i, sub_query in enumerate(sub_queries):
        logger.info(f"  Sub-query {i+1}/{len(sub_queries)}: '{sub_query}'")
        chunks = await hybrid_search(
            query=sub_query,
            user_id=user_id,
            top_k=settings.INITIAL_RETRIEVAL_K,
        )

        # Merge results, avoiding duplicates across sub-queries
        for chunk in chunks:
            key = f"{chunk.get('file_id', '')}_{chunk.get('chunk_index', 0)}"
            if key not in seen_chunk_keys:
                seen_chunk_keys.add(key)
                all_chunks.append(chunk)

    logger.info(f"Total unique chunks retrieved: {len(all_chunks)}")

    if not all_chunks:
        return {
            "answer": (
                "I couldn't find any relevant information in your uploaded documents. "
                "Try uploading more documents or rephrasing your question."
            ),
            "sources": [],
            "chunks_found": 0,
            "complexity": complexity,
            "sub_queries_used": len(sub_queries),
            "validation_score": 0,
        }

    # ── Step 3: Re-rank chunks ───────────────────────────────
    if settings.RERANK_ENABLED and len(all_chunks) > settings.FINAL_CONTEXT_K:
        logger.info(f"[Step 3/7] Re-ranking {len(all_chunks)} chunks")
        reranked_chunks = await rerank_chunks(
            question=question,
            chunks=all_chunks,
            top_k=settings.FINAL_CONTEXT_K,
        )
    else:
        logger.info(f"[Step 3/7] Skipping rerank (only {len(all_chunks)} chunks)")
        reranked_chunks = all_chunks[:settings.FINAL_CONTEXT_K]

    # ── Step 4: Build optimized context ──────────────────────
    logger.info(f"[Step 4/7] Building context from {len(reranked_chunks)} chunks")
    context, sources = build_context(
        chunks=reranked_chunks,
        max_context_tokens=6000,
    )

    # ── Step 5: Generate answer ──────────────────────────────
    logger.info(f"[Step 5/7] Generating answer with {settings.LLM_MODEL}")

    max_tokens = get_max_tokens(complexity)
    temperature = get_temperature(complexity)
    system_prompt = _get_system_prompt(
        complexity,
        analysis.get("synthesis_instruction"),
    )

    # Include conversation history if available
    history_text = format_history_for_prompt(conversation_id)

    # Build the user message
    user_message_parts = []
    if history_text:
        user_message_parts.append(history_text)
        user_message_parts.append("---")
    user_message_parts.append(f"Document Context:\n{context}")
    user_message_parts.append("---")
    user_message_parts.append(f"Question: {question}")

    if analysis.get("requires_synthesis"):
        user_message_parts.append(
            f"\nNote: This question requires synthesizing information "
            f"from multiple sections/documents. Please provide a unified answer."
        )

    user_message = "\n\n".join(user_message_parts)

    try:
        client = get_groq_client()

        response = client.chat.completions.create(
            model=settings.LLM_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            max_tokens=max_tokens,
            temperature=temperature,
            top_p=0.9,
        )

        answer = response.choices[0].message.content.strip()

        logger.info(
            f"Answer generated: {len(answer)} chars, "
            f"model={settings.LLM_MODEL}, max_tokens={max_tokens}"
        )

        # ── Step 6: Validate answer ─────────────────────────
        validation_score = 10.0  # Default if validation is disabled

        if settings.VALIDATOR_ENABLED:
            logger.info(f"[Step 6/7] Validating answer quality")
            validation = await validate_answer(question, answer, context)
            validation_score = validation["score"]

            # If validation failed, try to regenerate
            if not validation["is_valid"]:
                logger.warning(
                    f"Answer validation failed (score={validation_score}), "
                    f"issues: {validation['issues']}"
                )
                improved = await maybe_regenerate(
                    question, answer, context, validation
                )
                if improved:
                    answer = improved
                    validation_score = 7.0  # Assume improvement
        else:
            logger.info(f"[Step 6/7] Validation disabled, skipping")

        # ── Step 7: Store conversation turn ──────────────────
        logger.info(f"[Step 7/7] Storing conversation turn")
        add_turn(conversation_id, question, answer)

        return {
            "answer": answer,
            "sources": sources,
            "chunks_found": len(all_chunks),
            "complexity": complexity,
            "sub_queries_used": len(sub_queries),
            "validation_score": validation_score,
        }

    except Exception as e:
        logger.error(f"LLM generation error: {e}", exc_info=True)
        return {
            "answer": "I encountered an error while generating the answer. Please try again.",
            "sources": sources,
            "chunks_found": len(all_chunks),
            "complexity": complexity,
            "sub_queries_used": len(sub_queries),
            "validation_score": 0,
            "error": str(e),
        }
