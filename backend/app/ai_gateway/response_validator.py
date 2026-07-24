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


@dataclass
class ValidationResult:
    valid_citations: List[Citation] = field(default_factory=list)
    rejected_citations: List[Citation] = field(default_factory=list)
    grounded: bool = False

    def to_dict(self) -> dict:
        return {
            "grounded": self.grounded,
            "valid_citations": [c.to_dict() for c in self.valid_citations],
            "rejected_citations": [c.to_dict() for c in self.rejected_citations],
        }


class ResponseValidator:
    """Verify AI citations against the deterministic knowledge graph."""

    def __init__(self, knowledge_service):
        self._ks = knowledge_service

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

        for c in citations:
            if self._is_valid(c, covered_entity_ids, neighbor_ids, timeline_ids):
                valid.append(c)
            else:
                rejected.append(c)

        grounded = len(valid) > 0 and len(citations) > 0
        return ValidationResult(
            valid_citations=valid, rejected_citations=rejected, grounded=grounded
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


def _period_label(entry) -> str:
    if not isinstance(entry, dict):
        return "unknown"
    period = entry.get("period")
    if isinstance(period, dict):
        return str(period.get("label") or period.get("value") or "unknown")
    return str(period or "unknown")
