# ============================================================
# processing/embedder.py — HuggingFace Embedding API
# ============================================================
# Generates embeddings using HuggingFace InferenceClient
# with the BGE-small-en-v1.5 model (384 dimensions).
# ============================================================

import logging
import asyncio
from typing import List
from huggingface_hub import InferenceClient
from config.settings import get_settings

logger = logging.getLogger(__name__)

# Batch size for embedding requests
BATCH_SIZE = 16

# Retry configuration
MAX_RETRIES = 3
RETRY_DELAY = 2  # seconds

_client = None


def _get_hf_client() -> InferenceClient:
    """Get or create the singleton HF InferenceClient."""
    global _client
    if _client is None:
        settings = get_settings()
        _client = InferenceClient(
            provider="hf-inference",
            api_key=settings.HF_API_TOKEN,
        )
    return _client


async def embed_texts(texts: List[str]) -> List[List[float]]:
    """
    Generate embeddings for a list of texts using HuggingFace API.

    Args:
        texts: List of text strings to embed

    Returns:
        List of embedding vectors (each is a list of floats)
    """
    settings = get_settings()

    if not settings.HF_API_TOKEN:
        raise ValueError("HF_API_TOKEN not configured")

    all_embeddings = []

    # Process in batches
    for i in range(0, len(texts), BATCH_SIZE):
        batch = texts[i : i + BATCH_SIZE]
        batch_embeddings = await _embed_batch(batch, settings.EMBEDDING_MODEL)
        all_embeddings.extend(batch_embeddings)

        # Small delay between batches to avoid rate limits
        if i + BATCH_SIZE < len(texts):
            await asyncio.sleep(0.5)

    logger.info(f"Generated {len(all_embeddings)} embeddings ({settings.EMBEDDING_MODEL})")
    return all_embeddings


async def embed_single(text: str) -> List[float]:
    """Embed a single text string (used for query embedding)."""
    results = await embed_texts([text])
    return results[0]


async def _embed_batch(texts: List[str], model: str) -> List[List[float]]:
    """Embed a batch of texts with retry logic using InferenceClient."""
    client = _get_hf_client()

    for attempt in range(MAX_RETRIES):
        try:
            # Run the synchronous HF client call in a thread pool
            loop = asyncio.get_event_loop()
            embeddings = await loop.run_in_executor(
                None,
                lambda: _call_feature_extraction(client, texts, model),
            )
            return embeddings

        except Exception as e:
            error_msg = str(e)
            if "503" in error_msg or "loading" in error_msg.lower():
                wait_time = RETRY_DELAY * (attempt + 1)
                logger.warning(
                    f"Model loading, retrying in {wait_time}s (attempt {attempt + 1}/{MAX_RETRIES})"
                )
                await asyncio.sleep(wait_time)
            elif "429" in error_msg or "rate" in error_msg.lower():
                wait_time = RETRY_DELAY * (attempt + 2)
                logger.warning(
                    f"Rate limited, retrying in {wait_time}s (attempt {attempt + 1}/{MAX_RETRIES})"
                )
                await asyncio.sleep(wait_time)
            else:
                if attempt < MAX_RETRIES - 1:
                    logger.warning(f"Embed attempt {attempt + 1} failed: {e}")
                    await asyncio.sleep(RETRY_DELAY)
                else:
                    raise

    raise Exception(f"Failed to generate embeddings after {MAX_RETRIES} retries")


def _call_feature_extraction(
    client: InferenceClient, texts: List[str], model: str
) -> List[List[float]]:
    """Synchronous call to HF feature_extraction for each text."""
    results = []
    for text in texts:
        embedding = client.feature_extraction(
            text,
            model=model,
        )
        # Convert to list of floats
        emb = _to_flat_list(embedding)
        results.append(emb)
    return results


def _to_flat_list(embedding) -> List[float]:
    """Convert various embedding formats to a flat list of floats."""
    import numpy as np

    # If it's already a numpy array
    if hasattr(embedding, "tolist"):
        arr = embedding.tolist()
    else:
        arr = embedding

    # If it's a list of lists (token-level), average them
    if isinstance(arr, list) and len(arr) > 0 and isinstance(arr[0], list):
        # Mean pooling across tokens
        np_arr = np.array(arr)
        return np.mean(np_arr, axis=0).tolist()

    return arr
