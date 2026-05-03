# ============================================================
# query/conversation.py — Conversation Memory Store
# ============================================================
# In-memory conversation history for multi-turn Q&A.
# Enables follow-up questions like "What about Q2?" after
# asking about Q1 results.
# ============================================================

import time
import logging
from typing import Optional, List, Dict
from config.settings import get_settings

logger = logging.getLogger(__name__)

# In-memory conversation store: { conversation_id: { turns, last_access } }
_conversations: Dict[str, Dict] = {}


def get_conversation_history(conversation_id: Optional[str]) -> List[Dict]:
    """
    Retrieve conversation history for a given conversation ID.

    Returns:
        List of { "role": "user"|"assistant", "content": str } dicts
    """
    if not conversation_id:
        return []

    _cleanup_expired()

    conv = _conversations.get(conversation_id)
    if not conv:
        return []

    # Update last access time
    conv["last_access"] = time.time()
    return conv["turns"]


def add_turn(
    conversation_id: Optional[str],
    question: str,
    answer: str,
) -> None:
    """
    Add a Q&A turn to conversation history.

    Args:
        conversation_id: Session identifier (None = no memory)
        question: User's question
        answer: AI-generated answer
    """
    if not conversation_id:
        return

    settings = get_settings()
    now = time.time()

    if conversation_id not in _conversations:
        _conversations[conversation_id] = {
            "turns": [],
            "last_access": now,
        }

    conv = _conversations[conversation_id]
    conv["last_access"] = now

    # Add user turn and assistant turn
    conv["turns"].append({"role": "user", "content": question})
    conv["turns"].append({"role": "assistant", "content": answer})

    # Trim to max memory size (each turn = 2 messages: user + assistant)
    max_messages = settings.CONVERSATION_MEMORY_SIZE * 2
    if len(conv["turns"]) > max_messages:
        conv["turns"] = conv["turns"][-max_messages:]

    logger.debug(
        f"Conversation {conversation_id[:8]}...: "
        f"{len(conv['turns']) // 2} turns stored"
    )


def format_history_for_prompt(conversation_id: Optional[str]) -> str:
    """
    Format conversation history as a string for inclusion in the LLM prompt.

    Returns:
        Formatted string of previous Q&A turns, or empty string.
    """
    history = get_conversation_history(conversation_id)
    if not history:
        return ""

    parts = ["Previous conversation:"]
    for msg in history:
        role = "User" if msg["role"] == "user" else "Assistant"
        # Truncate long previous answers to save context space
        content = msg["content"]
        if role == "Assistant" and len(content) > 500:
            content = content[:500] + "..."
        parts.append(f"{role}: {content}")

    return "\n".join(parts)


def _cleanup_expired() -> None:
    """Remove expired conversations to prevent memory leaks."""
    settings = get_settings()
    now = time.time()
    expired = [
        cid for cid, conv in _conversations.items()
        if now - conv["last_access"] > settings.CONVERSATION_TTL
    ]
    for cid in expired:
        del _conversations[cid]

    if expired:
        logger.info(f"Cleaned up {len(expired)} expired conversations")
