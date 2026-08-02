"""M78.3 Domain Contract Enforcement — automatic verification of ADR-M78-SB.

Enforces ADR-M78-SB WITHOUT coupling Ontology to the Global Schema Constraint
Baseline (8/18 in app/validation). Asserts SINGLE-SOURCE-OF-TRUTH (T1) and
ISOLATION (T2/T3), never enum equality.
"""
from __future__ import annotations

from pathlib import Path

from app.core.acquisition.pipeline import AcquisitionPipeline
from app.core.domain.ontology import HISTORY_ONTOLOGY
from app.core.domain.registry import AdapterRegistry
from app.validation import ENTITY_TYPES, RELATIONSHIP_TYPES

_DATA_DIR = Path(__file__).resolve().parents[2] / "data" / "history"


def test_domain_schema_fields_follow_ontology_contract():
    """T1 — Single Source of Truth.

    The DomainSchema produced by the acquisition pipeline must INCLUDE the
    vocabulary derived from the domain Ontology (entity_types and
    relationship_types). Extra source fields are allowed, so this asserts a
    superset, not strict equality.
    """
    schema = AcquisitionPipeline("history", _DATA_DIR).run().schema
    ontology = AdapterRegistry.get("history").get_metadata().ontology
    assert set(schema.fields).issuperset(set(ontology.entity_types))
    assert set(schema.fields).issuperset(set(ontology.relationship_types))


def test_ontology_remains_vocabulary_only():
    """T2 — Ontology stays a pure vocabulary carrier.

    It must not grow validation / causal / inference rule surfaces that would
    pollute the domain model. This pre-empts the M79 causal path.
    """
    assert not hasattr(HISTORY_ONTOLOGY, "validation_rules")
    assert not hasattr(HISTORY_ONTOLOGY, "causal_rules")
    assert not hasattr(HISTORY_ONTOLOGY, "inference_rules")


def test_global_constraint_is_not_embedded_in_ontology():
    """T3 — Isolation: Ontology must NOT embed the Global Schema Constraint.

    Forbids the coupling direction  Ontology ──▶ Global Schema Constraint
    (app/validation ENTITY_TYPES / RELATIONSHIP_TYPES — the 8/18 baseline).

    An object-identity check (`is not`) cannot catch real coupling: the
    ontology is always a distinct object. The actual risk is someone
    populating the ontology fields with the global frozensets directly, e.g.
        Ontology(entity_types=ENTITY_TYPES,
                  relationship_types=RELATIONSHIP_TYPES)
    We therefore assert that NO field value aliases either global frozenset,
    plus a cheap guard against an explicit cross-reference attribute.
    """
    for field_name in HISTORY_ONTOLOGY.__dataclass_fields__:
        value = getattr(HISTORY_ONTOLOGY, field_name)
        assert value is not ENTITY_TYPES
        assert value is not RELATIONSHIP_TYPES
    assert not hasattr(HISTORY_ONTOLOGY, "global_schema_ref")
