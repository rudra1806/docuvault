# ============================================================
# storage/vector_store.py — Qdrant Vector Operations
# ============================================================
# Handles upserting, searching, and deleting vectors
# in the Qdrant Cloud collection.
# ============================================================

import uuid
import logging
from typing import List, Dict
from qdrant_client.http.models import (
    PointStruct,
    Filter,
    FieldCondition,
    MatchValue,
)
from config.qdrant_client import get_qdrant_client
from config.settings import get_settings

logger = logging.getLogger(__name__)


def upsert_chunks(
    chunks: List[Dict],
    embeddings: List[List[float]],
    file_id: str,
    file_name: str,
    file_type: str,
    source: str,
    user_id: str,
) -> int:
    """
    Store chunk embeddings in Qdrant.

    Args:
        chunks: List of chunk dicts from chunker
        embeddings: Corresponding embedding vectors
        file_id: MongoDB document ID
        file_name: Original file name
        file_type: File extension
        source: Pipeline source (text, vision, spreadsheet, etc.)
        user_id: MongoDB user ID (for data isolation)

    Returns:
        Number of points upserted
    """
    settings = get_settings()
    client = get_qdrant_client()

    points = []
    for chunk, embedding in zip(chunks, embeddings):
        point_id = str(uuid.uuid4())
        points.append(
            PointStruct(
                id=point_id,
                vector=embedding,
                payload={
                    "file_id": file_id,
                    "file_name": file_name,
                    "chunk_text": chunk["text"],
                    "chunk_index": chunk["index"],
                    "file_type": file_type,
                    "source": source,
                    "user_id": user_id,
                },
            )
        )

    # Upsert in batches of 100
    batch_size = 100
    for i in range(0, len(points), batch_size):
        batch = points[i : i + batch_size]
        client.upsert(
            collection_name=settings.QDRANT_COLLECTION,
            points=batch,
        )

    logger.info(
        f"Upserted {len(points)} vectors for {file_name} (file_id={file_id})"
    )
    return len(points)


def search_similar(
    query_embedding: List[float],
    user_id: str,
    top_k: int = 5,
    score_threshold: float = 0.3,
) -> List[Dict]:
    """
    Search for similar chunks in Qdrant.

    Args:
        query_embedding: Embedding vector of the query
        user_id: Filter results to this user only
        top_k: Number of results to return
        score_threshold: Minimum similarity score

    Returns:
        List of result dicts with text, metadata, and scores
    """
    settings = get_settings()
    client = get_qdrant_client()

    results = client.search(
        collection_name=settings.QDRANT_COLLECTION,
        query_vector=query_embedding,
        query_filter=Filter(
            must=[
                FieldCondition(
                    key="user_id",
                    match=MatchValue(value=user_id),
                ),
            ]
        ),
        limit=top_k,
        score_threshold=score_threshold,
    )

    chunks = []
    for result in results:
        chunks.append({
            "text": result.payload.get("chunk_text", ""),
            "file_name": result.payload.get("file_name", ""),
            "file_id": result.payload.get("file_id", ""),
            "file_type": result.payload.get("file_type", ""),
            "chunk_index": result.payload.get("chunk_index", 0),
            "source": result.payload.get("source", ""),
            "score": result.score,
        })

    logger.info(f"Found {len(chunks)} similar chunks for user {user_id}")
    return chunks


def delete_file_vectors(file_id: str) -> int:
    """
    Delete all vectors associated with a specific file.
    Called when a document is deleted from DocuVault.

    Returns:
        Number of points deleted
    """
    settings = get_settings()
    client = get_qdrant_client()

    # Count before deletion (for logging)
    count_result = client.count(
        collection_name=settings.QDRANT_COLLECTION,
        count_filter=Filter(
            must=[
                FieldCondition(
                    key="file_id",
                    match=MatchValue(value=file_id),
                ),
            ]
        ),
    )

    deleted_count = count_result.count

    # Delete all points matching the file_id
    client.delete(
        collection_name=settings.QDRANT_COLLECTION,
        points_selector=Filter(
            must=[
                FieldCondition(
                    key="file_id",
                    match=MatchValue(value=file_id),
                ),
            ]
        ),
    )

    logger.info(f"Deleted {deleted_count} vectors for file_id={file_id}")
    return deleted_count


def get_user_stats(user_id: str) -> Dict:
    """Get AI processing stats for a user."""
    settings = get_settings()
    client = get_qdrant_client()

    count_result = client.count(
        collection_name=settings.QDRANT_COLLECTION,
        count_filter=Filter(
            must=[
                FieldCondition(
                    key="user_id",
                    match=MatchValue(value=user_id),
                ),
            ]
        ),
    )

    return {
        "total_chunks": count_result.count,
    }


def scroll_user_chunks(user_id: str, max_chunks: int = 5000) -> List[Dict]:
    """
    Scroll all chunks for a user from Qdrant (without vectors).
    Used by BM25 index builder.

    Args:
        user_id: Filter to this user's chunks
        max_chunks: Maximum chunks to retrieve (safety limit)

    Returns:
        List of chunk dicts with text and metadata
    """
    settings = get_settings()
    client = get_qdrant_client()

    all_chunks = []
    offset = None  # Start from the beginning

    while len(all_chunks) < max_chunks:
        results, next_offset = client.scroll(
            collection_name=settings.QDRANT_COLLECTION,
            scroll_filter=Filter(
                must=[
                    FieldCondition(
                        key="user_id",
                        match=MatchValue(value=user_id),
                    ),
                ]
            ),
            limit=500,
            offset=offset,
            with_payload=True,
            with_vectors=False,
        )

        for point in results:
            all_chunks.append({
                "text": point.payload.get("chunk_text", ""),
                "file_name": point.payload.get("file_name", ""),
                "file_id": point.payload.get("file_id", ""),
                "file_type": point.payload.get("file_type", ""),
                "chunk_index": point.payload.get("chunk_index", 0),
                "source": point.payload.get("source", ""),
                "point_id": str(point.id),
            })

        if next_offset is None:
            break  # No more results
        offset = next_offset

    logger.info(f"Scrolled {len(all_chunks)} chunks for user {user_id}")
    return all_chunks

