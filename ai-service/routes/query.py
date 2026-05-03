# ============================================================
# routes/query.py — Question Answering Endpoint
# ============================================================
# Receives user questions and returns AI-generated answers
# with source citations. Supports multi-turn conversations.
# ============================================================

import logging
from typing import Optional, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from query.answerer import answer_question

logger = logging.getLogger(__name__)

router = APIRouter()


class QueryRequest(BaseModel):
    question: str
    user_id: str
    conversation_id: Optional[str] = None  # Optional: enables follow-up questions


class QueryResponse(BaseModel):
    success: bool
    answer: str
    sources: List[dict]
    chunks_found: int
    complexity: Optional[str] = None
    sub_queries_used: Optional[int] = None
    validation_score: Optional[float] = None
    error: Optional[str] = None


@router.post("/query", response_model=QueryResponse)
async def query_documents(request: QueryRequest):
    """
    Answer a user's question based on their uploaded documents.

    Enhanced RAG pipeline:
    Analyze → Hybrid Search (Vector + BM25) → Re-rank → Build Context
    → Generate Answer → Validate → Return

    Optional: Pass conversation_id for multi-turn follow-up support.
    """
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    if not request.user_id.strip():
        raise HTTPException(status_code=400, detail="User ID is required")

    logger.info(
        f"Query from user {request.user_id}: '{request.question[:80]}...' "
        f"(conversation={request.conversation_id or 'none'})"
    )

    try:
        result = await answer_question(
            question=request.question.strip(),
            user_id=request.user_id.strip(),
            conversation_id=request.conversation_id,
        )

        return QueryResponse(
            success=True,
            answer=result["answer"],
            sources=result.get("sources", []),
            chunks_found=result.get("chunks_found", 0),
            complexity=result.get("complexity"),
            sub_queries_used=result.get("sub_queries_used"),
            validation_score=result.get("validation_score"),
            error=result.get("error"),
        )

    except Exception as e:
        logger.error(f"Query error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate answer: {str(e)}",
        )
