"""M85 CausalObject — CausalStatement 超集 with Semantic Relationships.

CausalObject extends CausalStatement with exploration context:
- related_entities: additional KG Entity GIDs relevant to this explanation
- exploration_paths: recommended exploration paths from this object
- related_causal_objects: curator-authored semantic links to other CausalObjects (M85)

It is a Semantic Object (interpretive layer), NOT a Knowledge Graph mutation.
Per ADR-M79 / M82 / M84 / M85 Architecture Gate:
- Must never import graph.py
- Must never write to KG
- Must never contain AI-generated content
- Must never perform graph traversal / ranking / recommendation
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Tuple


@dataclass(frozen=True)
class ExplorationPathRef:
    """A recommended exploration path from a CausalObject."""
    from_gid: str
    to_gid: str
    relationship: str
    label: str

    def to_dict(self) -> dict:
        return {
            "from": self.from_gid,
            "to": self.to_gid,
            "relationship": self.relationship,
            "label": self.label,
        }


@dataclass(frozen=True)
class RelatedCausalObjectRef:
    """M85 — A curator-authored semantic link between two CausalObjects.

    This is NOT a graph edge. It does NOT write to the Knowledge Graph.
    It does NOT participate in any traversal algorithm.
    It is a curator's judgment that understanding Object A helps
    understand Object B — a "why worth reading together" annotation.

    Identity:
      - NOT a KG edge wrapper
      - NOT an AI-generated recommendation
      - NOT a navigation hint
      - IS a human-curated understanding entry point
    """
    target_id: str         # CausalObject ID (e.g. "co-001")
    relation_type: str     # institutional_evolution | technological_chain | civilization_contrast | ideological_influence
    explanation: str       # Curator-authored text explaining the relationship

    def to_dict(self) -> dict:
        return {
            "target_id": self.target_id,
            "relation_type": self.relation_type,
            "explanation": self.explanation,
        }


@dataclass(frozen=True)
class CausalObject:
    """M85 — CausalStatement super-set with exploration context and semantic relationships.

    Inherits all CausalStatement fields (7) unchanged.
    M84 added 3 fields: object_type, related_entities, exploration_paths.
    M85 adds 1 field: related_causal_objects.

    Field count: 11 (fixed for M85 — see M85.1_SEMANTIC_RELATIONSHIP_MODEL_FREEZE.md).
    """
    # === Inherited from CausalStatement (7 fields, unchanged since M82) ===
    id: str
    cause_id: str
    effect_id: str
    mechanism: str | None = None
    consequence: str | None = None
    confidence: str | None = None
    evidence_refs: Tuple[str, ...] = field(default_factory=tuple)

    # === M84 (3 fields) ===
    object_type: str = "causal"
    related_entities: Tuple[str, ...] = field(default_factory=tuple)
    exploration_paths: Tuple[ExplorationPathRef, ...] = field(default_factory=tuple)

    # === M85 (1 field) ===
    related_causal_objects: Tuple[RelatedCausalObjectRef, ...] = field(default_factory=tuple)

    def to_dict(self) -> dict:
        result: dict = {
            "id": self.id,
            "cause_id": self.cause_id,
            "effect_id": self.effect_id,
            "object_type": self.object_type,
        }
        if self.mechanism is not None:
            result["mechanism"] = self.mechanism
        if self.consequence is not None:
            result["consequence"] = self.consequence
        if self.confidence is not None:
            result["confidence"] = self.confidence
        if self.evidence_refs:
            result["evidence_refs"] = list(self.evidence_refs)
        if self.related_entities:
            result["related_entities"] = list(self.related_entities)
        if self.exploration_paths:
            result["exploration_paths"] = [p.to_dict() for p in self.exploration_paths]
        if self.related_causal_objects:
            result["related_causal_objects"] = [r.to_dict() for r in self.related_causal_objects]
        return result
