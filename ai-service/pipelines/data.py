# ============================================================
# pipelines/data.py — Data File Extraction Pipeline
# ============================================================
# Converts JSON and XML structured data into natural language.
# ============================================================

import io
import json
import logging
import xml.etree.ElementTree as ET

logger = logging.getLogger(__name__)


async def extract_data(file_bytes: bytes, file_name: str, ext: str) -> dict:
    """Extract and convert structured data (JSON, XML) to natural language."""

    if ext == "json":
        return _extract_json(file_bytes, file_name)
    elif ext == "xml":
        return _extract_xml(file_bytes, file_name)
    else:
        return {"text": "", "source": "data", "metadata": {"error": f"Unknown data type: {ext}"}}


def _extract_json(file_bytes: bytes, file_name: str) -> dict:
    """Parse JSON and flatten to natural language."""
    try:
        data = json.loads(file_bytes.decode("utf-8"))
        text_parts = []

        _flatten_json(data, text_parts, prefix="")

        return {
            "text": "\n".join(text_parts),
            "source": "data",
            "metadata": {
                "type": "json",
                "entries": len(text_parts),
            },
        }
    except json.JSONDecodeError as e:
        logger.error(f"JSON parse error for {file_name}: {e}")
        # Fall back to treating as plain text
        return {
            "text": file_bytes.decode("utf-8", errors="replace"),
            "source": "data",
            "metadata": {"type": "json", "note": "invalid JSON, treated as text"},
        }


def _flatten_json(data, parts: list, prefix: str = "", depth: int = 0) -> None:
    """Recursively flatten JSON into key-value sentences."""
    if depth > 10:  # Prevent infinite recursion
        parts.append(f"{prefix}: [deeply nested data]")
        return

    if isinstance(data, dict):
        for key, value in data.items():
            new_prefix = f"{prefix}.{key}" if prefix else str(key)
            _flatten_json(value, parts, new_prefix, depth + 1)
    elif isinstance(data, list):
        if len(data) == 0:
            parts.append(f"{prefix}: [empty list]")
        else:
            for i, item in enumerate(data[:100]):  # Limit array items
                _flatten_json(item, parts, f"{prefix}[{i}]", depth + 1)
            if len(data) > 100:
                parts.append(f"{prefix}: ... ({len(data) - 100} more items)")
    else:
        # Leaf value
        value_str = str(data).strip()
        if value_str:
            parts.append(f"{prefix}: {value_str}")


def _extract_xml(file_bytes: bytes, file_name: str) -> dict:
    """Parse XML and extract text content from all elements."""
    try:
        root = ET.fromstring(file_bytes.decode("utf-8"))
        text_parts = []

        _flatten_xml(root, text_parts, depth=0)

        return {
            "text": "\n".join(text_parts),
            "source": "data",
            "metadata": {
                "type": "xml",
                "root_tag": root.tag,
                "entries": len(text_parts),
            },
        }
    except ET.ParseError as e:
        logger.error(f"XML parse error for {file_name}: {e}")
        return {
            "text": file_bytes.decode("utf-8", errors="replace"),
            "source": "data",
            "metadata": {"type": "xml", "note": "invalid XML, treated as text"},
        }


def _flatten_xml(element, parts: list, depth: int = 0, path: str = "") -> None:
    """Recursively extract text from XML elements."""
    if depth > 10:
        return

    tag = element.tag.split("}")[-1] if "}" in element.tag else element.tag
    current_path = f"{path}/{tag}" if path else tag

    # Element text
    if element.text and element.text.strip():
        parts.append(f"{current_path}: {element.text.strip()}")

    # Element attributes
    for attr_name, attr_value in element.attrib.items():
        parts.append(f"{current_path}@{attr_name}: {attr_value}")

    # Recurse into children
    for child in element:
        _flatten_xml(child, parts, depth + 1, current_path)

    # Tail text (text after child elements)
    if element.tail and element.tail.strip():
        parts.append(f"{path}: {element.tail.strip()}")
