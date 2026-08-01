"""Knowledge Acquisition Pipeline — M75-C.

Orchestrates the deterministic alignment:
  1. Resolve domain adapter via AdapterRegistry (M75-A)
  2. Load structured sources via DatasetProvider.load_sources() (M75-B activated)
  3. Map each SourceRecord → domain-aligned record (mapping.map_source_to_domain)
  4. Emit a DomainSchema (M75-A, reused — no second schema introduced)
  5. Return AcquisitionResult

No LLM / Agent / OCR / Entity-discovery / Relationship-discovery.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List

# Domain-layer + dataset_provider (shell layer only). No Runtime Kernel import.
from app.core.dataset_provider import build_dataset_provider
from app.core.domain.adapter import DomainMetadata
from app.core.domain.registry import AdapterRegistry
from app.core.domain.schemas import DomainSchema

from .mapping import map_source_to_domain


@dataclass
class AcquisitionResult:
    """Domain-aligned acquisition output.

    `sources` is a 1:1 projection of input SourceRecords — count never exceeds
    input (TG-9: No Knowledge Inflation).
    """

    domain_id: str
    schema: DomainSchema
    sources: List[Dict] = field(default_factory=list)
    stats: Dict = field(default_factory=dict)


class AcquisitionPipeline:
    """Deterministic SourceRecord → DomainSchema alignment layer."""

    def __init__(self, domain_id: str, data_dir: Path) -> None:
        self._domain_id = domain_id
        self._data_dir = Path(data_dir)

    def run(self) -> AcquisitionResult:
        adapter = AdapterRegistry.get(self._domain_id)
        if adapter is None:
            raise ValueError(f"No domain adapter registered for: {self._domain_id}")
        metadata: DomainMetadata = adapter.get_metadata()

        provider = build_dataset_provider(self._data_dir)
        sources = provider.load_sources()

        mapped = [map_source_to_domain(src, metadata) for src in sources]

        # Reuse the single DomainSchema from M75-A — no second schema introduced.
        schema = DomainSchema(
            name=metadata.domain_id,
            version="1.0",
            fields=(
                list(metadata.entity_types)
                + list(metadata.relationship_types)
                + ["source_id", "title", "type", "reference", "creator", "year", "license"]
            ),
        )

        by_type: Dict[str, int] = {}
        valid = 0
        for m in mapped:
            t = m.get("type") or "unknown"
            by_type[t] = by_type.get(t, 0) + 1
            if m["validation"]["valid"]:
                valid += 1

        stats = {
            "total": len(mapped),
            "valid": valid,
            "invalid": len(mapped) - valid,
            "by_type": by_type,
        }

        return AcquisitionResult(
            domain_id=metadata.domain_id,
            schema=schema,
            sources=mapped,
            stats=stats,
        )
