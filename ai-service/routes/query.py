# ============================================================
# routes/query.py — Question Answering Endpoint
# ============================================================
# Receives user questions and returns AI-generated answers
# with source citations.
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


class QueryResponse(BaseModel):
    success: bool
    answer: str
    sources: List[dict]
    chunks_found: int
    error: Optional[str] = None


@router.post("/query", response_model=QueryResponse)
async def query_documents(request: QueryRequest):
    """
    Answer a user's question based on their uploaded documents.
    Uses RAG: embed query → search Qdrant → LLM answer.
    """
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    if not request.user_id.strip():
        raise HTTPException(status_code=400, detail="User ID is required")

    logger.info(f"Query from user {request.user_id}: '{request.question[:80]}...'")

    try:
        result = await answer_question(
            question=request.question.strip(),
            user_id=request.user_id.strip(),
        )

        return QueryResponse(
            success=True,
            answer=result["answer"],
            sources=result.get("sources", []),
            chunks_found=result.get("chunks_found", 0),
            error=result.get("error"),
        )

    except Exception as e:
        logger.error(f"Query error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate answer: {str(e)}",
        )
