"""M9-004 Data Breadth Expansion — data-layer regression tests.

These tests guard the *additive* data expansion only. They never touch
production code, the schema, or the freeze enum values — they assert that
the expanded dataset stays inside the frozen contract:

  * every entity type is one of the 8 frozen types
  * every relationship type is one of the 18 frozen types
  * every relationship endpoint resolves to a real entity (no dangling)
  * the global validation report has 0 warnings / 0 errors
  * the freeze enum sizes are unchanged (8 entities / 18 relationships)

Run with: pytest backend/tests/test_data_breadth.py
"""
from __future__ import annotations

from pathlib import Path

import pytest

from app.core.repository import JsonTopicRepository
from app.core.knowledge_service import KnowledgeService
from app.validation import (
    ENTITY_TYPES,
    RELATIONSHIP_TYPES,
    build_global_validation_report,
)

BACKEND_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BACKEND_DIR.parent / "data" / "examples"

EXPECTED_ENTITY_TYPES = 8
EXPECTED_RELATIONSHIP_TYPES = 18


@pytest.fixture(scope="module")
def ks():
    return KnowledgeService(JsonTopicRepository(DATA_DIR))


def test_freeze_enum_sizes_unchanged():
    """The M3.5-000 Schema Freeze locks the vocabulary at 8 / 18."""
    assert len(ENTITY_TYPES) == EXPECTED_ENTITY_TYPES
    assert len(RELATIONSHIP_TYPES) == EXPECTED_RELATIONSHIP_TYPES


def test_all_entity_types_within_frozen_enum(ks):
    datasets = ks.get_topic_datasets()
    bad = []
    for topic, data in datasets:
        for e in data.get("entities", []):
            if e.get("type") not in ENTITY_TYPES:
                bad.append((topic, e.get("id"), e.get("type")))
    assert not bad, f"Entity types outside frozen enum: {bad}"


def test_all_relationship_types_within_frozen_enum(ks):
    datasets = ks.get_topic_datasets()
    bad = []
    for topic, data in datasets:
        for r in data.get("relationships", []):
            if r.get("type") not in RELATIONSHIP_TYPES:
                bad.append((topic, r.get("source"), r.get("type"), r.get("target")))
    assert not bad, f"Relationship types outside frozen enum: {bad}"


def test_no_dangling_references(ks):
    """Every relationship endpoint must resolve to a real entity."""
    datasets = ks.get_topic_datasets()
    gid_universe = {
        e["global_id"]
        for _, data in datasets
        for e in data.get("entities", [])
        if e.get("global_id")
    }
    dangling = []
    for topic, data in datasets:
        local = {e["id"] for e in data.get("entities", [])}

        def resolvable(ref):
            if ":" in ref:
                return ref in gid_universe
            return ref in local

        for r in data.get("relationships", []):
            if not resolvable(r.get("source", "")):
                dangling.append((topic, "source", r.get("source")))
            if not resolvable(r.get("target", "")):
                dangling.append((topic, "target", r.get("target")))
    assert not dangling, f"Dangling references: {dangling}"


def test_global_validation_report_clean(ks):
    """The M9-004 acceptance gate: 0 warnings, 0 errors."""
    report = build_global_validation_report(ks)
    assert report.error_count == 0, report.issues
    assert report.warning_count == 0, [
        (i.topic, i.code, i.message) for i in report.issues if i.severity == "warning"
    ]


def test_dataset_scale_expanded(ks):
    """Sanity check that M9-004 actually added breadth (not a no-op)."""
    datasets = ks.get_topic_datasets()
    entities = sum(len(d.get("entities", [])) for _, d in datasets)
    rels = sum(len(d.get("relationships", [])) for _, d in datasets)
    assert entities >= 90, f"expected expanded entity count, got {entities}"
    assert rels >= 150, f"expected expanded relationship count, got {rels}"
