"""M77-A Military History Ontology (framework-validation example).

Minimal SECOND-domain Ontology used ONLY to prove the M76-extracted Ontology +
Adapter Framework supports non-invasive second-domain extension.

This is a framework-validation example, NOT a real Military knowledge model:
- Does NOT expand to the Global Schema Constraint Baseline (8/18) - that is M78.
- Does NOT add causal dimensions (Cause/Mechanism/Consequence/...) - that is M79.
- Does NOT modify HISTORY_ONTOLOGY.

The Ontology is deliberately distinct from HISTORY_ONTOLOGY (6/5) to demonstrate
that a Domain Ontology may own a domain-specific schema (M77 SC#6a: "Domain
Ontology 可以拥有领域特定 schema").
"""
from __future__ import annotations

from .ontology import Ontology

# Minimal, domain-specific Military History example ontology.
MILITARY_HISTORY_ONTOLOGY = Ontology(
    entity_types=("commander", "unit", "battle", "front", "doctrine"),
    relationship_types=("commanded", "fought_in", "outflanked", "part_of", "preceded_by"),
)
