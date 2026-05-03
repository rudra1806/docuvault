# ============================================================
# config/settings.py — Application Settings
# ============================================================
# Loads all environment variables using Pydantic BaseSettings.
# ============================================================

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # ── API Keys ────────────────────────────────────────────
    GROQ_API_KEY: str = ""
    HF_API_TOKEN: str = ""
    QDRANT_URL: str = ""
    QDRANT_API_KEY: str = ""

    # ── Model Configuration ─────────────────────────────────
    EMBEDDING_MODEL: str = "BAAI/bge-m3"
    LLM_MODEL: str = "llama-3.3-70b-versatile"
    VISION_MODEL: str = "meta-llama/llama-4-scout-17b-16e-instruct"

    # ── Chunking Configuration ──────────────────────────────
    CHUNK_SIZE: int = 400      # tokens per chunk
    CHUNK_OVERLAP: int = 100   # token overlap between chunks

    # ── Retrieval Configuration ─────────────────────────────
    INITIAL_RETRIEVAL_K: int = 20       # chunks to retrieve before reranking
    FINAL_CONTEXT_K: int = 8            # chunks after reranking for context
    SCORE_THRESHOLD: float = 0.15       # minimum vector similarity score

    # ── Hybrid Search (BM25 + Vector) ───────────────────────
    BM25_CACHE_TTL: int = 300           # BM25 index cache TTL in seconds

    # ── Re-Ranking ──────────────────────────────────────────
    RERANK_ENABLED: bool = True         # enable LLM-based reranking

    # ── Answer Generation ───────────────────────────────────
    MAX_TOKENS_SIMPLE: int = 1024       # max tokens for simple questions
    MAX_TOKENS_COMPLEX: int = 3000      # max tokens for complex questions

    # ── Conversation Memory ─────────────────────────────────
    CONVERSATION_MEMORY_SIZE: int = 5   # turns to remember per conversation
    CONVERSATION_TTL: int = 1800        # memory TTL in seconds (30 min)

    # ── Validation ──────────────────────────────────────────
    VALIDATOR_ENABLED: bool = True      # enable answer self-reflection

    # ── Server ──────────────────────────────────────────────
    PORT: int = 8000
    NODE_BACKEND_URL: str = "http://localhost:5000"

    # ── Qdrant Collection ───────────────────────────────────
    QDRANT_COLLECTION: str = "docuvault_chunks"
    EMBEDDING_DIM: int = 1024   # BAAI/bge-m3 output dimension

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """Cached settings instance — loaded once, reused everywhere."""
    return Settings()
