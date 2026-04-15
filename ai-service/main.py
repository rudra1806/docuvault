# ============================================================
# main.py — FastAPI Application Entry Point
# ============================================================
# DocuVault AI Service: Content extraction, embedding,
# vector storage, and RAG-based question answering.
# ============================================================

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config.settings import get_settings
from routes import process, query, status

# ── Logging Setup ───────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# ── Initialize FastAPI App ──────────────────────────────────
app = FastAPI(
    title="DocuVault AI Service",
    description="AI-powered document processing and Q&A for DocuVault",
    version="1.0.0",
)

# ── CORS Middleware ─────────────────────────────────────────
settings = get_settings()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.NODE_BACKEND_URL,
        "http://localhost:5000",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Mount Routes ────────────────────────────────────────────
app.include_router(process.router, tags=["Processing"])
app.include_router(query.router, tags=["Query"])
app.include_router(status.router, tags=["Status"])


# ── Health Check ────────────────────────────────────────────
@app.get("/")
async def health_check():
    """Health check endpoint."""
    return {
        "success": True,
        "service": "DocuVault AI Service",
        "version": "1.0.0",
        "status": "running 🧠",
    }


@app.on_event("startup")
async def startup_event():
    """Initialize connections on startup."""
    logger.info("=" * 60)
    logger.info("DocuVault AI Service starting...")
    logger.info(f"Embedding model: {settings.EMBEDDING_MODEL}")
    logger.info(f"LLM model: {settings.LLM_MODEL}")
    logger.info(f"Vision model: {settings.VISION_MODEL}")
    logger.info(f"Qdrant URL: {settings.QDRANT_URL[:30]}...")
    logger.info(f"Chunk size: {settings.CHUNK_SIZE} tokens, overlap: {settings.CHUNK_OVERLAP}")
    logger.info("=" * 60)

    # Initialize Qdrant connection and collection
    try:
        from config.qdrant_client import get_qdrant_client
        get_qdrant_client()
        logger.info("Qdrant connection established ✅")
    except Exception as e:
        logger.error(f"Qdrant connection failed: {e}")
        logger.warning("AI service will start but vector operations will fail!")


# ── Run with Uvicorn ────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=True,
    )
