"""Evidence Claim Layer (M26.1).

Defines the typed Evidence Claim record + link model that connects a subject
(Entity or Relationship) to a curated Source. Evidence Claims are human-curated
and stored in an independent curated file `data/evidence_claims.json` (NOT in
`data/examples/*`, which stays frozen).

Hybrid storage/semantics model (per M26 Architecture Plan):
- Storage reuses the existing nested `evidence: []` concept already present on
  entities/relationships in `data/examples`.
- Semantics: each element is a first-class typed `EvidenceClaim` record
  (auditable, can target relationships, resolvable to a Source by `source_id`).

Freeze constraints (unchanged):
- stdlib only; no AI / LLM / DB / ORM / new dependency.
- NO automatic evidence generation; NO AI-assigned confidence.
- Does NOT modify `validation.py`; validation is orchestration only (see
  `dataset_validator.validate_evidence_claims`).
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional

EVIDENCE_SCHEMA_VERSION = "1.0"

SUBJECT_TYPE_ENTITY = "entity"
SUBJECT_TYPE_RELATIONSHIP = "relationship"
SUBJECT_TYPES = frozenset({SUBJECT_TYPE_ENTITY, SUBJECT_TYPE_RELATIONSHIP})

# ADR-0018 (Truth layer): the curated truth-grading fields already present in
# `data/evidence_claims.json`. They were silently dropped at this boundary, so
# dissent/uncertainty never reached the answer path. Still 100% human-curated —
# NO AI-assigned confidence (M26.1 freeze constraint unchanged).
TRUTH_FIELDS = (
    "confidence",
    "scholar_consensus",
    "controversy_level",
    "interpretation_note",
)


def build_truth(raw) -> Optional[dict]:
    """Project the curated truth-grading fields out of a raw claim dict.

    Returns None when the claim carries no truth grading at all (most of the
    76 curated claims), so the field stays absent rather than fake-empty.
    """
    if not isinstance(raw, dict):
        return None
    truth = {k: raw.get(k) for k in TRUTH_FIELDS}
    if all(v in (None, "") for v in truth.values()):
        return None
    return truth


@dataclass(frozen=True)
class EvidenceClaim:
    """Typed evidence claim linking a subject to a source (M26.1).

    `subject_type` + `subject_id` identify the target (an Entity or a
    Relationship). `source_id` references a curated `Source` (resolved by the
    `SourceRegistry`). `claim` is the human-curated assertion. `notes` is
    optional free text.

    ADR-0018: `truth` carries the curated grading
    {confidence, scholar_consensus, controversy_level, interpretation_note}
    when the source record provides it (None otherwise).
    """

    id: str
    subject_type: str
    subject_id: str
    source_id: str
    claim: str
    notes: Optional[str] = None
    truth: Optional[dict] = None


class FileEvidenceClaimLoader:
    """Load human-curated Evidence Claims from a curated JSON file (M26.1).

    If the file is absent, returns `[]` (graceful). Never calls AI/LLM; never
    invents claims or confidence.
    """

    def __init__(self, path: Path) -> None:
        self._path = Path(path)

    def load(self) -> List[EvidenceClaim]:
        if not self._path.exists():
            return []
        raw = json.loads(self._path.read_text(encoding="utf-8"))
        items = raw if isinstance(raw, list) else raw.get("evidence_claims", [])
        out: List[EvidenceClaim] = []
        for item in items:
            claim = _to_evidence_claim(item)
            if claim is not None:
                out.append(claim)
        return out


def _to_evidence_claim(item) -> Optional[EvidenceClaim]:
    """Coerce a raw dict into an `EvidenceClaim`. Returns None on missing id."""
    if not isinstance(item, dict):
        return None
    cid = item.get("id")
    if not cid:
        return None
    # M26.1: accept both singular `source_id` and plural `source_ids`
    # (curated records may cite several sources). When only the plural
    # form is present, the first entry backs the required `source_id`.
    _sid = item.get("source_id")
    if not _sid:
        _sids = item.get("source_ids")
        if isinstance(_sids, list) and _sids:
            _sid = _sids[0]
    return EvidenceClaim(
        id=str(cid),
        subject_type=str(item.get("subject_type", SUBJECT_TYPE_ENTITY)),
        subject_id=str(item.get("subject_id", "")),
        source_id=str(_sid or ""),
        claim=str(item.get("claim", "")),
        notes=item.get("notes"),
        truth=build_truth(item),
    )
