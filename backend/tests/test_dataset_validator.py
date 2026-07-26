"""Tests for the M25.1 Dataset Validator (backend/app/core/dataset_validator.py).

M25.1 scope: the validator is an ORCHESTRATOR only. These tests assert:
- R2: it reuses the frozen `validation.build_validation_report` engine (no second
  engine, no re-implemented rules) and reports the same entity/relationship/
  timeline counts and the same error issues.
- R3: an unknown schema version FAILS validation.
- R5: it does NOT create/load/validate Evidence Claims (no evidence method, no
  evidence field on the report).
"""

import sys
import types
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.core.dataset_provider import DatasetManifest, build_dataset_provider
from app.core.dataset_validator import DatasetValidationReport, DatasetValidator
from app.validation import build_validation_report

DATA_DIR = BACKEND_DIR.parent / "data" / "examples"


# --- R2: orchestration reuses the frozen schema engine ----------------------
def test_validate_dataset_reuses_frozen_engine_and_passes():
    provider = build_dataset_provider(DATA_DIR)
    validator = DatasetValidator()
    report = validator.validate_dataset(provider)

    assert isinstance(report, DatasetValidationReport)
    assert report.manifest_valid is True
    assert report.schema_version_valid is True

    # Counts and error issues must come from the frozen engine, unchanged.
    raw = build_validation_report(provider.load_all())
    assert report.entity_count == raw.entity_count
    assert report.relationship_count == raw.relationship_count
    assert report.timeline_count == raw.timeline_count
    expected_errors = [
        f"{i.severity}:{i.code}:{i.message}"
        for i in raw.issues
        if i.severity == "error"
    ]
    # The validator must surface exactly the frozen engine's error issues
    # (no extra rule, no dropped rule).
    assert report.schema_errors == expected_errors
    assert report.valid is (len(expected_errors) == 0)


# --- R3: unknown schema version FAILS ---------------------------------------
def test_validate_dataset_rejects_unknown_schema_version():
    bad_manifest = DatasetManifest(
        dataset_id="curated-history-graph",
        version="1.0.0",
        manifest_schema_version="2.0",  # not accepted in M25.1
        dataset_schema_version="1.0",
        name="Curated History Graph",
        creator="History Explorer Curators",
        license="Proprietary",
        content_hash="sha256:" + "0" * 64,
        provenance_policy="human-curated",
    )
    # Stub provider: only `manifest()` and `load_all()` are touched by the validator.
    stub = types.SimpleNamespace(
        manifest=lambda: bad_manifest,
        load_all=lambda: [],
    )
    validator = DatasetValidator()
    report = validator.validate_dataset(stub)

    assert report.schema_version_valid is False
    assert any("SCHEMA" in e for e in report.schema_errors)
    assert report.valid is False


# --- R5: no Evidence Claim processing ---------------------------------------
def test_validator_does_not_process_evidence_claims():
    provider = build_dataset_provider(DATA_DIR)
    validator = DatasetValidator()
    report = validator.validate_dataset(provider)

    # No Evidence-Claim method may exist on the validator.
    assert not hasattr(validator, "validate_evidence_claim")
    assert not hasattr(validator, "validate_evidence")
    # The report carries no evidence field.
    assert "evidence" not in report.__dataclass_fields__
    # Provenance policy remains the explicit human-curated boundary.
    assert provider.manifest().provenance_policy == "human-curated"
