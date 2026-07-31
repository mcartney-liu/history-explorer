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
# M36.0 adds an OPTIONAL `perspectives` array (alternative interpretations /
# caveats) — purely additive; the grounding contract from ADR-0003 is unchanged.
_CITATION_INSTRUCTION = (
    "\n\nReply ONLY with a JSON object of the form:\n"
    '{"answer": "<your grounded answer>", '
    '"perspectives": ["<optional alternative interpretation or caveat>", "..."], '
    '"citations": ['
    '{"global_id": "<id>", "kind": "entity|relationship|timeline", '
    '"label": "<short source label>"}]}\n'
    "Every citation.global_id MUST be an entity/relationship/timeline id that "
    "appears in [ALLOWED FACTS]. Do not cite anything absent from the facts. "
    "Keep `perspectives` short (1-3 items) and only when genuinely useful; "
    "otherwise return an empty list."
)

# M36.0 AI Response Contract: server-computed confidence. Never trust the LLM
# to self-rate; derive it from the deterministic validation result so the
# number is reproducible and freeze-safe.
def _compute_confidence(grounded: bool, valid: int, total: int) -> str:
    """Map validation outcome to high/medium/low.

    Fully-grounded (all cited ids resolved) → high (ratio ≈ 1.0).
    Partial grounding with ≥50% valid → medium. Otherwise → low.
    Zero citations or zero valid → low to avoid false confidence.
    """
    if total <= 0 or valid <= 0:
        return "low"
    if grounded:
        return "high"
    ratio = valid / total
    if ratio >= 0.5:
        return "medium"
    return "low"


def _extract_perspectives(parsed: dict) -> List[str]:
    """Pull the LLM-supplied perspectives list, coercing to clean strings."""
    raw = parsed.get("perspectives") or []
    if not isinstance(raw, list):
        return []
    out: List[str] = []
    for item in raw:
        if isinstance(item, str) and item.strip():
            out.append(item.strip())
        elif isinstance(item, (int, float)):
            out.append(str(item))
    return out


def _build_evidence(valid_citations: Sequence[Citation]) -> List[dict]:
    """Re-map verified citations into an `evidence` contract view.

    Semantically: the verified facts that back the answer. Additive alongside
    `citations` (raw list); `status: verified` signals graph-confirmation to
    the frontend without altering the frozen citation model.
    """
    return [
        {
            "global_id": c.global_id,
            "kind": c.kind,
            "label": c.label,
            "status": "verified",
        }
        for c in valid_citations
    ]


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


def _deterministic_grounded_response(builder, question, context, mode):
    """Runtime OFF: Phase2 pipeline-driven deterministic grounded response.

    context_global_ids -> ClaimGraph -> EvidenceSelection -> EvidenceValidation
    -> deterministic renderer. Returns None when there is nothing valid to
    render (empty context / no validated evidence) — the caller then falls
    back to the unavailable placeholder (never crash, never guess).

    Strictly grounded:
      - answer text is built ONLY from validated claim text (claim data
        itself, not invented); the prefix labels it as evidence-based, never
        as AI-generated (PO Condition 3).
      - evidence/citations come from the validated claims (status: verified).
      - next_exploration comes from the C1 evidence-bound derivation,
        restricted to the validated claim subset.
    """
    from .citation_model import ClaimGraph
    from .grounding_builder import EvidenceSelector, derive_next_exploration
    from .response_validator import EvidenceValidator

    if not context:
        return None

    try:
        graph = builder.build_claim_graph(context[0])
        selection = EvidenceSelector().select(graph)
        result = EvidenceValidator().validate(selection)
    except Exception:
        # Defensive: any pipeline failure (e.g. a KS lacking Phase2 methods)
        # must degrade to the unavailable fallback — never 500, never guess.
        return None

    if not result.passed or not result.valid_claims:
        return None

    # --- deterministic renderer: answer strictly from validated claim text ---
    seen: set = set()
    claim_texts: List[str] = []
    for c in result.valid_claims:
        text = (c.claim_text or "").strip()
        if text and text not in seen:
            seen.add(text)
            claim_texts.append(text)
    if claim_texts:
        answer = "基于知识库证据：" + "；".join(claim_texts[:3])
    else:
        answer = "该主题暂无可用知识库证据展示。"

    # --- citations / evidence bound to the focus (validated claims only) ---
    citations: List[Citation] = []
    for c in result.valid_claims:
        if c.subject_global_id:
            citations.append(
                Citation(
                    global_id=c.subject_global_id,
                    kind="entity",
                    label=c.subject or c.subject_global_id,
                )
            )

    valid = len(citations)
    grounded = valid > 0
    confidence = _compute_confidence(grounded, valid, len(result.valid_claims))

    # --- next_exploration restricted to the validated claim subset (C1) ---
    narrowed = ClaimGraph(
        focus_global_id=graph.focus_global_id,
        neighbors=graph.neighbors,
        claims=list(result.valid_claims),
        sources=list(selection.sources),
    )
    next_exploration = derive_next_exploration(narrowed, limit=3)

    payload = {
        "answer": answer,
        "perspectives": [],
        "evidence": _build_evidence(citations),
        "confidence": confidence,
        "citations": [c.to_dict() for c in citations],
        "rejected_citations": [],
        "grounded": grounded,
        "engine": "deterministic",
        "next_exploration": next_exploration,
    }
    return _with_echo(payload, question, context, mode)


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

    M74-003 (C2): with the Runtime OFF (no provider configured) the endpoint no
    longer returns a bare "unavailable" placeholder for a valid context — it
    runs the Phase2 pipeline (ClaimGraph -> EvidenceSelection ->
    EvidenceValidation) and renders a deterministic grounded response. The
    answer text is built ONLY from validated claim text (never invented facts)
    and next_exploration comes from the evidence-bound derivation (C1).
    engine stays "deterministic": this output is explicitly NOT presented as
    AI-generated (PO Condition 3).
    """
    question = (question or "").strip()
    context = [g for g in (context_global_ids or []) if isinstance(g, str)]

    builder = GroundingBuilder(knowledge_service)

    # M74-003 (C2): Runtime OFF branch — Phase2 pipeline deterministic grounded.
    provider = get_provider()
    if provider is None:
        deterministic = _deterministic_grounded_response(builder, question, context, mode)
        if deterministic is not None:
            return deterministic
        return _with_echo(get_fallback_response(reason="ai_unavailable"), question, context, mode)

    grounding: GroundingResult = builder.build(context, question)

    # AI disabled / empty facts -> deterministic fallback.
    if not grounding.facts:
        return _with_echo(get_fallback_response(reason="no_grounding_context"), question, context, mode)

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
            "perspectives": [],
            "evidence": [],
            "confidence": "low",
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

    valid = len(result.valid_citations)
    total = len(ai_citations)
    return {
        "answer": answer,
        "perspectives": _extract_perspectives(parsed),
        "evidence": _build_evidence(result.valid_citations),
        "confidence": _compute_confidence(result.grounded, valid, total),
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
    # M36.0 contract: deterministic path has no AI-verified evidence, so the
    # additive fields default to empty/low to keep the frontend contract whole.
    out.setdefault("perspectives", [])
    out.setdefault("evidence", [])
    out.setdefault("confidence", "low")
    out["question"] = question
    out["context_global_ids"] = context
    out["mode"] = mode
    return out
