# ============================================================
# pipelines/spreadsheet.py — Spreadsheet Extraction Pipeline
# ============================================================
# Converts XLSX, XLS, and CSV data to natural language rows.
# ============================================================

import io
import logging
import pandas as pd

logger = logging.getLogger(__name__)


async def extract_spreadsheet(file_bytes: bytes, file_name: str, ext: str) -> dict:
    """Extract data from spreadsheet files and convert to natural language."""

    try:
        if ext == "csv":
            df = pd.read_csv(io.BytesIO(file_bytes))
            sheets = {"Sheet1": df}
        else:
            # XLSX / XLS — read all sheets
            xlsx = pd.ExcelFile(io.BytesIO(file_bytes))
            sheets = {
                sheet_name: xlsx.parse(sheet_name)
                for sheet_name in xlsx.sheet_names
            }

        text_parts = []
        total_rows = 0

        for sheet_name, df in sheets.items():
            if df.empty:
                continue

            # Clean column names
            columns = [str(col).strip() for col in df.columns]

            # Add sheet header
            if len(sheets) > 1:
                text_parts.append(f"\n[Sheet: {sheet_name}]")

            # Add column headers as context
            text_parts.append(f"Columns: {', '.join(columns)}")

            # Convert each row to natural language
            for idx, row in df.iterrows():
                row_parts = []
                for col in columns:
                    val = row.get(col, "")
                    if pd.notna(val) and str(val).strip():
                        row_parts.append(f"{col}: {val}")

                if row_parts:
                    text_parts.append(f"Row {idx + 1}: {', '.join(row_parts)}")
                    total_rows += 1

                # Limit to prevent huge files from overwhelming
                if total_rows >= 500:
                    text_parts.append(f"... (truncated at 500 rows, {len(df) - 500} more rows)")
                    break

        return {
            "text": "\n".join(text_parts),
            "source": "spreadsheet",
            "metadata": {
                "sheets": list(sheets.keys()),
                "total_rows": total_rows,
                "type": ext,
            },
        }

    except Exception as e:
        logger.error(f"Spreadsheet extraction failed for {file_name}: {e}")
        return {
            "text": "",
            "source": "spreadsheet",
            "metadata": {"error": str(e), "type": ext},
        }
