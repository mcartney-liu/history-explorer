"""Provenance Index — Runtime Projection Read Model (M29.1-A).

This module implements `ProvenanceIndex`: a *derived, read-only* projection that
connects curated Evidence Claims to their referenced Sources, indexed by
`subject_id`. It is the foundation of the Knowledge Runtime Projection Layer
(M28 / M29 design).

Architecture position (M28 / M29.0 design, ADR-001 / ADR-006):
- `ProvenanceIndex` is a READ MODEL, NOT a Source of Truth. It is fully derived
  from `DatasetProvider` (which reads `evidence_claims.json`, `sources.json`, and
  the immutable `data/examples/*`). It can be deleted and rebuilt at any time.
- It is NOT knowledge storage, NOT graph storage, NOT an AI knowledge writer.
- It performs ZERO writes: it never modifies `data/examples/*`, never writes back
  any data file, never mutates the knowledge graph.
- It adds NO confidence / score / trust / ranking / ai_generated /
  hallucination_probability fields. Provenance is human-curated and auditable.

Input:  `DatasetProvider` (provides `load_evidence_claims()` and `load_sources()`)
Output: `ProvenanceRecord` = {subject_id, source_id, claim_id, reference}

Determinism (required for `to_json`):
- No random, no timestamp, no network request, no external API.
- `build()` on the same input always yields the same projection; `to_json()` is
  serialized with stable key ordering and sorted subject/record ordering.

Freeze constraints (unchanged):
- stdlib only; no DB / ORM / Redis / Graph DB / Vector DB / LLM.
- `main.py`, `knowledge_service.py`, `api/*`, `validation.py`, `registry.py`,
  entity/relationship schemas, and `data/*` are NOT modified by this module.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Dict, List

from app.core.dataset_provider import DatasetProvider
from app.core.evidence_claim import EvidenceClaim
from app.core.source_registry import SourceRecord, SourceRegistry

PROVENANCE_INDEX_SCHEMA_VERSION = "1.0"


@dataclass(frozen=True)
class ProvenanceRecord:
    """A single provenance edge linking a subject to a cited source (M29.1-A).

    Exactly four fields — no confidence / score / trust / ranking / ai_generated
    / hallucination_probability. `reference` is resolved from the referenced
    `SourceRecord.reference`; when the source cannot be resolved `reference` is
    the empty string (transparent gap, never fabricated).
    """

    subject_id: str
    source_id: str
    claim_id: str
    reference: str

    def to_dict(self) -> dict:
        return {
            "subject_id": self.subject_id,
            "source_id": self.source_id,
            "claim_id": self.claim_id,
            "reference": self.reference,
        }


class ProvenanceIndex:
    """Derived, read-only projection of subject -> provenance records (M29.1-A).

    Built from a `DatasetProvider`. Indexes `ProvenanceRecord`s by `subject_id`
    for O(1) `resolve()` lookup. Holds NO state that is a source of truth.
    """

    SCHEMA_VERSION = PROVENANCE_INDEX_SCHEMA_VERSION

    def __init__(self) -> None:
        # subject_id -> list of ProvenanceRecord (deterministic ordering)
        self._records_by_subject: Dict[str, List[ProvenanceRecord]] = {}

    # ------------------------------------------------------------------ #
    # 1. build(provider)
    # ------------------------------------------------------------------ #
    def build(self, provider: DatasetProvider) -> "ProvenanceIndex":
        """Read evidence claims, resolve source references, index by subject_id.

        Pure derivation: reads from the provider (which reads curated claim /
        source files and the immutable examples) and builds an in-memory index.
        Performs no writes of any kind.
        """
        claims: List[EvidenceClaim] = provider.load_evidence_claims()
        sources: List[SourceRecord] = provider.load_sources()
        registry = SourceRegistry(sources)  # O(1) source lookup by id

        by_subject: Dict[str, List[ProvenanceRecord]] = {}
        for claim in claims:
            source = registry.get(claim.source_id)
            reference = source.reference if source is not None else ""
            record = ProvenanceRecord(
                subject_id=claim.subject_id,
                source_id=claim.source_id,
                claim_id=claim.id,
                reference=reference,
            )
            by_subject.setdefault(claim.subject_id, []).append(record)

        # Normalize ordering for deterministic `to_json` output.
        for records in by_subject.values():
            records.sort(key=lambda r: (r.claim_id, r.source_id))

        self._records_by_subject = by_subject
        return self

    # ------------------------------------------------------------------ #
    # 2. resolve(subject_id) -- O(1)
    # ------------------------------------------------------------------ #
    def resolve(self, subject_id: str) -> List[ProvenanceRecord]:
        """Return provenance records for `subject_id` (O(1) dict lookup).

        Returns an empty list when the subject has no curated provenance.
        """
        return list(self._records_by_subject.get(subject_id, []))

    def __len__(self) -> int:
        return len(self._records_by_subject)

    def subjects(self) -> List[str]:
        """All subject ids present in the index (stable, sorted)."""
        return sorted(self._records_by_subject.keys())

    # ------------------------------------------------------------------ #
    # 3. to_json() -- deterministic
    # ------------------------------------------------------------------ #
    def to_json(self) -> str:
        """Serialize the full projection to a deterministic JSON string.

        Guarantees: same `build()` input -> identical output. No random, no
        timestamp, no network. Keys are stable (sort_keys), subjects and records
        are emitted in sorted order.
        """
        records_by_subject: Dict[str, List[dict]] = {}
        for subject_id in sorted(self._records_by_subject.keys()):
            records_by_subject[subject_id] = [
                r.to_dict() for r in self._records_by_subject[subject_id]
            ]
        payload = {
            "schema_version": self.SCHEMA_VERSION,
            "subject_count": len(records_by_subject),
            "records_by_subject": records_by_subject,
        }
        return json.dumps(payload, ensure_ascii=False, sort_keys=True, indent=2)
