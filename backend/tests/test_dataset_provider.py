"""Tests for the M25.1 Dataset Provider Layer (backend/app/core/dataset_provider.py).

M25.1 scope: additive, read-only provider that COMPOSES a `TopicRepository`.
These tests assert the architecture-revision invariants:
- R1: `DatasetProvider` does NOT inherit `TopicRepository` (composition, not a repo).
- Delegate reads match the wrapped repository byte-for-byte (API/frontend safe).
- `content_hash` reuses the M24 canonical hash (no drift).
- R3: the manifest has exactly 9 identity/provenance fields, NONE lifecycle.
- R4: `load_sources()` returns `[]` (no source registry yet).
- No lifecycle methods (`save_dataset`/`publish_dataset`/`switch_dataset`).
- No side effects on the wrapped repository.
"""

import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.core.dataset import CURATED_DATASET_ID, DatasetMetadataProvider, compute_content_hash
from app.core.dataset_provider import (
    DatasetManifest,
    DatasetProvider,
    build_dataset_provider,
)
from app.core.repository import JsonTopicRepository, TopicRepository

DATA_DIR = BACKEND_DIR.parent / "data" / "examples"

# R3: the only fields a M25.1 manifest may carry.
EXPECTED_MANIFEST_FIELDS = {
    "dataset_id",
    "version",
    "manifest_schema_version",
    "dataset_schema_version",
    "name",
    "creator",
    "license",
    "content_hash",
    "provenance_policy",
}
# R3: lifecycle fields that must NEVER appear in M25.1.
FORBIDDEN_MANIFEST_FIELDS = {"status", "published_at", "approval"}
# R1: lifecycle methods that must NEVER exist on the provider.
FORBIDDEN_METHODS = {"save_dataset", "publish_dataset", "switch_dataset"}


# --- R1: composition, not inheritance --------------------------------------
def test_provider_is_composition_not_inheritance():
    assert not issubclass(DatasetProvider, TopicRepository)
    assert not isinstance(DatasetProvider, type(TopicRepository))


# --- delegate reads match the repository exactly ---------------------------
def test_provider_delegates_list_topics():
    repo = JsonTopicRepository(DATA_DIR)
    provider = DatasetProvider(repo)
    assert provider.list_topics() == repo.list_topics()


def test_provider_delegates_load_topic():
    repo = JsonTopicRepository(DATA_DIR)
    provider = DatasetProvider(repo)
    topic = repo.list_topics()[0]
    assert provider.load_topic(topic) == repo.load_topic(topic)


def test_provider_delegates_load_all():
    repo = JsonTopicRepository(DATA_DIR)
    provider = DatasetProvider(repo)
    assert provider.load_all() == repo.load_all()


# --- R3 + hash: manifest is deterministic and reuses M24 hash --------------
def test_manifest_has_exactly_nine_non_lifecycle_fields():
    repo = JsonTopicRepository(DATA_DIR)
    provider = DatasetProvider(repo)
    manifest = provider.manifest()
    assert isinstance(manifest, DatasetManifest)
    fields = set(manifest.__dataclass_fields__.keys())
    assert fields == EXPECTED_MANIFEST_FIELDS
    for forbidden in FORBIDDEN_MANIFEST_FIELDS:
        assert not hasattr(manifest, forbidden), f"manifest must not carry '{forbidden}'"


def test_manifest_content_hash_matches_canonical_hash():
    repo = JsonTopicRepository(DATA_DIR)
    provider = DatasetProvider(repo)
    manifest = provider.manifest()
    # Reuses the M24 canonical deterministic hash (no re-implementation).
    assert manifest.content_hash == compute_content_hash(repo.load_all())
    # And equals the M24 dataset-metadata hash (identity stable across phases).
    assert manifest.content_hash == DatasetMetadataProvider(repo).metadata().content_hash
    assert manifest.dataset_id == CURATED_DATASET_ID
    assert manifest.content_hash.startswith("sha256:")


# --- R1: no lifecycle methods ----------------------------------------------
def test_provider_has_no_lifecycle_methods():
    repo = JsonTopicRepository(DATA_DIR)
    provider = DatasetProvider(repo)
    for method in FORBIDDEN_METHODS:
        assert not hasattr(provider, method), f"provider must not expose '{method}()'"


# --- R4: sources are empty in M25.1 ----------------------------------------
def test_load_sources_returns_empty_list():
    repo = JsonTopicRepository(DATA_DIR)
    provider = DatasetProvider(repo)
    assert provider.load_sources() == []


# --- no side effects on the wrapped repository -----------------------------
def test_provider_has_no_side_effects_on_repo():
    repo = JsonTopicRepository(DATA_DIR)
    before_topics = repo.list_topics()
    before_pairs = [(t, dict(d)) for t, d in repo.load_all()]
    provider = DatasetProvider(repo)
    # Exercise every provider view.
    _ = provider.manifest()
    _ = provider.dataset_metadata()
    _ = provider.load_sources()
    # The repository's observable read-model must be unchanged.
    assert repo.list_topics() == before_topics
    after_pairs = [(t, dict(d)) for t, d in repo.load_all()]
    assert after_pairs == before_pairs
    assert repo.load_topic("roman_empire") is not None


# --- factory builds a working provider over JSON data dir ------------------
def test_build_dataset_provider_factory():
    provider = build_dataset_provider(DATA_DIR)
    assert isinstance(provider, DatasetProvider)
    assert provider.list_topics() == JsonTopicRepository(DATA_DIR).list_topics()
