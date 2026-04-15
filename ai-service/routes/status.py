# ============================================================
# routes/status.py — Processing Status & Management
# ============================================================
# Provides endpoints for checking processing status,
# deleting vectors, and getting user stats.
# ============================================================

import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from routes.process import processing_status
from storage.vector_store import delete_file_vectors, get_user_stats

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/status/{file_id}")
async def get_processing_status(file_id: str):
    """Get the processing status of a file."""
    status = processing_status.get(file_id)

    if not status:
        return {
            "success": True,
            "status": "unknown",
            "message": "No processing record found for this file",
        }

    return {
        "success": True,
        **status,
    }


class DeleteRequest(BaseModel):
    file_id: str


@router.post("/delete-vectors")
async def delete_vectors(request: DeleteRequest):
    """Delete all vectors for a specific file from Qdrant."""
    try:
        deleted = delete_file_vectors(request.file_id)

        # Clean up processing status
        if request.file_id in processing_status:
            del processing_status[request.file_id]

        return {
            "success": True,
            "message": f"Deleted {deleted} vectors",
            "deleted_count": deleted,
        }
    except Exception as e:
        logger.error(f"Vector deletion error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete vectors: {str(e)}",
        )


@router.get("/stats/{user_id}")
async def get_stats(user_id: str):
    """Get AI processing stats for a user."""
    try:
        stats = get_user_stats(user_id)
        return {
            "success": True,
            **stats,
        }
    except Exception as e:
        logger.error(f"Stats error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get stats: {str(e)}",
        )
