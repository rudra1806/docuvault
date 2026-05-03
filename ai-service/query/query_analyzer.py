# ============================================================
# query/query_analyzer.py — Question Decomposition & Analysis
# ============================================================
# Uses the LLM to classify question complexity and decompose
# complex questions into sub-queries for multi-step retrieval.
# ============================================================

import json
import logging
from typing import Dict
from config.groq_client import get_groq_client
from config.settings import get_settings

logger = logging.getLogger(__name__)

# Question complexity levels and their characteristics
COMPLEXITY_TYPES = {
    "simple": "Single fact lookup, one document needed",
    "multi_part": "Multiple distinct sub-questions",
    "comparative": "Compare/contrast across documents or sections",
    "analytical": "Requires synthesis, trend analysis, or reasoning",
    "summary": "Summarize content from one or more documents",
}


async def analyze_question(question: str) -> Dict:
    """
    Analyze a question to determine complexity and generate sub-queries.

    Returns:
        {
            "complexity": "simple" | "multi_part" | "comparative" | "analytical" | "summary",
            "sub_queries": ["query1", "query2", ...],
            "requires_synthesis": bool,
            "synthesis_instruction": str | None,
            "original_question": str,
        }
    """
    settings = get_settings()

    try:
        client = get_groq_client()

        response = client.chat.completions.create(
            model=settings.LLM_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a question analysis engine. Analyze the user's question and return a JSON object with:\n"
                        "1. 'complexity': one of 'simple', 'multi_part', 'comparative', 'analytical', 'summary'\n"
                        "2. 'sub_queries': array of 1-4 focused search queries to find the relevant information. "
                        "Each sub-query should be a clear, self-contained search phrase (NOT a full question). "
                        "Remove filler words. For simple questions, return just 1 sub-query.\n"
                        "3. 'requires_synthesis': boolean — true if the answer needs to combine info from multiple sources\n"
                        "4. 'synthesis_instruction': if requires_synthesis is true, a brief instruction on how to combine the information\n\n"
                        "Examples:\n"
                        "Q: 'What is the total revenue?' → {\"complexity\":\"simple\",\"sub_queries\":[\"total revenue\"],\"requires_synthesis\":false,\"synthesis_instruction\":null}\n"
                        "Q: 'Compare Q1 and Q2 sales' → {\"complexity\":\"comparative\",\"sub_queries\":[\"Q1 sales figures\",\"Q2 sales figures\"],\"requires_synthesis\":true,\"synthesis_instruction\":\"Compare Q1 vs Q2 sales side by side\"}\n"
                        "Q: 'Summarize the project status and budget allocation' → {\"complexity\":\"multi_part\",\"sub_queries\":[\"project status\",\"budget allocation\"],\"requires_synthesis\":true,\"synthesis_instruction\":\"Summarize both project status and budget together\"}\n\n"
                        "Return ONLY valid JSON."
                    ),
                },
                {
                    "role": "user",
                    "content": question,
                },
            ],
            max_tokens=300,
            temperature=0.0,
            response_format={"type": "json_object"},
        )

        raw = response.choices[0].message.content.strip()
        result = json.loads(raw)

        # Validate and normalize
        analysis = {
            "complexity": result.get("complexity", "simple"),
            "sub_queries": result.get("sub_queries", [question]),
            "requires_synthesis": result.get("requires_synthesis", False),
            "synthesis_instruction": result.get("synthesis_instruction"),
            "original_question": question,
        }

        # Ensure complexity is valid
        if analysis["complexity"] not in COMPLEXITY_TYPES:
            analysis["complexity"] = "simple"

        # Ensure we have at least one sub-query
        if not analysis["sub_queries"]:
            analysis["sub_queries"] = [question]

        # Cap sub-queries at 4
        analysis["sub_queries"] = analysis["sub_queries"][:4]

        logger.info(
            f"Question analysis: complexity={analysis['complexity']}, "
            f"sub_queries={len(analysis['sub_queries'])}, "
            f"synthesis={analysis['requires_synthesis']}"
        )

        return analysis

    except Exception as e:
        logger.warning(f"Question analysis failed, using defaults: {e}")
        # Graceful fallback: treat as simple question
        return {
            "complexity": "simple",
            "sub_queries": [question],
            "requires_synthesis": False,
            "synthesis_instruction": None,
            "original_question": question,
        }


def get_max_tokens(complexity: str) -> int:
    """Determine max answer tokens based on question complexity."""
    settings = get_settings()

    if complexity in ("comparative", "analytical", "multi_part", "summary"):
        return settings.MAX_TOKENS_COMPLEX
    else:
        return settings.MAX_TOKENS_SIMPLE


def get_temperature(complexity: str) -> float:
    """Determine LLM temperature based on question type."""
    if complexity in ("analytical", "summary"):
        return 0.3  # Slightly more creative for analysis
    else:
        return 0.1  # More deterministic for factual queries
