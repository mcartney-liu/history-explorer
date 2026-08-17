"""Response Validator (M11-2).

After the AI returns an answer + citations, this module verifies that every
citation is actually backed by the deterministic knowledge graph. It is the
enforcement half of ADR-0003's "AI may only consume grounding context" rule.

Checks per citation:
  1. global_id exists (entity node OR synthetic timeline id)
  2. kind matches what the global_id actually is (entity/relationship vs
     timeline)
  3. relationship citation: the cited global_id is a real neighbor edge of a
     context entity (the relationship is resolvable, not fabricated)
  4. timeline citation: the synthetic id resolves to a real timeline entry

Illegal citations are REJECTED (dropped). If ALL citations are illegal, the
answer is marked `grounded=false`. This module NEVER edits the AI's text,
NEVER invents facts, and NEVER writes to the graph.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Sequence, Set

from .citation_model import ALLOWED_KINDS, Citation
from .grounding_builder import timeline_citation_id
from .temporal_gate import DECISION_REJECT, RELATION_TEMPORAL_CLASS, decide


@dataclass
class ValidationResult:
    valid_citations: List[Citation] = field(default_factory=list)
    rejected_citations: List[Citation] = field(default_factory=list)
    grounded: bool = False
    # ADR-0028 (P3, additive): provenance for relationship citations the
    # temporal coherence re-check REJECTED when gating is active (tol
    # configured). Dormant (empty) in production. Audit surface only.
    temporal_rejects: List[dict] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "grounded": self.grounded,
            "valid_citations": [c.to_dict() for c in self.valid_citations],
            "rejected_citations": [c.to_dict() for c in self.rejected_citations],
            "temporal_rejects": list(self.temporal_rejects),
        }


class ResponseValidator:
    """Verify AI citations against the deterministic knowledge graph."""

    def __init__(self, knowledge_service, tuning=None):
        self._ks = knowledge_service
        # ADR-0028 (P3): dormant-by-default temporal coherence re-check. The
        # validator independently re-verifies relationship citations against the
        # Contract §3 gate. Activation requires an explicit `tuning` carrying a
        # configured `tol`; with `tuning=None` (the production default) the check
        # is skipped entirely and validation behaves exactly as before.
        self._tuning = tuning

    def validate(
        self,
        citations: Sequence[Citation],
        context_global_ids: Sequence[str],
    ) -> ValidationResult:
        valid: List[Citation] = []
        rejected: List[Citation] = []

        context = [g for g in (context_global_ids or []) if isinstance(g, str)]

        # Real neighbor ids of every context entity (relationship resolution).
        neighbor_ids: Set[str] = set()
        for gid in context:
            try:
                for nbr in self._ks.global_neighbors(gid, direction="both"):
                    other = nbr.get("global_id")
                    if other:
                        neighbor_ids.add(other)
            except Exception:
                continue

        # Entities actually present in the grounding facts = context roots plus
        # their real neighbors (relationship facts mention them by name).
        covered_entity_ids: Set[str] = set(context) | neighbor_ids

        # Valid synthetic timeline ids across all topics the context touches.
        timeline_ids: Set[str] = set()
        topics: Set[str] = set()
        for gid in context:
            try:
                resolved = self._ks.find_by_global_id(gid)
            except Exception:
                resolved = None
            if resolved is not None:
                topics.add(resolved[0])
        for topic in topics:
            try:
                for entry in self._ks.get_timeline_index(topic):
                    label = _period_label(entry)
                    if label and label != "unknown":
                        timeline_ids.add(timeline_citation_id(topic, label))
            except Exception:
                continue

        temporal_rejects: List[dict] = []

        for c in citations:
            if not self._is_valid(c, covered_entity_ids, neighbor_ids, timeline_ids):
                rejected.append(c)
                continue
            # --- ADR-0028 (P3) temporal coherence re-check (dormant default) ---
            # Defense-in-depth: grounding already filters temporally-incoherent
            # relations, but the validator re-verifies each relationship citation
            # independently. Only the 18 Contract §3 taxonomy types are gated;
            # disputes/reinterprets (ADR-0019) and other non-taxonomy types pass
            # through (D1 pre-filter). Inactive when no tuning/tol is configured.
            if (
                self._tuning is not None
                and self._tuning.tol is not None
                and c.kind == "relationship"
                and c.label in RELATION_TEMPORAL_CLASS
            ):
                if not self._temporally_coherent(c, context):
                    rejected.append(c)
                    temporal_rejects.append(
                        {
                            "global_id": c.global_id,
                            "relationship": c.label,
                            "reason": (
                                "temporal coherence re-check rejected this "
                                "relationship citation (Contract §3 HARD / "
                                "BEFORE_AFTER cross-generation)"
                            ),
                        }
                    )
                    continue
            valid.append(c)

        grounded = len(valid) > 0 and len(citations) > 0
        return ValidationResult(
            valid_citations=valid,
            rejected_citations=rejected,
            grounded=grounded,
            temporal_rejects=temporal_rejects,
        )

    def _is_valid(
        self,
        c: Citation,
        covered_entity_ids: Set[str],
        neighbor_ids: Set[str],
        timeline_ids: Set[str],
    ) -> bool:
        kind = c.kind
        gid = c.global_id
        if kind not in ALLOWED_KINDS:
            return False

        if kind == "timeline":
            # Check #4: must resolve to a real timeline entry.
            return gid in timeline_ids

        if kind == "relationship":
            # Check #2 + #3: must be a real neighbor edge of a context entity.
            return gid in neighbor_ids

        if kind == "entity":
            # Check #1 + #2: an entity node actually present in the facts.
            return gid in covered_entity_ids

        return False

    def _entity_dict(self, global_id):
        """Resolve a global_id to its raw entity dict (index 2 of the
        KnowledgeService (topic, local_id, entity) 3-tuple), or None when
        unknown. Read-only; used by the temporal gate to read intervals.
        """
        if not isinstance(global_id, str) or not global_id:
            return None
        res = self._ks.find_by_global_id(global_id)
        if not res:
            return None
        return res[2] if len(res) >= 3 else None

    def _temporally_coherent(self, c: Citation, context: Sequence[str]) -> bool:
        """True if the citation's relation is temporally coherent with at least
        one context entity. Conservative: a single coherent (source, target)
        pair keeps the citation. Non-taxonomy relations return True (D1
        pre-filter: not gated). Missing entity data never triggers a reject.
        """
        rel_type = c.label
        if rel_type not in RELATION_TEMPORAL_CLASS:
            return True
        target = self._entity_dict(c.global_id)
        if target is None:
            return True
        for src in context:
            src_entity = self._entity_dict(src)
            if src_entity is None:
                continue
            decision = decide(rel_type, src_entity, target, self._tuning.tol)
            if decision.decision != DECISION_REJECT:
                return True
        return False


def _period_label(entry) -> str:
    if not isinstance(entry, dict):
        return "unknown"
    period = entry.get("period")
    if isinstance(period, dict):
        return str(period.get("label") or period.get("value") or "unknown")
    return str(period or "unknown")


# ---------------------------------------------------------------------------
# M74 Phase2 (Step 5): output-side Claim/Source binding Trust Gate.
# Input is the EvidenceSelection (already sourced from a ClaimGraph) — this
# validator NEVER re-queries KnowledgeService and never bypasses selection.
# It independently re-checks every claim (defense in depth — the gate does
# not trust upstream flags):
#
#   Claim exists  AND  Source exists  AND  Evidence binding valid
#   else -> REJECT (never "warn and continue").
#
# Distinguishes: valid grounded / missing_claim / missing_source /
# unresolved / invalid_binding. Structured + auditable result.
# ---------------------------------------------------------------------------

class EvidenceValidator:
    """Final Trust Gate over a selected EvidenceSelection."""

    def validate(self, selection) -> "ClaimValidationResult":
        from .citation_model import (
            ClaimValidationResult,
            REASON_INVALID_BINDING,
            REASON_MISSING_CLAIM,
            REASON_MISSING_SOURCE,
            REASON_UNRESOLVED,
        )

        source_ids = {s.get("id") for s in selection.sources if s.get("id")}
        valid: list = []
        rejected: list = []
        reasons: dict = {}

        for claim in selection.claims:
            # 1) unresolved — Grounding Gate (independent re-check)
            if not claim.resolved:
                rejected.append(claim)
                reasons[claim.claim_id or "<no-id>"] = REASON_UNRESOLVED
                continue
            # 2) Claim exists
            if not claim.claim_id:
                rejected.append(claim)
                reasons["<no-id>"] = REASON_MISSING_CLAIM
                continue
            # 3) Source exists (must be in the selection's source set)
            if not claim.source_id or claim.source_id not in source_ids:
                rejected.append(claim)
                reasons[claim.claim_id] = REASON_MISSING_SOURCE
                continue
            # 4) Evidence binding valid:
            #    entity claim -> subject_global_id required, object must be None
            #    pair claim    -> subject_global_id AND object_global_id required
            if not claim.subject_global_id:
                rejected.append(claim)
                reasons[claim.claim_id] = REASON_INVALID_BINDING
                continue
            if (claim.object_global_id is None) != (claim.relationship is None):
                # entity claim with a relationship, or pair claim without one —
                # inconsistent binding shape.
                rejected.append(claim)
                reasons[claim.claim_id] = REASON_INVALID_BINDING
                continue
            valid.append(claim)

        return ClaimValidationResult(
            passed=len(valid) > 0,
            valid_claims=valid,
            rejected_claims=rejected,
            reasons=reasons,
        )
