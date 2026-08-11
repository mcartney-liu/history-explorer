"""M80-B2 Ontology Mapping Contract tests (ADR-M80-MAP / ADR-M80-RC).

Lives INSIDE backend/app/core/domain/ (Domain Governance Layer) so it falls
under the M78-FR SCOPE_ALLOWLIST directory prefix — architecture conforms to
the governance boundary rather than the check being altered.

Verifies the mapping contract skeleton: three-state resolution, semantic
provenance, drift guard, and the hard constraint that the frozen white-list is
never expanded.

Does NOT touch validation.py, ENTITY_TYPES, RELATIONSHIP_TYPES, runtime,
Acquisition pipeline, Causal, or Exploration Engine. No AI/LLM.
"""

from __future__ import annotations

import pytest

from .mapping import (
    MappingState,
    SemanticProvenance,
    register_mapping,
    resolve,
    is_registered,
    registered_sources,
    white_list,
)


_DECLARED = "2026-08-02"


@pytest.fixture(autouse=True)
def _isolate_contracts(monkeypatch):
    """Snapshot/restore the in-module contract registry between tests."""
    from . import mapping as m

    snapshot = dict(m._CONTRACTS)
    yield
    m._CONTRACTS.clear()
    m._CONTRACTS.update(snapshot)


def test_mc1_white_list_is_frozen_mirror():
    """white_list() mirrors the M3.5 Freeze baseline (validation.RELATIONSHIP_TYPES).

    The Freeze 18-set (M1/M2 vocabulary: caused/influenced/part_of/ruled/...)
    is the ONLY admissible set for a MAPPED contract. Local ontology names such
    as born_in / ruled_in are NOT in this frozen set.
    """
    from ...validation import RELATIONSHIP_TYPES

    assert set(white_list()) == set(RELATIONSHIP_TYPES)
    assert len(white_list()) == 20  # M3.5 baseline + ADR-0019 disputes/reinterprets
    assert "part_of" in white_list()
    assert "ruled" in white_list()
    # born_in / ruled_in are local types NOT in the frozen white-list.
    assert "born_in" not in white_list()
    assert "ruled_in" not in white_list()


def test_mc2_mapped_state_resolves_to_whitelist_target():
    """A local type mapped to an in-white-list global relation yields MAPPED."""
    res = register_mapping(
        source_relation_type="located_in",
        ontology_origin="part_of",
        mapping_id="map-located-in",
        declared_at=_DECLARED,
        resolved_relation_type="part_of",
    )
    assert res.state == MappingState.MAPPED
    assert res.resolved_relation_type == "part_of"
    assert isinstance(res.provenance, SemanticProvenance)
    assert res.provenance.source_relation_type == "located_in"
    assert res.provenance.ontology_origin == "part_of"
    out = resolve("located_in")
    assert out is not None
    assert out.state == MappingState.MAPPED


def test_mc3_unmapped_state_retained():
    """No target and no aspect => UNMAPPED; relation stays in Domain only."""
    res = register_mapping(
        source_relation_type="born_in",
        ontology_origin="<none>",
        mapping_id="map-born-in",
        declared_at=_DECLARED,
    )
    assert res.state == MappingState.UNMAPPED
    assert res.resolved_relation_type is None
    out = resolve("born_in")
    assert out is not None
    assert out.state == MappingState.UNMAPPED


def test_mc4_partial_state_annotated():
    """Only partial semantics mappable => PARTIAL with untranslatable aspect."""
    res = register_mapping(
        source_relation_type="ruled_in",
        ontology_origin="part_of",
        mapping_id="map-ruled-in",
        declared_at=_DECLARED,
        untranslatable_aspect="temporal sovereignty not expressible in part_of",
    )
    assert res.state == MappingState.PARTIAL
    assert res.untranslatable_aspect is not None
    out = resolve("ruled_in")
    assert out is not None
    assert out.state == MappingState.PARTIAL


def test_mc5_drift_guard_blocks_whitelist_expansion():
    """Resolving to a NON-white-list target is downgraded to PARTIAL, never MAPPED."""
    res = register_mapping(
        source_relation_type="custom_rel",
        ontology_origin="<unknown>",
        mapping_id="map-custom",
        declared_at=_DECLARED,
        resolved_relation_type="not_a_real_global_rel",
    )
    # Drift guard: cannot MAPPED to a target outside the frozen white-list.
    assert res.state == MappingState.PARTIAL
    assert res.resolved_relation_type is None
    # White-list itself is unchanged.
    assert "not_a_real_global_rel" not in white_list()
    from ...validation import RELATIONSHIP_TYPES

    assert len(white_list()) == len(RELATIONSHIP_TYPES)  # mirrors the enum


def test_mc6_provenance_retained_on_resolve():
    """resolve() preserves full semantic provenance for audit/drift tracing."""
    register_mapping(
        source_relation_type="influenced_by_local",
        ontology_origin="influenced_by",
        mapping_id="map-inf",
        declared_at=_DECLARED,
        resolved_relation_type="influenced",  # ∈ Freeze 18
    )
    out = resolve("influenced_by_local")
    assert out is not None
    assert out.state == MappingState.MAPPED
    assert out.provenance.mapping_id == "map-inf"
    assert out.provenance.governance_layer_version == "M80-B"
    assert out.provenance.declared_at == _DECLARED


def test_mc7_unregistered_resolves_none():
    """Unknown local type has no contract; caller must treat as UNMAPPED."""
    assert resolve("never_declared") is None
    assert is_registered("never_declared") is False


def test_mc8_registry_tracking():
    """registered_sources() reflects declared contracts only."""
    register_mapping("a", "part_of", "m-a", _DECLARED, resolved_relation_type="part_of")
    register_mapping("b", "<none>", "m-b", _DECLARED)
    sources = registered_sources()
    assert "a" in sources and "b" in sources
    assert is_registered("a") and is_registered("b")
