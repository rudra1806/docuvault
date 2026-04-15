# ============================================================
# routes/process.py — File Processing Endpoint
# ============================================================
# Receives files from the Node.js backend, extracts content,
# chunks, embeds, and stores in Qdrant.
# ============================================================

import logging
import httpx
from typing import Dict, Optional
from fastapi import APIRouter, UploadFile, File, Form, BackgroundTasks, HTTPException
from config.settings import get_settings
from pipelines.router import route_file
from processing.cleaner import clean_text
from processing.chunker import chunk_text
from processing.embedder import embed_texts
from storage.vector_store import upsert_chunks, delete_file_vectors

logger = logging.getLogger(__name__)

router = APIRouter()

# Track processing status in-memory (per session)
processing_status: Dict[str, Dict] = {}


@router.post("/process")
async def process_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    file_id: str = Form(...),
    user_id: str = Form(...),
    file_name: str = Form(...),
):
    """
    Process an uploaded file: extract → clean → chunk → embed → store.
    Processing happens in the background. Returns immediately.
    """
    # Read file bytes
    file_bytes = await file.read()
    file_ext = file_name.rsplit(".", 1)[-1].lower() if "." in file_name else ""

    if not file_ext:
        raise HTTPException(status_code=400, detail="Could not determine file type")

    # Set initial status
    processing_status[file_id] = {
        "status": "processing",
        "stage": "queued",
        "file_name": file_name,
        "chunk_count": 0,
        "error": None,
    }

    # Process in background
    background_tasks.add_task(
        _process_file_task,
        file_bytes=file_bytes,
        file_name=file_name,
        file_ext=file_ext,
        file_id=file_id,
        user_id=user_id,
    )

    return {
        "success": True,
        "message": "Processing started",
        "file_id": file_id,
    }


async def _process_file_task(
    file_bytes: bytes,
    file_name: str,
    file_ext: str,
    file_id: str,
    user_id: str,
):
    """Background task: full processing pipeline."""
    settings = get_settings()

    try:
        # ── Stage 1: Extract content ────────────────────────
        processing_status[file_id]["stage"] = "extracting"
        logger.info(f"[{file_id}] Extracting content from {file_name}")

        result = await route_file(file_bytes, file_name, file_ext)
        raw_text = result.get("text", "")
        source = result.get("source", "unknown")

        if not raw_text.strip():
            processing_status[file_id] = {
                "status": "completed",
                "stage": "done",
                "file_name": file_name,
                "chunk_count": 0,
                "error": None,
                "note": "No extractable text found",
            }
            # Notify Node.js backend
            await _notify_backend(settings, file_id, "completed", 0)
            return

        # ── Stage 2: Clean text ─────────────────────────────
        processing_status[file_id]["stage"] = "cleaning"
        logger.info(f"[{file_id}] Cleaning text ({len(raw_text)} chars)")

        cleaned = clean_text(raw_text)

        # ── Stage 3: Chunk text ─────────────────────────────
        processing_status[file_id]["stage"] = "chunking"

        chunks = chunk_text(cleaned, file_name=file_name)
        logger.info(f"[{file_id}] Created {len(chunks)} chunks")

        if not chunks:
            processing_status[file_id] = {
                "status": "completed",
                "stage": "done",
                "file_name": file_name,
                "chunk_count": 0,
                "error": None,
            }
            await _notify_backend(settings, file_id, "completed", 0)
            return

        # ── Stage 4: Generate embeddings ────────────────────
        processing_status[file_id]["stage"] = "embedding"
        logger.info(f"[{file_id}] Generating embeddings for {len(chunks)} chunks")

        chunk_texts = [c["text"] for c in chunks]
        embeddings = await embed_texts(chunk_texts)

        # ── Stage 5: Store in Qdrant ────────────────────────
        processing_status[file_id]["stage"] = "storing"

        # Delete any existing vectors for this file (in case of reprocessing)
        delete_file_vectors(file_id)

        count = upsert_chunks(
            chunks=chunks,
            embeddings=embeddings,
            file_id=file_id,
            file_name=file_name,
            file_type=file_ext,
            source=source,
            user_id=user_id,
        )

        # ── Done ────────────────────────────────────────────
        processing_status[file_id] = {
            "status": "completed",
            "stage": "done",
            "file_name": file_name,
            "chunk_count": count,
            "error": None,
        }

        logger.info(f"[{file_id}] Processing complete: {count} chunks stored")

        # Notify Node.js backend of completion
        await _notify_backend(settings, file_id, "completed", count)

    except Exception as e:
        logger.error(f"[{file_id}] Processing failed: {e}", exc_info=True)
        processing_status[file_id] = {
            "status": "failed",
            "stage": "error",
            "file_name": file_name,
            "chunk_count": 0,
            "error": str(e),
        }

        # Notify Node.js backend of failure
        try:
            settings = get_settings()
            await _notify_backend(settings, file_id, "failed", 0, str(e))
        except Exception:
            pass


async def _notify_backend(settings, file_id: str, status: str, chunk_count: int, error: str = None):
    """Notify the Node.js backend about processing completion/failure."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            await client.post(
                f"{settings.NODE_BACKEND_URL}/api/ai/webhook",
                json={
                    "file_id": file_id,
                    "status": status,
                    "chunk_count": chunk_count,
                    "error": error,
                },
            )
    except Exception as e:
        logger.warning(f"Could not notify backend for {file_id}: {e}")
