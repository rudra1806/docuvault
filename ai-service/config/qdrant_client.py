# ============================================================
# config/qdrant_client.py — Qdrant Cloud Connection
# ============================================================
# Initializes the Qdrant client and ensures the collection exists.
# ============================================================

from qdrant_client import QdrantClient
from qdrant_client.http.models import Distance, VectorParams, PayloadSchemaType
from config.settings import get_settings
import logging

logger = logging.getLogger(__name__)

_client = None


def get_qdrant_client() -> QdrantClient:
    """Get or create the singleton Qdrant client."""
    global _client
    if _client is None:
        settings = get_settings()
        _client = QdrantClient(
            url=settings.QDRANT_URL,
            api_key=settings.QDRANT_API_KEY,
            timeout=30,
        )
        _ensure_collection_exists(_client, settings)
        _ensure_payload_indexes(_client, settings)
        logger.info(f"Qdrant client connected to {settings.QDRANT_URL}")
    return _client


def _ensure_collection_exists(client: QdrantClient, settings) -> None:
    """Create the vector collection if it doesn't already exist.
    Recreates if the dimension has changed (model upgrade)."""
    collections = [c.name for c in client.get_collections().collections]

    if settings.QDRANT_COLLECTION in collections:
        # Check if dimensions match
        info = client.get_collection(settings.QDRANT_COLLECTION)
        current_dim = info.config.params.vectors.size
        if current_dim != settings.EMBEDDING_DIM:
            logger.warning(
                f"Dimension mismatch: collection has {current_dim}, "
                f"but model needs {settings.EMBEDDING_DIM}. Recreating..."
            )
            client.delete_collection(settings.QDRANT_COLLECTION)
            logger.info(f"Deleted old collection: {settings.QDRANT_COLLECTION}")
        else:
            logger.info(f"Qdrant collection already exists: {settings.QDRANT_COLLECTION}")
            return

    client.create_collection(
        collection_name=settings.QDRANT_COLLECTION,
        vectors_config=VectorParams(
            size=settings.EMBEDDING_DIM,
            distance=Distance.COSINE,
        ),
    )
    logger.info(f"Created Qdrant collection: {settings.QDRANT_COLLECTION} (dim={settings.EMBEDDING_DIM})")


def _ensure_payload_indexes(client: QdrantClient, settings) -> None:
    """Create payload indexes required for filtered queries."""
    for field_name in ["user_id", "file_id"]:
        try:
            client.create_payload_index(
                collection_name=settings.QDRANT_COLLECTION,
                field_name=field_name,
                field_schema=PayloadSchemaType.KEYWORD,
            )
            logger.info(f"Created payload index: {field_name}")
        except Exception as e:
            # Index may already exist — that's fine
            if "already exists" in str(e).lower():
                logger.debug(f"Payload index already exists: {field_name}")
            else:
                logger.warning(f"Could not create index for {field_name}: {e}")
