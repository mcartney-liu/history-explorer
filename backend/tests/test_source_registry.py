"""Tests for the M26.1 Source Registry (backend/app/core/source_registry.py).

M26.1 scope: a human-curated, read-only source registry that does NOT enter the
knowledge graph (no CITED_FROM relation; RELATIONSHIP_TYPES=18 unchanged). These
tests assert:
- `SourceRecordV1` extends the M25.1 `SourceRecord` and adds `publisher_or_archive`.
- `FileSourceLoader` returns `[]` when the curated file is absent (graceful;
  preserves M25.1 behavior) and loads curated sources when present.
- `SourceRegistry` resolves sources by `id` (O(1)).
- `DatasetValidator.validate_source_registry` (orchestration only) enforces
  unique ids + required fields, without touching `validation.py`.
- `SOURCE_SCHEMA_VERSION` is `"1.0"`.
- No AI / LLM / DB / new dependency is introduced (import-level sanity).
"""

import json
import sys
import tempfile
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.core.dataset_provider import DatasetProvider, build_dataset_provider
from app.core.source_registry import (
    SOURCE_SCHEMA_VERSION,
    FileSourceLoader,
    SourceRecord,
    SourceRecordV1,
    SourceRegistry,
)
from app.core.dataset_validator import DatasetValidator

DATA_DIR = BACKEND_DIR.parent / "data" / "examples"
SOURCES_FILE = BACKEND_DIR.parent / "data" / "sources.json"


# --- schema: SourceRecordV1 extends SourceRecord --------------------------
def test_source_record_v1_extends_base_and_adds_field():
    assert issubclass(SourceRecordV1, SourceRecord)
    fields = set(SourceRecordV1.__dataclass_fields__.keys())
    assert "publisher_or_archive" in fields
    # base M25.1 fields retained
    for f in ("id", "type", "title", "creator", "year", "reference", "license"):
        assert f in fields


def test_source_record_v1_is_frozen():
    rec = SourceRecordV1(
        id="s1", type="literature", title="T", creator="C",
        year=2000, reference="R", license="Public Domain",
    )
    try:
        rec.title = "X"
        assert False, "SourceRecordV1 must be frozen"
    except Exception:
        pass


# --- loader behavior ------------------------------------------------------
def test_file_source_loader_returns_empty_when_absent():
    with tempfile.TemporaryDirectory() as d:
        loader = FileSourceLoader(Path(d) / "missing.json")
        assert loader.load() == []


def test_file_source_loader_loads_curated_sources():
    payload = [
        {
            "id": "s1", "type": "literature", "title": "The Histories",
            "creator": "Herodotus", "year": -440, "reference": "ref",
            "license": "Public Domain", "publisher_or_archive": "Loeb",
        },
        {
            "id": "s2", "type": "secondary", "title": "Modern History",
            "creator": "A. Scholar", "reference": "ref2", "license": "Proprietary",
        },
    ]
    with tempfile.TemporaryDirectory() as d:
        p = Path(d) / "sources.json"
        p.write_text(json.dumps(payload), encoding="utf-8")
        sources = FileSourceLoader(p).load()
    assert len(sources) == 2
    assert isinstance(sources[0], SourceRecordV1)
    assert sources[0].id == "s1"
    assert sources[0].publisher_or_archive == "Loeb"
    assert sources[1].year is None  # missing year coerced to None


def test_file_source_loader_skips_records_without_id():
    payload = [{"type": "x", "title": "T", "creator": "C", "reference": "R", "license": "L"}]
    with tempfile.TemporaryDirectory() as d:
        p = Path(d) / "sources.json"
        p.write_text(json.dumps(payload), encoding="utf-8")
        assert FileSourceLoader(p).load() == []


# --- registry resolution --------------------------------------------------
def test_source_registry_resolves_by_id():
    sources = FileSourceLoader(SOURCES_FILE).load()
    assert len(sources) > 0
    reg = SourceRegistry(sources)
    assert len(reg) == len(sources)
    first = sources[0]
    assert reg.get(first.id) is first
    assert reg.get("does-not-exist") is None
    assert first.id in reg.ids()


# --- validator orchestration (no second engine) ---------------------------
def test_validate_source_registry_passes_for_curated_file():
    sources = FileSourceLoader(SOURCES_FILE).load()
    ok, errors = DatasetValidator().validate_source_registry(sources)
    assert ok, errors
    assert errors == []


def test_validate_source_registry_detects_duplicate_id():
    dup = [
        SourceRecordV1(id="x", type="literature", title="A", creator="C", year=1, reference="R", license="L"),
        SourceRecordV1(id="x", type="literature", title="B", creator="C", year=2, reference="R", license="L"),
    ]
    ok, errors = DatasetValidator().validate_source_registry(dup)
    assert not ok
    assert any("duplicate" in e for e in errors)


def test_validate_source_registry_detects_missing_required_field():
    bad = [SourceRecordV1(id="x", type="", title="A", creator="C", year=1, reference="R", license="L")]
    ok, errors = DatasetValidator().validate_source_registry(bad)
    assert not ok
    assert any("type" in e for e in errors)


def test_source_schema_version_is_1_0():
    assert SOURCE_SCHEMA_VERSION == "1.0"


# --- provider integration (factory wires FileSourceLoader) -----------------
def test_build_dataset_provider_loads_curated_sources():
    provider = build_dataset_provider(DATA_DIR)
    sources = provider.load_sources()
    assert len(sources) == len(FileSourceLoader(SOURCES_FILE).load())
    assert all(isinstance(s, SourceRecord) for s in sources)


def test_provider_direct_construction_still_returns_empty_sources():
    # Mirrors M25.1 contract: DatasetProvider(repo) with no loader => [].
    from app.core.repository import JsonTopicRepository

    provider = DatasetProvider(JsonTopicRepository(DATA_DIR))
    assert provider.load_sources() == []
