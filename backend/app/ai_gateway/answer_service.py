"""Grounded Answer Service (M11-2 orchestration).

Ties together the building blocks:
  GroundingBuilder   -> facts + citations (read-only from KnowledgeService)
  context_serializer -> [ALLOWED FACTS] prompt segment
  prompt_service     -> system prompt + user prompt (M11-1, unchanged)
  provider           -> AI completion (M11-1, lazy SDK)
  response_validator -> verify AI citations against the deterministic graph

This is the ONLY place that orchestrates an AI call for M11-2. It lives inside
the approved ai_gateway module, so the freeze-check AI allowance applies. It is
pure: given (question, context_global_ids) it returns a dict; it stores no
state, writes nothing, and never invents facts. main.py only mounts routes that
delegate to `grounded_answer` — keeping main.py as route-mounting-only per the
M11-2 freeze boundary (§5 of the planning doc).
"""
from __future__ import annotations

import json
from typing import Any, Dict, List, Optional, Sequence

from .citation_model import Citation
from .grounding_builder import GroundingBuilder, GroundingResult
from .context_serializer import build_grounding_prompt_segment
from .prompt_service import PromptService, SYSTEM_PROMPT
from .provider import get_provider
from .fallback_handler import get_fallback_response
from .response_validator import ResponseValidator

# Instruct the AI to reply with verifiable JSON. Kept here (AI logic in the
# approved module) so M11-1's prompt_service stays unchanged per the plan.
_CITATION_INSTRUCTION = (
    "\n\nReply ONLY with a JSON object of the form:\n"
    '{"answer": "<your grounded answer>", "citations": ['
    '{"global_id": "<id>", "kind": "entity|relationship|timeline", '
    '"label": "<short source label>"}]}\n'
    "Every citation.global_id MUST be an entity/relationship/timeline id that "
    "appears in [ALLOWED FACTS]. Do not cite anything absent from the facts."
)


def _parse_ai_json(raw: str) -> Optional[Dict[str, Any]]:
    """Best-effort extraction of a JSON object from an AI reply.

    Tollerock markdown code fences and surrounding prose. Returns None when no
    parseable JSON object is found (caller then flags the answer ungrounded).
    """
    if not raw:
        return None
    text = raw.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.lower().startswith("json"):
            text = text[4:]
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return None
    try:
        data = json.loads(text[start : end + 1])
    except (ValueError, TypeError):
        return None
    return data if isinstance(data, dict) else None


def grounded_answer(
    knowledge_service,
    question: str,
    context_global_ids: Sequence[str],
    mode: str = "explain",
) -> Dict[str, Any]:
    """Produce a grounded answer. Pure function of inputs — no state stored.

    Returns a JSON-safe dict. On any AI unavailability/error, returns the
    deterministic fallback (engine="deterministic", HTTP 200). On a successful
    but unverifiable AI reply, returns engine="ai" with grounded reflecting the
    validation result.
    """
    question = (question or "").strip()
    context = [g for g in (context_global_ids or []) if isinstance(g, str)]

    builder = GroundingBuilder(knowledge_service)
    grounding: GroundingResult = builder.build(context, question)

    # No context / AI disabled / empty facts -> deterministic fallback.
    provider = get_provider()
    if provider is None or not grounding.facts:
        reason = "ai_unavailable" if provider is None else "no_grounding_context"
        return _with_echo(get_fallback_response(reason=reason), question, context, mode)

    prompt_service = PromptService()
    user_prompt = prompt_service.user_prompt(question, grounding.facts) + _CITATION_INSTRUCTION

    try:
        raw = provider.complete(SYSTEM_PROMPT, user_prompt, max_tokens=800)
    except Exception:
        # Provider failure / timeout -> graceful deterministic fallback.
        return _with_echo(
            get_fallback_response(reason="provider_error"), question, context, mode
        )

    parsed = _parse_ai_json(raw)
    if parsed is None:
        # Could not verify citations -> return the raw answer but flag ungrounded.
        return {
            "answer": raw,
            "citations": [],
            "rejected_citations": [],
            "grounded": False,
            "engine": "ai_unverified",
            "question": question,
            "context_global_ids": context,
            "mode": mode,
        }

    answer = parsed.get("answer", "")
    if not isinstance(answer, str):
        answer = str(answer)

    ai_citations: List[Citation] = []
    for c in parsed.get("citations", []) or []:
        try:
            ai_citations.append(Citation.from_dict(c))
        except Exception:
            # Malformed citation dict -> rejected, never crash.
            continue

    validator = ResponseValidator(knowledge_service)
    result = validator.validate(ai_citations, context)

    return {
        "answer": answer,
        "citations": [c.to_dict() for c in result.valid_citations],
        "rejected_citations": [c.to_dict() for c in result.rejected_citations],
        "grounded": result.grounded,
        "engine": "ai",
        "question": question,
        "context_global_ids": context,
        "mode": mode,
    }


def _with_echo(
    payload: Dict[str, Any], question: str, context: List[str], mode: str
) -> Dict[str, Any]:
    out = dict(payload)
    out["question"] = question
    out["context_global_ids"] = context
    out["mode"] = mode
    return out
