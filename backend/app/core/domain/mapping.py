"""Ontology Mapping Contract — M80-B2 (Domain Governance Layer).

Declarative equivalence-translation contract between per-Domain local relation
types and the Global Ontology (HISTORY_ONTOLOGY). Lives in the Domain Governance
Layer (NOT a specific Domain Layer). See ADR-M80-MAP.

Hard red lines (enforced by design, never bypassed):
- Does NOT modify ENTITY_TYPES / RELATIONSHIP_TYPES freeze baseline.
- Does NOT expand the 20 relationship white-list (18 baseline + ADR-0019).
- Does NOT bind RELATIONSHIP_MEANING (runtime weighting, DB-B04 out of scope).
- Does NOT wire into Acquisition pipeline / Graph runtime / Causal / Engine.
- No AI / LLM inference.

This module is a CONTRACT SKELETON: the registry and three-state resolver are
defined; concrete mapping entries are registered declaratively via
``register_mapping`` and validated against provenance + drift guard.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

# READ-ONLY reference to the M3.5 Schema Freeze baseline. Imported but NEVER
# mutated (M80-B2 red line: do NOT modify validation.py / RELATIONSHIP_TYPES).
from ...validation import RELATIONSHIP_TYPES as _FREEZE_RELATIONSHIP_TYPES


class MappingState(str, Enum):
    """Three-state Mapping result (ADR-M80-MAP §Three-State Mapping)."""

    MAPPED = "MAPPED"
    PARTIAL = "PARTIAL"
    UNMAPPED = "UNMAPPED"


@dataclass(frozen=True)
class SemanticProvenance:
    """Provenance retained for every mapping (ADR-M80-MAP §Semantic Provenance).

    - ontology_origin: global ontology semantic anchor (e.g. "part_of").
    - source_relation_type: original local relation type being mapped.
    """

    ontology_origin: str
    source_relation_type: str
    mapping_id: str
    declared_at: str
    governance_layer_version: str = "M80-B"


@dataclass
class MappingResult:
    """Outcome of resolving a local relation type through the contract."""

    state: MappingState
    provenance: SemanticProvenance
    # For PARTIAL: human-readable note on the untranslatable aspect.
    untranslatable_aspect: str | None = None
    # For MAPPED: the resolved global relation type (must be in white-list).
    resolved_relation_type: str | None = None


# Frozen global relationship vocabulary (M3.5 Schema Freeze, 20 entries — ADR-0019).
# This is the ONLY set a MAPPED contract may resolve into to be admissible to
# GlobalGraph. READ-ONLY: imported from validation, never reassigned here.
_GLOBAL_RELATION_WHITELIST: frozenset[str] = _FREEZE_RELATIONSHIP_TYPES

# In-memory contract registry: source_relation_type -> provenance + target.
_CONTRACTS: dict[str, tuple[SemanticProvenance, str | None, str | None]] = {}


def register_mapping(
    source_relation_type: str,
    ontology_origin: str,
    mapping_id: str,
    declared_at: str,
    resolved_relation_type: str | None = None,
    untranslatable_aspect: str | None = None,
) -> MappingResult:
    """Declare a mapping contract for a local relation type.

    Three-state derivation:
    - MAPPED: resolved_relation_type provided AND in the global white-list.
    - PARTIAL: resolved_relation_type provided but NOT in white-list, OR only
      partially mappable (untranslatable_aspect set).
    - UNMAPPED: no resolved_relation_type and no aspect -> retained in Domain.

    Drift guard: a MAPPED contract whose resolved target is NOT in the frozen
    white-list is downgraded to PARTIAL (never silently expands the list).
    """
    prov = SemanticProvenance(
        ontology_origin=ontology_origin,
        source_relation_type=source_relation_type,
        mapping_id=mapping_id,
        declared_at=declared_at,
    )

    if resolved_relation_type is None and untranslatable_aspect is None:
        state = MappingState.UNMAPPED
    elif resolved_relation_type is not None and (
        resolved_relation_type not in _GLOBAL_RELATION_WHITELIST
    ):
        # Drift guard: cannot legitimately MAPPED to a non-white-list target.
        state = MappingState.PARTIAL
        untranslatable_aspect = (
            untranslatable_aspect
            or f"resolved target '{resolved_relation_type}' not in frozen white-list"
        )
    elif resolved_relation_type is not None:
        state = MappingState.MAPPED
    else:
        state = MappingState.PARTIAL

    _CONTRACTS[source_relation_type] = (
        prov,
        resolved_relation_type,
        untranslatable_aspect,
    )
    return MappingResult(
        state=state,
        provenance=prov,
        untranslatable_aspect=untranslatable_aspect,
        resolved_relation_type=(
            resolved_relation_type if state == MappingState.MAPPED else None
        ),
    )


def resolve(source_relation_type: str) -> MappingResult | None:
    """Resolve a previously-registered local relation type to its MappingResult.

    Returns None if no contract is declared (caller MUST treat as UNMAPPED and
    keep the relation inside Domain Record only).
    """
    entry = _CONTRACTS.get(source_relation_type)
    if entry is None:
        return None
    prov, resolved, aspect = entry
    if resolved is not None and resolved in _GLOBAL_RELATION_WHITELIST:
        state = MappingState.MAPPED
    elif resolved is not None:
        state = MappingState.PARTIAL
    elif aspect is not None:
        state = MappingState.PARTIAL
    else:
        state = MappingState.UNMAPPED
    return MappingResult(
        state=state,
        provenance=prov,
        untranslatable_aspect=aspect,
        resolved_relation_type=resolved if state == MappingState.MAPPED else None,
    )


def is_registered(source_relation_type: str) -> bool:
    return source_relation_type in _CONTRACTS


def registered_sources() -> list[str]:
    return list(_CONTRACTS.keys())


def white_list() -> tuple[str, ...]:
    """Expose the frozen white-list as READ-ONLY (no mutation API)."""
    return tuple(_GLOBAL_RELATION_WHITELIST)


__all__ = [
    "MappingState",
    "SemanticProvenance",
    "MappingResult",
    "register_mapping",
    "resolve",
    "is_registered",
    "registered_sources",
    "white_list",
]
