"""Tests for the M26.1 Evidence Claim Layer (backend/app/core/evidence_claim.py).

M26.1 scope: a typed, human-curated Evidence Claim that links a subject (Entity
or Relationship) to a curated Source by `source_id`. Stored in an independent
curated file `data/evidence_claims.json` (NOT in `data/examples/*`). These tests
assert:
- `EvidenceClaim` is a frozen dataclass with the required link-model fields.
- `FileEvidenceClaimLoader` returns `[]` when the curated file is absent
  (graceful) and loads curated claims when present.
- `DatasetValidator.validate_evidence_claims` (orchestration only) enforces
  valid `subject_type`, resolvable `source_id`, and required fields — without
  touching `validation.py` and without any AI/confidence logic.
- `EVIDENCE_SCHEMA_VERSION` is `"1.0"`.
"""

import json
import sys
import tempfile
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.core.dataset_provider import DatasetProvider, build_dataset_provider
from app.core.dataset_validator import DatasetValidator
from app.core.evidence_claim import (
    EVIDENCE_SCHEMA_VERSION,
    EvidenceClaim,
    FileEvidenceClaimLoader,
    SUBJECT_TYPE_ENTITY,
    SUBJECT_TYPE_RELATIONSHIP,
    SUBJECT_TYPES,
)
from app.core.source_registry import FileSourceLoader, SourceRecordV1

DATA_DIR = BACKEND_DIR.parent / "data" / "examples"
EVIDENCE_FILE = BACKEND_DIR.parent / "data" / "evidence_claims.json"
SOURCES_FILE = BACKEND_DIR.parent / "data" / "sources.json"


# --- schema: EvidenceClaim frozen + link model ---------------------------
def test_evidence_claim_is_frozen_with_required_fields():
    fields = set(EvidenceClaim.__dataclass_fields__.keys())
    for f in ("id", "subject_type", "subject_id", "source_id", "claim"):
        assert f in fields
    claim = EvidenceClaim(
        id="ec1", subject_type=SUBJECT_TYPE_ENTITY,
        subject_id="e1", source_id="s1", claim="C",
    )
    try:
        claim.claim = "X"
        assert False, "EvidenceClaim must be frozen"
    except Exception:
        pass


def test_subject_types_are_entity_and_relationship():
    assert SUBJECT_TYPES == {SUBJECT_TYPE_ENTITY, SUBJECT_TYPE_RELATIONSHIP}


# --- loader behavior ------------------------------------------------------
def test_file_evidence_claim_loader_returns_empty_when_absent():
    with tempfile.TemporaryDirectory() as d:
        loader = FileEvidenceClaimLoader(Path(d) / "missing.json")
        assert loader.load() == []


def test_file_evidence_claim_loader_loads_curated_claims():
    payload = [
        {
            "id": "ec1", "subject_type": "entity", "subject_id": "e1",
            "source_id": "s1", "claim": "C1", "notes": "n",
        },
        {
            "id": "ec2", "subject_type": "relationship", "subject_id": "e1->e2",
            "source_id": "s2", "claim": "C2",
        },
    ]
    with tempfile.TemporaryDirectory() as d:
        p = Path(d) / "evidence_claims.json"
        p.write_text(json.dumps(payload), encoding="utf-8")
        claims = FileEvidenceClaimLoader(p).load()
    assert len(claims) == 2
    assert claims[0].subject_type == SUBJECT_TYPE_ENTITY
    assert claims[1].subject_type == SUBJECT_TYPE_RELATIONSHIP
    assert claims[0].notes == "n"
    assert claims[1].notes is None


def test_file_evidence_claim_loader_skips_records_without_id():
    payload = [{"subject_type": "entity", "subject_id": "e1", "source_id": "s1", "claim": "C"}]
    with tempfile.TemporaryDirectory() as d:
        p = Path(d) / "evidence_claims.json"
        p.write_text(json.dumps(payload), encoding="utf-8")
        assert FileEvidenceClaimLoader(p).load() == []


# --- validator orchestration (no second engine) ---------------------------
def _sources():
    return [
        SourceRecordV1(id="s1", type="literature", title="T", creator="C", year=1, reference="R", license="L"),
        SourceRecordV1(id="s2", type="secondary", title="T2", creator="C2", year=2, reference="R2", license="L"),
    ]


def test_validate_evidence_claims_passes_for_curated_file():
    claims = FileEvidenceClaimLoader(EVIDENCE_FILE).load()
    sources = FileSourceLoader(SOURCES_FILE).load()
    ok, errors = DatasetValidator().validate_evidence_claims(claims, sources)
    assert ok, errors
    assert errors == []


def test_validate_evidence_claims_rejects_unknown_source():
    claims = [
        EvidenceClaim(id="ec1", subject_type=SUBJECT_TYPE_ENTITY, subject_id="e1",
                      source_id="ghost", claim="C"),
    ]
    ok, errors = DatasetValidator().validate_evidence_claims(claims, _sources())
    assert not ok
    assert any("unknown source" in e for e in errors)


def test_validate_evidence_claims_rejects_invalid_subject_type():
    claims = [
        EvidenceClaim(id="ec1", subject_type="bogus", subject_id="e1",
                      source_id="s1", claim="C"),
    ]
    ok, errors = DatasetValidator().validate_evidence_claims(claims, _sources())
    assert not ok
    assert any("subject_type" in e for e in errors)


def test_validate_evidence_claims_rejects_missing_claim_text():
    claims = [
        EvidenceClaim(id="ec1", subject_type=SUBJECT_TYPE_ENTITY, subject_id="e1",
                      source_id="s1", claim=""),
    ]
    ok, errors = DatasetValidator().validate_evidence_claims(claims, _sources())
    assert not ok
    assert any("claim" in e for e in errors)


def test_evidence_schema_version_is_1_0():
    assert EVIDENCE_SCHEMA_VERSION == "1.0"


# --- provider integration -------------------------------------------------
def test_provider_load_evidence_claims_returns_curated_claims():
    provider = build_dataset_provider(DATA_DIR)
    claims = provider.load_evidence_claims()
    assert len(claims) == len(FileEvidenceClaimLoader(EVIDENCE_FILE).load())
    assert all(isinstance(c, EvidenceClaim) for c in claims)


def test_provider_direct_construction_returns_empty_evidence():
    from app.core.repository import JsonTopicRepository

    provider = DatasetProvider(JsonTopicRepository(DATA_DIR))
    assert provider.load_evidence_claims() == []
