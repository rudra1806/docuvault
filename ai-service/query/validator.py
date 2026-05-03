# ============================================================
# query/validator.py — Answer Self-Reflection & Validation
# ============================================================
# After generating an answer, uses the LLM to validate quality,
# completeness, and faithfulness to the provided context.
# Catches hallucinations and incomplete answers.
# ============================================================

import json
import logging
from typing import Dict, Optional
from config.groq_client import get_groq_client
from config.settings import get_settings

logger = logging.getLogger(__name__)


async def validate_answer(
    question: str,
    answer: str,
    context: str,
) -> Dict:
    """
    Validate a generated answer for quality and faithfulness.

    Checks:
    1. Does the answer address all parts of the question?
    2. Are all claims supported by the provided context?
    3. Is the answer complete (not truncated)?

    Args:
        question: Original user question
        answer: Generated answer to validate
        context: The context that was provided to generate the answer

    Returns:
        {
            "is_valid": bool,
            "score": float (0-10),
            "issues": [str],  # list of identified issues
            "suggestion": str | None  # improvement suggestion
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
                        "You are an answer quality validator. Evaluate the given answer "
                        "against the question and context. Return a JSON object with:\n"
                        "- 'score': 0-10 quality score\n"
                        "- 'completeness': does the answer address ALL parts of the question? (0-10)\n"
                        "- 'faithfulness': are all claims supported by the context? (0-10)\n"
                        "- 'issues': array of strings describing any problems found\n"
                        "- 'suggestion': brief suggestion to improve the answer, or null if good\n\n"
                        "Score 7+ means the answer is acceptable. Below 7 needs improvement.\n"
                        "Return ONLY valid JSON."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Question: {question}\n\n"
                        f"Context provided:\n{context[:2000]}\n\n"
                        f"Generated answer:\n{answer}\n\n"
                        f"Evaluate this answer."
                    ),
                },
            ],
            max_tokens=300,
            temperature=0.0,
            response_format={"type": "json_object"},
        )

        raw = response.choices[0].message.content.strip()
        result = json.loads(raw)

        score = float(result.get("score", 5))
        completeness = float(result.get("completeness", 5))
        faithfulness = float(result.get("faithfulness", 5))
        issues = result.get("issues", [])
        suggestion = result.get("suggestion")

        # Average the sub-scores
        avg_score = (score + completeness + faithfulness) / 3.0

        validation = {
            "is_valid": avg_score >= 6.0,
            "score": round(avg_score, 1),
            "completeness": completeness,
            "faithfulness": faithfulness,
            "issues": issues if isinstance(issues, list) else [],
            "suggestion": suggestion,
        }

        logger.info(
            f"Answer validation: score={validation['score']}, "
            f"valid={validation['is_valid']}, "
            f"issues={len(validation['issues'])}"
        )

        return validation

    except Exception as e:
        logger.warning(f"Answer validation failed: {e}")
        # On failure, assume the answer is valid (don't block the response)
        return {
            "is_valid": True,
            "score": 5.0,
            "completeness": 5.0,
            "faithfulness": 5.0,
            "issues": [],
            "suggestion": None,
        }


async def maybe_regenerate(
    question: str,
    answer: str,
    context: str,
    validation: Dict,
) -> Optional[str]:
    """
    If validation score is low, attempt to regenerate a better answer
    using the validation feedback.

    Returns:
        Improved answer string, or None if regeneration isn't needed.
    """
    if validation["is_valid"]:
        return None

    settings = get_settings()

    try:
        client = get_groq_client()

        issues_text = "\n".join(f"- {issue}" for issue in validation["issues"])
        suggestion = validation.get("suggestion", "Provide a more complete answer.")

        response = client.chat.completions.create(
            model=settings.LLM_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are DocuVault AI — an expert document analyst. "
                        "Your previous answer had quality issues. Generate an improved answer "
                        "that addresses the identified problems. Base your answer ONLY on the "
                        "provided context. Use markdown formatting."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Question: {question}\n\n"
                        f"Context:\n{context}\n\n"
                        f"Previous answer had these issues:\n{issues_text}\n\n"
                        f"Improvement suggestion: {suggestion}\n\n"
                        f"Generate an improved answer:"
                    ),
                },
            ],
            max_tokens=settings.MAX_TOKENS_COMPLEX,
            temperature=0.2,
        )

        improved = response.choices[0].message.content.strip()
        logger.info(f"Regenerated answer ({len(improved)} chars) after validation failure")
        return improved

    except Exception as e:
        logger.warning(f"Answer regeneration failed: {e}")
        return None
