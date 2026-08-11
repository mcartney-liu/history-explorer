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
import re
from typing import Any, Dict, List, Optional, Sequence

from .citation_model import Citation
from .grounding_builder import GroundingBuilder, GroundingResult
from .context_serializer import build_grounding_prompt_segment
from .prompt_service import PromptService
from .provider import get_provider
from .fallback_handler import get_fallback_response
from .response_validator import ResponseValidator

# Instruct the AI to reply with verifiable JSON. Kept here (AI logic in the
# approved module) so M11-1's prompt_service stays unchanged per the plan.
# ADR-0018: `perspectives` is NO LONGER requested from the LLM — dissent is
# derived server-side from the curated `interpretation_note` of the validated
# claims, so an alternative reading is always grounded, never hallucinated.
_CITATION_INSTRUCTION = (
    "\n\nReply ONLY with a JSON object of the form:\n"
    '{"answer": "<your grounded answer>", '
    '"citations": ['
    '{"global_id": "<id>", "kind": "entity|relationship|timeline", '
    '"label": "<short source label>"}]}\n'
    "Every citation.global_id MUST be an entity/relationship/timeline id that "
    "appears in [ALLOWED FACTS]. Do not cite anything absent from the facts."
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


def _perspectives_from_claims(valid_claims: Sequence[Any], limit: int = 3) -> List[str]:
    """Grounded dissent: perspectives built from curated interpretation notes.

    ADR-0018: an "alternative reading" is only trustworthy when a human curator
    wrote it. We therefore read `truth.interpretation_note` off the VALIDATED
    claims instead of asking the LLM for caveats. Contested claims
    (controversy_level medium/high) lead, so genuine scholarly disagreement is
    surfaced first. De-duplicated and bounded; empty when nothing is curated.
    """
    ranked: List[tuple] = []
    seen: set = set()
    for c in valid_claims:
        truth = getattr(c, "truth", None)
        if not isinstance(truth, dict):
            continue
        note = (truth.get("interpretation_note") or "").strip()
        if not note or note in seen:
            continue
        seen.add(note)
        contested = 0 if truth.get("controversy_level") in ("medium", "high") else 1
        ranked.append((contested, getattr(c, "claim_id", "") or "", note))
    ranked.sort(key=lambda x: (x[0], x[1]))
    return [note for _c, _cid, note in ranked[:limit]]


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


def _claim_evidence(valid_claims: Sequence[Any], sources: Sequence[dict]) -> List[dict]:
    """Evidence view of the VALIDATED claims (source grading + truth).

    ADR-0018: the AI answer must carry the graded evidence it was grounded on,
    not just the graph citations. Additive alongside `_build_evidence` items —
    same base shape (global_id / kind / label / status) plus the source title,
    tier and curated truth grading.
    """
    by_id = {s.get("id"): s for s in sources if isinstance(s, dict) and s.get("id")}
    out: List[dict] = []
    for c in valid_claims:
        text = (c.claim_text or "").strip()
        if not text:
            continue
        source = by_id.get(c.source_id) or {}
        out.append(
            {
                "global_id": c.subject_global_id or "",
                "kind": "claim",
                "label": text,
                "status": "verified",
                "claim_id": c.claim_id,
                "source_id": c.source_id,
                "source_title": source.get("title") or "",
                "source_tier": source.get("tier") or "",
                "truth": dict(c.truth) if getattr(c, "truth", None) else None,
            }
        )
    return out


def _claim_facts(valid_claims: Sequence[Any], sources: Sequence[dict]) -> List[str]:
    """[ALLOWED FACTS] lines built from the validated claims.

    Each line carries the claim text plus its source title and tier, so the
    model sees WHICH evidence backs a statement and how strong it is — the
    Truth layer reaching the prompt instead of being bypassed (ADR-0018).
    """
    by_id = {s.get("id"): s for s in sources if isinstance(s, dict) and s.get("id")}
    out: List[str] = []
    for c in valid_claims:
        text = (c.claim_text or "").strip()
        if not text:
            continue
        source = by_id.get(c.source_id) or {}
        title = source.get("title") or c.source_id or "uncited"
        tier = source.get("tier") or "unknown"
        out.append("Evidence [source: %s | tier: %s] %s" % (title, tier, text))
    return out


def _run_phase2(builder, context, visited=None, package_context=None):
    """Run the Phase2 grounding pipeline over the first context entity.

    ClaimGraph -> EvidenceSelector -> EvidenceValidator -> plan_exploration.
    Returns (valid_claims, sources, next_exploration), or None when there is
    nothing validated to work with (empty context / unknown focus / no
    evidence). Shared by BOTH the deterministic path and the AI path — before
    ADR-0018 the AI path skipped this entirely and lost the Truth layer.

    Defensive: any pipeline failure (e.g. a KnowledgeService lacking the Phase2
    methods) returns None so the caller degrades gracefully — never 500.
    """
    from .citation_model import ClaimGraph
    from .exploration_planner import plan_exploration
    from .grounding_builder import EvidenceSelector
    from .response_validator import EvidenceValidator

    if not context:
        return None

    try:
        graph = builder.build_claim_graph(context[0])
        selection = EvidenceSelector().select(graph)
        result = EvidenceValidator().validate(selection)
    except Exception:
        return None

    if not result.passed or not result.valid_claims:
        return None

    narrowed = ClaimGraph(
        focus_global_id=graph.focus_global_id,
        neighbors=graph.neighbors,
        claims=list(result.valid_claims),
        sources=list(selection.sources),
    )
    next_exploration = plan_exploration(
        narrowed,
        visited=visited,
        package_context=package_context,
        limit=3,
    )
    return list(result.valid_claims), list(selection.sources), next_exploration


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


def _clean_llm_text(raw: str) -> str:
    """Normalize an unparsable LLM reply into readable plain text.

    Strips markdown fences / code-block markers and collapses whitespace so
    the frontend never has to render raw ```json ... ``` blocks or stray
    markdown symbols (2026-08-11 PO, unstable-LLM-output guard).
    """
    if not raw:
        return raw
    text = raw.strip()
    # Strip a single markdown fence (opening, optional language tag, closing).
    if text.startswith("```"):
        text = re.sub(r"^```[a-zA-Z0-9_-]*\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    # Collapse 3+ blank lines and trim trailing markers.
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _deterministic_grounded_response(builder, question, context, mode, visited=None, package_context=None):
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
      - next_exploration comes from the Exploration Planner (M74-004-002):
        evidence-bound, self-free (P7 fix), visited-aware (P2), with a
        deterministic reason — restricted to the validated claim subset.
    """
    phase2 = _run_phase2(builder, context, visited, package_context)
    if phase2 is None:
        return None
    valid_claims, _sources, next_exploration = phase2

    # --- deterministic renderer: answer strictly from validated claim text ---
    seen: set = set()
    claim_texts: List[str] = []
    for c in valid_claims:
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
    for c in valid_claims:
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
    confidence = _compute_confidence(grounded, valid, len(valid_claims))

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
    visited: Optional[Sequence[str]] = None,
    package_context: Optional[str] = None,
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

    M74-004-002 (additive): `visited` (already-explored entity ids) and
    `package_context` are exploration-state inputs for the Exploration
    Planner — the frontend only supplies id lists, never facts.
    """
    question = (question or "").strip()
    context = [g for g in (context_global_ids or []) if isinstance(g, str)]

    builder = GroundingBuilder(knowledge_service)

    # 2026-08-11 (PO)：探索建议（explain + 固定 question "探索建议"）前端只
    # 消费确定性 next_exploration / evidence（RelationshipInsight /
    # ExplorationSuggestions 均不渲染 AI answer）——直接走确定性流水线并
    # 跳过 AI 调用：页面秒开、不烧 token、推荐内容稳定。
    # 该分支在 provider 判断之前，AI 开启时同样跳过（answer 无人消费）。
    if mode == "explain" and question == "探索建议":
        deterministic = _deterministic_grounded_response(
            builder, question, context, mode, visited, package_context
        )
        if deterministic is not None:
            return deterministic

    # M74-003 (C2): Runtime OFF branch — Phase2 pipeline deterministic grounded.
    provider = get_provider()
    if provider is None:
        deterministic = _deterministic_grounded_response(
            builder, question, context, mode, visited, package_context
        )
        if deterministic is not None:
            return deterministic
        return _with_echo(get_fallback_response(reason="ai_unavailable"), question, context, mode)

    grounding: GroundingResult = builder.build(context, question)

    # AI disabled / empty facts -> deterministic fallback.
    if not grounding.facts:
        return _with_echo(get_fallback_response(reason="no_grounding_context"), question, context, mode)

    # ADR-0018: the AI path now runs Phase2 too. The validated claims feed the
    # prompt as graded evidence, and their exploration plan / truth grading is
    # merged into the response — previously this whole layer was bypassed.
    phase2 = _run_phase2(builder, context, visited, package_context)
    valid_claims, claim_sources, next_exploration = phase2 or ([], [], [])

    facts = list(grounding.facts) + _claim_facts(valid_claims, claim_sources)

    prompt_service = PromptService()
    user_prompt = prompt_service.user_prompt(question, facts) + _CITATION_INSTRUCTION

    try:
        raw = provider.complete(
            prompt_service.system_prompt(mode), user_prompt, max_tokens=800
        )
    except Exception:
        # Provider failure / timeout -> graceful deterministic fallback.
        return _with_echo(
            get_fallback_response(reason="provider_error"), question, context, mode
        )

    parsed = _parse_ai_json(raw)
    if parsed is None:
        # Could not verify citations -> return the cleaned raw answer but flag
        # ungrounded. 2026-08-11 (PO): strip markdown fences / excessive
        # whitespace so an unstable LLM reply never surfaces as raw code blocks
        # in the UI (previously raw was passed through verbatim).
        return {
            "answer": _clean_llm_text(raw),
            "perspectives": _perspectives_from_claims(valid_claims),
            "evidence": _claim_evidence(valid_claims, claim_sources),
            "confidence": "low",
            "citations": [],
            "rejected_citations": [],
            "grounded": False,
            "engine": "ai_unverified",
            "next_exploration": next_exploration,
            "question": question,
            "context_global_ids": context,
            "mode": mode,
        }

    answer = parsed.get("answer", "")
    if isinstance(answer, (dict, list)):
        # Structured synthesis (e.g. cross-dimensional analysis) — serialize as
        # valid JSON so the frontend can render it instead of a str() dict dump.
        answer = json.dumps(answer, ensure_ascii=False)
    elif not isinstance(answer, str):
        answer = str(answer)

    ai_citations: List[Citation] = []
    for c in parsed.get("citations", []) or []:
        try:
            ai_citations.append(Citation.from_dict(c))
        except Exception:
            # Malformed citation dict -> rejected, never crash.
            continue

    validator = ResponseValidator(knowledge_service)
    # ADR-0018 fix: validate against the grounding's expanded scope (roots +
    # bridge entities), not the raw context — otherwise every legitimate 2-hop
    # citation the prompt was grounded on is rejected.
    result = validator.validate(
        ai_citations, grounding.expanded_global_ids or context
    )

    valid = len(result.valid_citations)
    total = len(ai_citations)
    return {
        "answer": answer,
        "perspectives": _perspectives_from_claims(valid_claims),
        "evidence": _build_evidence(result.valid_citations)
        + _claim_evidence(valid_claims, claim_sources),
        "confidence": _compute_confidence(result.grounded, valid, total),
        "citations": [c.to_dict() for c in result.valid_citations],
        "rejected_citations": [c.to_dict() for c in result.rejected_citations],
        "grounded": result.grounded,
        "engine": "ai",
        "next_exploration": next_exploration,
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
