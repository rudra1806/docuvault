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
