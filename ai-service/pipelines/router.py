# ============================================================
# pipelines/router.py — File Type Detection & Routing
# ============================================================
# Core dispatcher: detects file type from extension and
# routes to the appropriate content extraction pipeline.
# ============================================================

import logging
from typing import Optional, Dict
from pipelines.document import extract_document
from pipelines.spreadsheet import extract_spreadsheet
from pipelines.presentation import extract_presentation
from pipelines.image import extract_image
from pipelines.data import extract_data
from pipelines.archive import extract_archive

logger = logging.getLogger(__name__)

# File type to pipeline mapping
PIPELINE_MAP = {
    # Documents
    "pdf": "document",
    "docx": "document",
    "doc": "document",
    "txt": "document",
    # Spreadsheets
    "xlsx": "spreadsheet",
    "xls": "spreadsheet",
    "csv": "spreadsheet",
    # Presentations
    "pptx": "presentation",
    "ppt": "presentation",
    # Images
    "jpg": "image",
    "jpeg": "image",
    "png": "image",
    "gif": "image",
    "webp": "image",
    # Data files
    "json": "data",
    "xml": "data",
    # Archives
    "zip": "archive",
    "rar": "archive",
}

PIPELINE_HANDLERS = {
    "document": extract_document,
    "spreadsheet": extract_spreadsheet,
    "presentation": extract_presentation,
    "image": extract_image,
    "data": extract_data,
    "archive": extract_archive,
}


def get_pipeline_type(file_extension: str) -> Optional[str]:
    """Determine which pipeline to use based on file extension."""
    return PIPELINE_MAP.get(file_extension.lower().strip("."))


async def route_file(file_bytes: bytes, file_name: str, file_extension: str) -> Dict:
    """
    Route a file to its appropriate extraction pipeline.

    Returns:
        {
            "text": str,           # Extracted text content
            "source": str,         # Pipeline type used
            "metadata": dict       # Additional extraction metadata
        }
    """
    ext = file_extension.lower().strip(".")
    pipeline_type = get_pipeline_type(ext)

    if not pipeline_type:
        logger.warning(f"No pipeline for extension: {ext}")
        return {
            "text": "",
            "source": "unsupported",
            "metadata": {"error": f"Unsupported file type: {ext}"},
        }

    handler = PIPELINE_HANDLERS[pipeline_type]
    logger.info(f"Routing {file_name} ({ext}) → {pipeline_type} pipeline")

    try:
        result = await handler(file_bytes, file_name, ext)
        logger.info(
            f"Extracted {len(result.get('text', ''))} chars from {file_name}"
        )
        return result
    except Exception as e:
        logger.error(f"Pipeline error for {file_name}: {e}", exc_info=True)
        return {
            "text": "",
            "source": pipeline_type,
            "metadata": {"error": str(e)},
        }
