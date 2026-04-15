# ============================================================
# pipelines/archive.py — Archive Extraction Pipeline
# ============================================================
# Extracts ZIP/RAR archives and processes each file
# recursively through the pipeline router.
# ============================================================

import io
import os
import tempfile
import zipfile
import logging

logger = logging.getLogger(__name__)

# Try to import rarfile (optional dependency)
try:
    import rarfile
    HAS_RARFILE = True
except ImportError:
    HAS_RARFILE = False
    logger.warning("rarfile not available — RAR extraction disabled")


async def extract_archive(file_bytes: bytes, file_name: str, ext: str) -> dict:
    """Extract archive and process each file recursively."""

    # Import here to avoid circular imports
    from pipelines.router import route_file, get_pipeline_type

    if ext == "rar":
        if not HAS_RARFILE:
            return {
                "text": "",
                "source": "archive",
                "metadata": {"error": "RAR support not available"},
            }
        return await _extract_rar(file_bytes, file_name, route_file, get_pipeline_type)

    if ext == "zip":
        return await _extract_zip(file_bytes, file_name, route_file, get_pipeline_type)

    return {"text": "", "source": "archive", "metadata": {"error": f"Unknown archive type: {ext}"}}


async def _extract_zip(
    file_bytes: bytes, file_name: str, route_file_fn, get_pipeline_fn
) -> dict:
    """Extract and process files from a ZIP archive."""
    text_parts = []
    processed_files = []
    errors = []

    try:
        with zipfile.ZipFile(io.BytesIO(file_bytes)) as zf:
            for info in zf.infolist():
                # Skip directories and hidden files
                if info.is_dir() or info.filename.startswith("__MACOSX"):
                    continue

                inner_ext = info.filename.rsplit(".", 1)[-1].lower() if "." in info.filename else ""

                # Skip unsupported file types
                if not get_pipeline_fn(inner_ext):
                    continue

                # Skip nested archives to prevent zip bombs
                if inner_ext in ("zip", "rar"):
                    logger.warning(f"Skipping nested archive: {info.filename}")
                    continue

                try:
                    inner_bytes = zf.read(info.filename)
                    inner_name = os.path.basename(info.filename)

                    result = await route_file_fn(inner_bytes, inner_name, inner_ext)

                    if result.get("text", "").strip():
                        text_parts.append(
                            f"[Archive File: {info.filename}]\n{result['text']}"
                        )
                        processed_files.append(info.filename)

                except Exception as e:
                    errors.append(f"{info.filename}: {str(e)}")
                    logger.error(f"Error processing {info.filename} in {file_name}: {e}")

    except zipfile.BadZipFile as e:
        return {
            "text": "",
            "source": "archive",
            "metadata": {"error": f"Invalid ZIP file: {str(e)}"},
        }

    return {
        "text": "\n\n".join(text_parts),
        "source": "archive",
        "metadata": {
            "type": "zip",
            "processed_files": processed_files,
            "file_count": len(processed_files),
            "errors": errors,
        },
    }


async def _extract_rar(
    file_bytes: bytes, file_name: str, route_file_fn, get_pipeline_fn
) -> dict:
    """Extract and process files from a RAR archive."""
    text_parts = []
    processed_files = []
    errors = []

    try:
        # RAR requires a file on disk
        with tempfile.NamedTemporaryFile(suffix=".rar", delete=False) as tmp:
            tmp.write(file_bytes)
            tmp_path = tmp.name

        try:
            with rarfile.RarFile(tmp_path) as rf:
                for info in rf.infolist():
                    if info.is_dir():
                        continue

                    inner_ext = info.filename.rsplit(".", 1)[-1].lower() if "." in info.filename else ""

                    if not get_pipeline_fn(inner_ext):
                        continue

                    if inner_ext in ("zip", "rar"):
                        continue

                    try:
                        inner_bytes = rf.read(info.filename)
                        inner_name = os.path.basename(info.filename)

                        result = await route_file_fn(inner_bytes, inner_name, inner_ext)

                        if result.get("text", "").strip():
                            text_parts.append(
                                f"[Archive File: {info.filename}]\n{result['text']}"
                            )
                            processed_files.append(info.filename)

                    except Exception as e:
                        errors.append(f"{info.filename}: {str(e)}")

        finally:
            os.unlink(tmp_path)

    except Exception as e:
        return {
            "text": "",
            "source": "archive",
            "metadata": {"error": f"RAR extraction failed: {str(e)}"},
        }

    return {
        "text": "\n\n".join(text_parts),
        "source": "archive",
        "metadata": {
            "type": "rar",
            "processed_files": processed_files,
            "file_count": len(processed_files),
            "errors": errors,
        },
    }
