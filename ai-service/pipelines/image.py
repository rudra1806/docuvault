# ============================================================
# pipelines/image.py — Image Extraction Pipeline
# ============================================================
# Uses Groq Vision API (Llava) for both OCR text extraction
# and image description. No local Tesseract needed.
# ============================================================

import base64
import logging
from groq import Groq
from config.settings import get_settings

logger = logging.getLogger(__name__)


async def extract_image(file_bytes: bytes, file_name: str, ext: str) -> dict:
    """
    Extract information from images using Groq Vision API.
    Combines OCR (text extraction) and image description in one call.
    """

    settings = get_settings()

    if not settings.GROQ_API_KEY:
        return {
            "text": f"[Image: {file_name}] — Vision API key not configured.",
            "source": "image",
            "metadata": {"error": "GROQ_API_KEY not set", "type": ext},
        }

    try:
        # Encode image to base64
        b64_image = base64.b64encode(file_bytes).decode("utf-8")

        # Map extension to MIME type
        mime_map = {
            "jpg": "image/jpeg",
            "jpeg": "image/jpeg",
            "png": "image/png",
            "gif": "image/gif",
            "webp": "image/webp",
        }
        mime_type = mime_map.get(ext, "image/jpeg")

        # Call Groq Vision API
        client = Groq(api_key=settings.GROQ_API_KEY)

        response = client.chat.completions.create(
            model=settings.VISION_MODEL,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": (
                                "Analyze this image and provide:\n"
                                "1. **OCR Text**: Extract ALL visible text in the image exactly as written. "
                                "If there is no text, write 'No visible text'.\n"
                                "2. **Image Description**: Describe what the image shows in detail — "
                                "objects, people, charts, diagrams, layouts, colors, etc.\n\n"
                                "Format your response as:\n"
                                "[OCR Text]\n{extracted text}\n\n"
                                "[Image Description]\n{description}"
                            ),
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{mime_type};base64,{b64_image}",
                            },
                        },
                    ],
                }
            ],
            max_tokens=1024,
            temperature=0.1,
        )

        vision_output = response.choices[0].message.content.strip()

        return {
            "text": f"[Image: {file_name}]\n{vision_output}",
            "source": "vision",
            "metadata": {
                "type": ext,
                "model": settings.VISION_MODEL,
                "tokens_used": response.usage.total_tokens if response.usage else 0,
            },
        }

    except Exception as e:
        logger.error(f"Image extraction failed for {file_name}: {e}")
        return {
            "text": f"[Image: {file_name}] — Could not process image.",
            "source": "image",
            "metadata": {"error": str(e), "type": ext},
        }
