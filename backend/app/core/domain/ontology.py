"""Standalone Ontology - M76-C1 Extraction.

Strongly-typed Knowledge Model carrier (frozen dataclass, Tuple-based).
Replaces the previously-inline entity_types/relationship_types that lived inside
DomainMetadata (adapter.py). This module is the single source of truth for the
History Explorer ontology, referenced by future domains instead of copying schema.

M76-C1 Revised Planning constraints:
- NOT a dict (strongly typed frozen dataclass)
- NOT a List (uses Tuple[str, ...])
- Immutable by design (frozen=True)
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Tuple


@dataclass(frozen=True)
class Ontology:
    """Immutable Knowledge Model carrier.

    Uses Tuple[str, ...] instead of dict / List per M76-C1 Revised Planning.
    Once created, entity_types / relationship_types cannot be reassigned.
    """

    entity_types: Tuple[str, ...]
    relationship_types: Tuple[str, ...]


HISTORY_ONTOLOGY = Ontology(
    entity_types=("person", "place", "event", "organization", "period", "civilization"),
    relationship_types=("born_in", "ruled_in", "influenced_by", "part_of", "preceded_by"),
)

__all__ = ["Ontology", "HISTORY_ONTOLOGY"]
