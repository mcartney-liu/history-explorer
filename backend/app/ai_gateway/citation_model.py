"""Pure data model for AI citations (M11-2).

A `Citation` is a claim by the AI that a specific piece of its answer is
grounded in the deterministic knowledge graph. It carries NO logic, NO I/O,
NO service calls, and NO provider access — it is a plain value object so it
can be serialized, validated, and passed around freely.

The three `kind` values mirror the grounding sources:
- "entity":       cites one entity node (global_id == a GlobalGraph node).
- "relationship": cites a factual edge to a neighbor entity (global_id ==
                  the neighbor's node; the relationship is real in GlobalGraph).
- "timeline":     cites a timeline period/event (global_id is the synthetic
                  timeline id produced by grounding_builder).
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Optional

# The complete, closed set of citation kinds the validator will accept.
ALLOWED_KINDS = ("entity", "relationship", "timeline")


@dataclass
class Citation:
    """A single grounded citation produced by / consumed by the AI layer."""

    global_id: str
    kind: str
    label: str

    def to_dict(self) -> dict:
        return {"global_id": self.global_id, "kind": self.kind, "label": self.label}

    @classmethod
    def from_dict(cls, data: Any) -> "Citation":
        """Parse an AI-supplied citation dict into a Citation.

        Pure marshalling only — NO I/O, NO graph lookup, NO validation against
        the knowledge graph (that is the validator's job). Raises ValueError on
        structurally invalid input so callers can drop malformed citations.
        """
        if not isinstance(data, dict):
            raise ValueError("citation must be a dict")
        gid = data.get("global_id")
        kind = data.get("kind")
        label = data.get("label", "")
        if not isinstance(gid, str) or not gid.strip():
            raise ValueError("citation.global_id is required and must be a string")
        if not isinstance(kind, str) or not kind.strip():
            raise ValueError("citation.kind is required and must be a string")
        return cls(
            global_id=gid.strip(),
            kind=kind.strip(),
            label="" if label is None else str(label),
        )


# ---------------------------------------------------------------------------
# M74 Phase2 (Step 2): relationship-pair (A->B) structured result.
# EvidenceClaim.subject_id may be an "A->B" pair (36 of 76 claims). The
# resolver parses it into this structured object — NEVER a raw string.
# `relationship` is the ACTUAL graph edge type when A-B share an edge in the
# frozen KG, else None (the resolver never guesses an edge).
# `resolved=False` means Grounding Gate Reject (unresolvable side).
# ---------------------------------------------------------------------------

@dataclass
class RelationshipPair:
    subject: str
    object: str
    subject_global_id: Optional[str]
    object_global_id: Optional[str]
    relationship: Optional[str]
    resolved: bool

    def to_dict(self) -> dict:
        return {
            "subject": self.subject,
            "object": self.object,
            "subject_global_id": self.subject_global_id,
            "object_global_id": self.object_global_id,
            "relationship": self.relationship,
            "resolved": self.resolved,
        }


# ---------------------------------------------------------------------------
# M74 Phase2 (Step 3): ClaimGraph — the Runtime's single processing unit.
# Entity-subject claims and relationship-pair claims share ONE ClaimEntry
# model (no dual models): an entity claim is a pair whose object is None.
# `resolved=False` means the claim could not bind (Grounding Gate Reject —
# it is carried but never used as evidence).
# ---------------------------------------------------------------------------

@dataclass
class ClaimEntry:
    claim_id: str
    subject: str
    claim_text: str
    source_id: str
    subject_global_id: Optional[str]
    object_global_id: Optional[str]
    relationship: Optional[str]
    resolved: bool

    def to_dict(self) -> dict:
        return {
            "claim_id": self.claim_id,
            "subject": self.subject,
            "claim_text": self.claim_text,
            "source_id": self.source_id,
            "subject_global_id": self.subject_global_id,
            "object_global_id": self.object_global_id,
            "relationship": self.relationship,
            "resolved": self.resolved,
        }


@dataclass
class ClaimGraph:
    """Lazy-assembled context around ONE focus entity.

    Only what the current Runtime request needs is assembled (never the full
    76-claim set). The GroundingBuilder assembles; Reasoning belongs to a
    later Runtime stage.
    """

    focus_global_id: str
    neighbors: list
    claims: list
    sources: list

    def to_dict(self) -> dict:
        return {
            "focus_global_id": self.focus_global_id,
            "neighbors": list(self.neighbors),
            "claims": [c.to_dict() if hasattr(c, "to_dict") else c for c in self.claims],
            "sources": list(self.sources),
        }


# ---------------------------------------------------------------------------
# M74 Phase2 (Step 4): auditable evidence selection.
# Every input claim yields a SelectionRecord (kept / filtered:<rule>) so the
# selection is explainable — reserved now, rendered/audited by later stages.
# ---------------------------------------------------------------------------

@dataclass
class SelectionRecord:
    claim_id: str
    reason: str  # 'kept' | 'filtered:unresolved' | 'filtered:invalid' | 'filtered:over-cap'
    tier: Optional[str]

    def to_dict(self) -> dict:
        return {"claim_id": self.claim_id, "reason": self.reason, "tier": self.tier}


@dataclass
class EvidenceSelection:
    """Deterministic selection result over a ClaimGraph."""

    claims: list
    sources: list
    records: list

    def to_dict(self) -> dict:
        return {
            "claims": [c.to_dict() if hasattr(c, "to_dict") else c for c in self.claims],
            "sources": list(self.sources),
            "records": [r.to_dict() if hasattr(r, "to_dict") else r for r in self.records],
        }


# ---------------------------------------------------------------------------
# M74 Phase2 (Step 5): output-side Claim/Source binding validation — the
# final Trust Gate. Structured + auditable: every rejected claim carries a
# machine-readable reason.
# ---------------------------------------------------------------------------

# Canonical reject reasons (stable, auditable).
REASON_MISSING_CLAIM = "missing_claim"
REASON_MISSING_SOURCE = "missing_source"
REASON_UNRESOLVED = "unresolved"
REASON_INVALID_BINDING = "invalid_binding"


@dataclass
class ClaimValidationResult:
    """Trust Gate result: claims safe to emit vs rejected (with reasons)."""

    passed: bool
    valid_claims: list
    rejected_claims: list
    reasons: dict  # claim_id -> reason

    def to_dict(self) -> dict:
        return {
            "passed": self.passed,
            "valid_claims": [
                c.to_dict() if hasattr(c, "to_dict") else c for c in self.valid_claims
            ],
            "rejected_claims": [
                c.to_dict() if hasattr(c, "to_dict") else c for c in self.rejected_claims
            ],
            "reasons": dict(self.reasons),
        }
