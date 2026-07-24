"""Deterministic fallback when the AI Gateway is disabled or fails.

AI being unavailable MUST NOT affect M0-M10 functionality. This module returns a
safe, deterministic response that the frontend can render in place of an AI answer.
No provider, network, or external dependency is touched here.
"""
from typing import Any, Dict

from .provider import AIUnavailableError


def get_fallback_response(reason: str = "ai_unavailable") -> Dict[str, Any]:
    return {
        "answer": (
            "The AI interpretation layer is currently unavailable. "
            "You can continue exploring the deterministic knowledge graph as usual."
        ),
        "citations": [],
        "grounded": False,
        "engine": "deterministic",
        "reason": reason,
    }
