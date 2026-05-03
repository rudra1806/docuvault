# ============================================================
# config/groq_client.py — Singleton Groq Client
# ============================================================
# Provides a cached Groq client instance to avoid creating
# new connections on every LLM call.
# ============================================================

from groq import Groq
from config.settings import get_settings

_client = None


def get_groq_client() -> Groq:
    """Get or create the singleton Groq client."""
    global _client
    if _client is None:
        settings = get_settings()
        _client = Groq(api_key=settings.GROQ_API_KEY)
    return _client
