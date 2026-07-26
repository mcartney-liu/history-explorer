"""Dataset-level validation orchestration (M25.1).

M25.1 attaches a DATASET-LEVEL validation pass on top of the existing, frozen
schema validation engine. This module is an ORCHESTRATOR only — it does NOT
introduce a second validation engine and does NOT re-implement any rule.

Architecture decisions (M25.1 Architecture Revision Plan):
- R2 (Validator scope): `DatasetValidator` performs dataset-level orchestration:
  (a) manifest validation, (b) schema-version validation, (c) delegation to the
  single, frozen schema engine `validation.build_validation_report`, and
  (d) summarization into a `DatasetValidationReport`.
  It MUST NOT define `validate_entity()` / `validate_relationship()` /
  `validate_timeline()` — those rules live ONLY in `validation.py`.
- R3 (No Lifecycle): manifest validation REJECTS lifecycle fields
  (`status` / `published_at` / `approval`); they are M26.
- R5 (Evidence Claim boundary): this validator does NOT touch Evidence Claims.
  The `Source -> Evidence Claim -> Entity/Relationship` boundary is defined
  elsewhere; M25.1 neither creates nor validates Evidence Claims.

Freeze constraints (unchanged):
- `validation.py` is NOT modified. No new dependency, no AI/LLM/DB.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import List

from app.core.dataset_provider import (
    PROVENANCE_POLICY,
    DatasetManifest,
    DatasetProvider,
)
from app.validation import build_validation_report

# Schema versions accepted by M25.1. Versions that carry lifecycle / evidence
# semantics are deferred to M26 and would FAIL here.
_ACCEPTED_MANIFEST_SCHEMA_VERSION = "1.0"
_ACCEPTED_DATASET_SCHEMA_VERSION = "1.0"

# Lifecycle fields that must NEVER appear in an M25.1 manifest (R3).
_FORBIDDEN_MANIFEST_FIELDS = ("status", "published_at", "approval")

# Minimal semver-ish pattern for the manifest `version` field.
_VERSION_RE = __import__("re").compile(r"^\d+\.\d+\.\d+$")


@dataclass(frozen=True)
class DatasetValidationReport:
    """Summary of a dataset-level validation pass (M25.1)."""

    dataset_id: str
    content_hash: str
    manifest_valid: bool
    schema_version_valid: bool
    entity_count: int
    relationship_count: int
    timeline_count: int
    manifest_errors: List[str]
    schema_errors: List[str]
    valid: bool


class DatasetValidator:
    """Dataset-level validation orchestrator (read-only, no rule re-implementation)."""

    def __init__(
        self,
        accepted_manifest_schema: str = _ACCEPTED_MANIFEST_SCHEMA_VERSION,
        accepted_dataset_schema: str = _ACCEPTED_DATASET_SCHEMA_VERSION,
    ) -> None:
        self._accepted_manifest_schema = accepted_manifest_schema
        self._accepted_dataset_schema = accepted_dataset_schema

    def validate_dataset(self, provider: DatasetProvider) -> DatasetValidationReport:
        """Run the dataset-level validation pass.

        Order: manifest validation -> schema-version validation ->
        delegate to the frozen schema engine -> summarize.
        """
        manifest = provider.manifest()

        manifest_errors = self._validate_manifest(manifest)
        schema_version_valid, schema_version_errors = self._validate_schema_versions(manifest)

        # Reuse the single frozen schema engine (M24/M2). No rule re-implementation.
        raw = build_validation_report(provider.load_all())
        schema_errors = [
            f"{i.severity}:{i.code}:{i.message}"
            for i in raw.issues
            if i.severity == "error"
        ]

        valid = (
            len(manifest_errors) == 0
            and schema_version_valid
            and len(schema_errors) == 0
        )

        return DatasetValidationReport(
            dataset_id=manifest.dataset_id,
            content_hash=manifest.content_hash,
            manifest_valid=len(manifest_errors) == 0,
            schema_version_valid=schema_version_valid,
            entity_count=raw.entity_count,
            relationship_count=raw.relationship_count,
            timeline_count=raw.timeline_count,
            manifest_errors=manifest_errors,
            schema_errors=schema_errors + schema_version_errors,
            valid=valid,
        )

    # ---- internal checks (manifest/schema-version only; NOT entity/relationship) ----

    def _validate_manifest(self, manifest: DatasetManifest) -> List[str]:
        errors: List[str] = []
        # Defensive guard for R3: a manifest must never carry lifecycle fields.
        for field in _FORBIDDEN_MANIFEST_FIELDS:
            if hasattr(manifest, field):
                errors.append(f"MANIFEST: lifecycle field '{field}' is not allowed in M25.1")
        if not manifest.dataset_id:
            errors.append("MANIFEST: dataset_id must be non-empty")
        if not _VERSION_RE.match(manifest.version or ""):
            errors.append(f"MANIFEST: version '{manifest.version}' is not semver (X.Y.Z)")
        if not manifest.name:
            errors.append("MANIFEST: name must be non-empty")
        if not manifest.creator:
            errors.append("MANIFEST: creator must be non-empty")
        if not manifest.license:
            errors.append("MANIFEST: license must be non-empty")
        if not (manifest.content_hash or "").startswith("sha256:"):
            errors.append("MANIFEST: content_hash must be a canonical sha256 hash")
        if manifest.provenance_policy != PROVENANCE_POLICY:
            errors.append(
                f"MANIFEST: provenance_policy must be '{PROVENANCE_POLICY}', "
                f"got '{manifest.provenance_policy}'"
            )
        return errors

    def _validate_schema_versions(self, manifest: DatasetManifest) -> tuple[bool, List[str]]:
        errors: List[str] = []
        if manifest.manifest_schema_version != self._accepted_manifest_schema:
            errors.append(
                f"SCHEMA: manifest_schema_version '{manifest.manifest_schema_version}' "
                f"not accepted (expected '{self._accepted_manifest_schema}')"
            )
        if manifest.dataset_schema_version != self._accepted_dataset_schema:
            errors.append(
                f"SCHEMA: dataset_schema_version '{manifest.dataset_schema_version}' "
                f"not accepted (expected '{self._accepted_dataset_schema}')"
            )
        return (len(errors) == 0, errors)
