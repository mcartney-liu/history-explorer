"""Tests for the M24 minimal Dataset identity layer (backend/app/core/dataset.py).

M24 scope: the dataset layer is additive and read-only. These tests assert:
- `compute_content_hash` is stable and order-independent (canonical deterministic).
- `DatasetMetadataProvider` is compatible with `JsonTopicRepository` and leaves
  the wrapped repository's read-model unchanged (no side effects).
"""

import sys
from pathlib import Path

# Make the `app` package importable when pytest is launched from the repo root
# or the backend directory (matches the convention in the other backend tests).
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.core.repository import JsonTopicRepository
from app.core.dataset import (
    CURATED_DATASET_ID,
    DatasetMetadata,
    DatasetMetadataProvider,
    compute_content_hash,
)

DATA_DIR = BACKEND_DIR.parent / "data" / "examples"


# --- Hash stability ---------------------------------------------------------
def test_compute_content_hash_is_stable_across_calls():
    pairs = JsonTopicRepository(DATA_DIR).load_all()
    assert compute_content_hash(pairs) == compute_content_hash(pairs)


def test_compute_content_hash_ignores_json_key_and_array_order():
    # Build a synthetic single-topic dataset, then a reordered copy, and prove
    # the hash is identical even though key order AND array order differ.
    base = (
        "t1",
        {
            "title": "T",
            "summary": "S",
            "entities": [
                {"id": "e2", "type": "Idea", "name": "B"},
                {"id": "e1", "type": "Event", "name": "A"},
            ],
            "relationships": [
                {"source": "e1", "target": "e2", "type": "caused"},
            ],
            "timeline": [
                {"period": {"value": -10}, "event": "X"},
            ],
        },
    )
    reordered = (
        "t1",
        {
            "summary": "S",
            "title": "T",
            "relationships": [
                {"type": "caused", "target": "e2", "source": "e1"},
            ],
            "entities": [
                {"name": "A", "type": "Event", "id": "e1"},
                {"name": "B", "type": "Idea", "id": "e2"},
            ],
            "timeline": [
                {"event": "X", "period": {"value": -10}},
            ],
        },
    )
    assert compute_content_hash([base]) == compute_content_hash([reordered])


def test_compute_content_hash_changes_when_content_changes():
    base = ("t1", {"entities": [{"id": "e1"}], "relationships": [], "timeline": []})
    changed = (
        "t1",
        {"entities": [{"id": "e1"}, {"id": "e2"}], "relationships": [], "timeline": []},
    )
    assert compute_content_hash([base]) != compute_content_hash([changed])


# --- Provider compatibility -------------------------------------------------
def test_provider_metadata_topics_match_repository():
    repo = JsonTopicRepository(DATA_DIR)
    provider = DatasetMetadataProvider(repo)
    meta = provider.metadata()
    assert isinstance(meta, DatasetMetadata)
    assert meta.dataset_id == CURATED_DATASET_ID
    assert meta.topics == repo.list_topics()
    assert meta.content_hash.startswith("sha256:")


def test_provider_metadata_is_deterministic():
    repo = JsonTopicRepository(DATA_DIR)
    provider = DatasetMetadataProvider(repo)
    m1 = provider.metadata()
    m2 = provider.metadata()
    # Multiple calls produce identical identity (deterministic hash).
    assert m1.content_hash == m2.content_hash
    assert m1.topics == m2.topics


def test_provider_metadata_has_no_side_effects_on_repo():
    repo = JsonTopicRepository(DATA_DIR)
    before_topics = repo.list_topics()
    before_pairs = [(t, dict(d)) for t, d in repo.load_all()]
    # Derive metadata.
    meta = DatasetMetadataProvider(repo).metadata()
    # The repository's observable read-model must be unchanged by the call.
    assert repo.list_topics() == before_topics
    after_pairs = [(t, dict(d)) for t, d in repo.load_all()]
    assert after_pairs == before_pairs
    # A known topic is still loadable after the provider ran.
    assert repo.load_topic("roman_empire") is not None
    # And the derived metadata stays consistent with the unchanged repo.
    assert meta.topics == before_topics
