"""Exploration Planner — backend orchestration of exploration recommendations.

M74-004-002 (Audit D1/D2): the Planner is the orchestration layer ABOVE the
deterministic `derive_next_exploration` kernel. It adds exploration-state
awareness and fixes the P7 self-recommendation defect found in the audit
(14 samples -> 7 self-references, 50%):

  Input:  ClaimGraph + visited + package_context (optional)
  Output: ExplorationRecommendation[] — evidence-bound, self-free,
          visited-aware, with a deterministic reason.

Trust Boundary: the frontend only supplies id lists (visited / package
context); every fact, reason and ordering decision happens here — the
frontend NEVER joins claims/sources or generates reasons.

Phase4 note: `reason` is rendered deterministically from claim text today;
the interface stays stable so a future LLM renderer can replace only the
reason step (S8 renderer plug-in) without touching the pipeline.
"""
from __future__ import annotations

from typing import Optional, Sequence

from .grounding_builder import derive_next_exploration

# Tier ranking for the secondary sort key (primary > academic > reference).
TIER_RANK = {"primary": 0, "academic": 1, "reference": 2}

# Deterministic reason: how much of the first claim's text is surfaced.
_REASON_MAX_CHARS = 60


def _deterministic_reason(claim_text: str, relationship: str) -> str:
    """Build a deterministic, claim-grounded reason.

    Strictly derived from the validated claim text — no invented facts, no
    templates that go beyond the claim's support (Trust Rule 2 / R2).
    """
    text = (claim_text or "").strip()
    if not text:
        return f"与该实体存在「{relationship}」关系（依据知识库证据）。"
    clipped = text if len(text) <= _REASON_MAX_CHARS else text[:_REASON_MAX_CHARS] + "…"
    return f"因为：{clipped}"


class ExplorationPlanner:
    """Deterministic, state-aware recommendation orchestration."""

    def plan(
        self,
        claim_graph,
        visited: Optional[Sequence[str]] = None,
        package_context: Optional[str] = None,
        limit: int = 3,
    ) -> list:
        """Produce evidence-bound recommendations.

        Pipeline:
          1. derive_next_exploration(claim_graph)   — evidence kernel (C1)
          2. P7 fix: drop recommendations whose target IS the focus
          3. P2: drop already-visited targets
          4. deterministic reason from the validated claim text
          5. stable sort: evidence strength desc, tier asc, gid asc
        Pure function — never touches KnowledgeService.
        """
        visited_set = {g for g in (visited or []) if isinstance(g, str)}
        focus = claim_graph.focus_global_id

        candidates = derive_next_exploration(claim_graph, limit=limit * 3)
        kept: list = []
        for rec in candidates:
            if rec["global_id"] == focus:
                continue  # P7: never recommend the focus itself
            if rec["global_id"] in visited_set:
                continue  # P2: already explored — no value in re-suggesting
            kept.append(rec)

        for rec in kept:
            rec["reason"] = _deterministic_reason(
                rec.get("claim_text") or "", rec.get("relationship") or ""
            )

        tier_of = {s.get("id"): s.get("tier") for s in claim_graph.sources if isinstance(s, dict)}
        kept.sort(
            key=lambda r: (
                -len(r.get("claim_ids") or []),
                TIER_RANK.get(tier_of.get(r.get("source_id")), 99),
                r["global_id"],
            )
        )
        return kept[:limit]


def plan_exploration(
    claim_graph,
    visited: Optional[Sequence[str]] = None,
    package_context: Optional[str] = None,
    limit: int = 3,
) -> list:
    """Module-level convenience wrapper (stateless)."""
    return ExplorationPlanner().plan(claim_graph, visited, package_context, limit)
