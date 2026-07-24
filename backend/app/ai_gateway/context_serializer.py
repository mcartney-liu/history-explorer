"""Context Serializer (M11-2).

Transforms a `GroundingResult` into the `[ALLOWED FACTS]` text segment that the
prompt service feeds to the AI. It NEVER adds external knowledge — it only
re-emits the facts the GroundingBuilder assembled from the deterministic graph.
"""
from __future__ import annotations

from typing import List

from .grounding_builder import GroundingResult
from .prompt_service import build_grounding_section


def serialize_facts(result: GroundingResult) -> List[str]:
    """Return a defensive copy of the fact strings. Pure projection."""
    return list(result.facts)


def build_grounding_prompt_segment(result: GroundingResult) -> str:
    """Render GroundingResult as the [ALLOWED FACTS] section for the prompt.

    Reuses the existing prompt_service.build_grounding_section so the segment
    shape stays identical to the one M11-1 already produces. No external
    knowledge is injected — only the facts from the deterministic graph.
    """
    return build_grounding_section(result.facts)


def to_grounding_context(result: GroundingResult) -> dict:
    """A JSON-safe structured view carrying both the facts text and the
    citation list (so a caller can validate the AI response later).
    """
    return {
        "facts": list(result.facts),
        "citations": [c.to_dict() for c in result.citations],
    }
