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
from typing import Any

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
