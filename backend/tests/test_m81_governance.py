"""M81-B Semantic Governance Runtime Boundary — T1-T10 test suite.

Covers the M81-A ratified Side Index (ordinal-keyed, instance-scoped) and the
three-state observe-only MappingState admission on GlobalGraph.

Hard constraints enforced by these tests (M81-B ratify):
- UNMAPPED edges are RECORDED, never rejected (observe-only, no enforcement).
- PARTIAL is a first-class state.
- Side Index is instance-scoped (rebuilt with the graph) and never mutates Edge
  or the RELATIONSHIP_TYPES / ENTITY_TYPES freeze baseline.
- 'legacy-json' is retained only as registry provenance identity, never enters
  the Adapter / Ontology system.
"""

from __future__ import annotations

import sys
from pathlib import Path

# Make the `app` package importable when pytest is launched from the repo
# root or the backend directory (mirrors test_global_graph.py).
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.core.global_graph import GlobalGraph, EdgeGovernanceRecord
from app.core.registry import KnowledgeRegistry
from app.core.domain.mapping import (
    MappingState,
    register_mapping,
    white_list,
)


def _make_graph() -> GlobalGraph:
    """Build a GlobalGraph over a single legacy-json topic with three edge
    states: MAPPED (part_of), PARTIAL (off-list target), UNMAPPED (undeclared)."""
    # Declare contracts. 'part_of' is in the freeze white-list -> MAPPED.
    register_mapping(
        source_relation_type="member_of",
        ontology_origin="part_of",
        mapping_id="map-member_of",
        declared_at="2026-08-02",
        resolved_relation_type="part_of",
    )
    # Off-list target -> drifts to PARTIAL (drift guard, never expands list).
    register_mapping(
        source_relation_type="influenced_by_partial",
        ontology_origin="influenced_by",
        mapping_id="map-partial",
        declared_at="2026-08-02",
        resolved_relation_type="not_a_real_relation",
    )

    data = {
        "title": "Legacy JSON Topic",
        "entities": [
            {"id": "a", "name": "Entity A", "type": "person"},
            {"id": "b", "name": "Entity B", "type": "org"},
            {"id": "c", "name": "Entity C", "type": "place"},
        ],
        "relationships": [
            # MAPPED edge
            {"source": "a", "target": "b", "type": "member_of"},
            # PARTIAL edge
            {"source": "a", "target": "c", "type": "influenced_by_partial"},
            # UNMAPPED edge (type never declared) — observe-only, must be recorded
            {"source": "b", "target": "c", "type": "unknown_rel"},
        ],
    }
    registry = KnowledgeRegistry([("legacy-json", data)])
    return GlobalGraph([("legacy-json", data)], registry)


def test_T1_ordinal_keyed_unique():
    """T1: every edge gets a unique monotonic ordinal; no key collision."""
    g = _make_graph()
    records = g.all_governance_records()
    assert len(records) == 3
    ordinals = [r.ordinal for r in records]
    assert ordinals == [0, 1, 2]
    assert len(set(ordinals)) == len(ordinals)


def test_T2_instance_scoped_rebuild():
    """T2: Side Index is instance-scoped; a fresh graph starts at ordinal 0."""
    g1 = _make_graph()
    assert g1.all_governance_records()[0].ordinal == 0
    g2 = _make_graph()
    # New instance -> independent counter, not accumulated across instances.
    assert g2.all_governance_records()[0].ordinal == 0
    assert len(g2.all_governance_records()) == 3


def test_T3_three_state_recorded():
    """T3: MAPPED / PARTIAL / UNMAPPED all land in the Side Index."""
    g = _make_graph()
    states = {r.mapping_state for r in g.all_governance_records()}
    assert MappingState.MAPPED in states
    assert MappingState.PARTIAL in states
    assert MappingState.UNMAPPED in states


def test_T4_observe_only_unmapped_admission():
    """T4: UNMAPPED edge is recorded AND retained in the graph (no rejection)."""
    g = _make_graph()
    unmapped = [r for r in g.all_governance_records()
                if r.mapping_state == MappingState.UNMAPPED]
    assert len(unmapped) == 1
    assert unmapped[0].relation_type == "unknown_rel"
    # The edge still exists in the underlying graph (zero admission change).
    assert g.edge_count == 3


def test_T5_no_enforcement():
    """T5: Side Index does not alter graph behavior or entity admission."""
    g = _make_graph()
    # Node count unaffected by governance instrumentation.
    assert g.node_count == 3
    # UNMAPPED edge participates in adjacency like any other edge.
    assert len(g.out_neighbors(g._canonical_key("legacy-json", "b"))) == 1


def test_T6_legacy_json_provenance_identity():
    """T6: legacy-json topic is retained as registry identity only."""
    g = _make_graph()
    # All edges originate from the legacy-json topic via registry resolution.
    for r in g.all_governance_records():
        assert r.source.startswith("legacy-json:") or r.target.startswith("legacy-json:")


def test_T7_partial_first_class():
    """T7: PARTIAL is a first-class state carrying its untranslatable aspect."""
    g = _make_graph()
    partial = [r for r in g.all_governance_records()
               if r.mapping_state == MappingState.PARTIAL]
    assert len(partial) == 1
    assert partial[0].untranslatable_aspect is not None
    assert "not in frozen white-list" in partial[0].untranslatable_aspect


def test_T8_side_index_does_not_pollute_edge():
    """T8: underlying Edge keeps only source/target/type; no governance fields."""
    g = _make_graph()
    edges = g.neighbors(g._canonical_key("legacy-json", "a"), "outgoing")
    assert len(edges) >= 1
    for e in edges:
        assert set(e.__dict__.keys()) == {"source", "target", "type"}


def test_T9_governance_summary_counts():
    """T9: governance_summary tallies edges per MappingState correctly."""
    g = _make_graph()
    summary = g.governance_summary()
    assert summary[MappingState.MAPPED] == 1
    assert summary[MappingState.PARTIAL] == 1
    assert summary[MappingState.UNMAPPED] == 1
    assert sum(summary.values()) == 3


def test_T10_freeze_guard_no_mutation():
    """T10: Side Index does not mutate the freeze baseline (read-only import)."""
    before = set(white_list())
    _ = _make_graph()
    after = set(white_list())
    assert before == after
    # 18-entry freeze baseline integrity.
    assert len(before) == 18
