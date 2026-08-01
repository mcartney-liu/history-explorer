"""Knowledge Acquisition Pipeline — M75-C.

Deterministic SourceRecord → DomainSchema Alignment Layer.

NOT an LLM / Agent / OCR / Entity-discovery / Relationship-discovery engine.
Consumes:
  - M75-A Domain Adapter (AdapterRegistry, DomainMetadata, DomainSchema)
  - M25.1 + M75-B DatasetProvider.load_sources() (FileSourceLoader activated)
"""
from __future__ import annotations

from .mapping import map_source_to_domain
from .pipeline import AcquisitionPipeline, AcquisitionResult

__all__ = ["AcquisitionPipeline", "AcquisitionResult", "map_source_to_domain"]
