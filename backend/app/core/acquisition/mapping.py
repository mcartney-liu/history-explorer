"""SourceRecord → DomainSchema mapping — M75-C.

Design constraints (hard):
- Pure function: same (source, metadata) → same dict, every run (TG-8).
- Deterministic: no randomness, no clock, no IO, no LLM.
- Does NOT access Runtime Kernel modules (citation / exploration / trust layers).
- Does NOT mutate the input SourceRecord.
- Structural completeness check ONLY (field presence) — does NOT replicate
  dataset_validator.py logic.
- Does NOT infer entities / relationships (discovery is out of scope, forbidden).
"""
from __future__ import annotations

from typing import Any, Dict

# Domain-layer imports only (M75-A shell). No Runtime Kernel import.
from app.core.dataset_provider import SourceRecord
from app.core.domain.adapter import DomainMetadata


# Required fields for structural completeness (presence + non-empty only).
_REQUIRED_FIELDS = ("id", "title", "type", "reference")


def _structural_check(source: SourceRecord) -> Dict[str, Any]:
    """Structural completeness only: required fields present and non-empty.

    Must NOT replicate dataset_validator.py (no content/lifecycle validation).
    """
    missing = [
        f for f in _REQUIRED_FIELDS
        if getattr(source, f, None) in (None, "")
    ]
    return {
        "valid": len(missing) == 0,
        "missing_fields": missing,
    }


def map_source_to_domain(source: SourceRecord, metadata: DomainMetadata) -> Dict[str, Any]:
    """Map a single SourceRecord into a domain-aligned, schema-described record.

    Deterministic & pure. Produces a 1:1 view of the source under the domain's
    schema (no knowledge inflation, no inferred entities/relationships).
    """
    return {
        "source_id": source.id,
        "domain_id": metadata.domain_id,
        "title": source.title,
        "type": source.type,
        "reference": source.reference,
        "creator": source.creator,
        "year": source.year,
        "license": source.license,
        "validation": _structural_check(source),
    }
