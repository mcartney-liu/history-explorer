"""M79 Causal Layer — minimal causal semantic model.

`CausalStatement` is a *reference* model. It points at already-existing
entities / events / relationships in the Knowledge Graph via their
identifiers and attaches causal *interpretation* (mechanism, consequence,
confidence, evidence) on top.

It is an interpretive semantic layer, NOT a domain vocabulary extension.
Per ADR-M79 Boundary Rules it must never import the domain / validation /
graph core modules, and must not introduce independent entity vocabulary.

See docs/10_ARCHITECTURE/ADR-M79.md.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Tuple


@dataclass(frozen=True)
class CausalStatement:
    """A single causal assertion expressed as an interpretive semantic layer.

    The cause/effect endpoints reference existing KG identifiers; this model
    does not define new entity or relationship types. Structured causal
    meaning (mechanism / consequence / confidence / evidence) is carried
    alongside the reference, kept separate from the domain vocabulary.
    """

    cause_id: str
    effect_id: str
    mechanism: str | None = None
    consequence: str | None = None
    confidence: float | None = None
    evidence_refs: Tuple[str, ...] = field(default_factory=tuple)
