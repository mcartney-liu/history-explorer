"""M76-C1 Ontology Extraction contract tests.

Verifies the standalone strongly-typed Ontology object and the unchanged
History Adapter / Registry / Pipeline behavior (adapter.py / registry.py /
pipeline.py / schemas.py stay frozen — DomainMetadata lives in adapter.py,
DomainSchema in schemas.py).
"""

from __future__ import annotations

import pytest
from pathlib import Path

from app.core.domain.adapter import DomainMetadata, ValidationRules
from app.core.domain.registry import AdapterRegistry
from app.core.domain.history_adapter import HistoryAdapter
from app.core.acquisition.pipeline import AcquisitionPipeline
from app.core.domain.ontology import Ontology, HISTORY_ONTOLOGY

# build_dataset_provider resolves sources.json as Path(data_dir).parent / "sources.json",
# so data_dir must sit ONE level under the real data/ folder for the loader to find it.
_DATA_DIR = Path(__file__).resolve().parents[2] / "data" / "history"


def test_tg1_ontology_is_frozen_dataclass():
    """Ontology is an immutable frozen dataclass (not dict / not List)."""
    assert isinstance(HISTORY_ONTOLOGY, Ontology)
    with pytest.raises(Exception):
        HISTORY_ONTOLOGY.entity_types = ("x",)


def test_tg2_history_adapter_registry_compatible():
    """HistoryAdapter still resolves via AdapterRegistry after eager import-time registration."""
    assert AdapterRegistry.get("history") is not None


def test_tg3_registry_regression():
    """Registered ids still contain 'history' (registry.py unchanged)."""
    assert "history" in AdapterRegistry.registered_ids()


def test_tg4_pipeline_regression():
    """AcquisitionPipeline('history', data_dir).run() still returns 43 sources (pipeline.py unchanged)."""
    result = AcquisitionPipeline("history", _DATA_DIR).run()
    assert len(result.sources) == 43


def test_tg5_mutation_protection():
    """Frozen dataclass -> .append() on tuple raises AttributeError (no dict mutation)."""
    with pytest.raises(Exception):
        HISTORY_ONTOLOGY.entity_types.append("x")


def test_tg6_legacy_schema_removed():
    """DomainSchema (schemas.py) correctly has NO entity_types / relationship_types."""
    from app.core.domain.schemas import DomainSchema

    assert not hasattr(DomainSchema, "entity_types")
    assert not hasattr(DomainSchema, "relationship_types")


def test_tg7_single_source_contract():
    """M76-C1 Extraction Completion — single source of truth.
    
    - HistoryAdapter metadata uses HISTORY_ONTOLOGY (no inline lists)
    - DomainMetadata no longer carries inline entity_types / relationship_types
    """
    from dataclasses import fields

    adapter = HistoryAdapter()
    assert adapter._metadata.ontology == HISTORY_ONTOLOGY

    dm_fields = {f.name for f in fields(DomainMetadata)}
    assert "entity_types" not in dm_fields
    assert "relationship_types" not in dm_fields


def test_tg8_pipeline_consumer_migration():
    """TG8 Consumer Migration Contract.

    AcquisitionPipeline (acquisition/pipeline.py) consumes the extracted
    Ontology via ``metadata.ontology`` — NOT the removed inline
    ``metadata.entity_types`` / ``metadata.relationship_types``.

    Verifies the pipeline's field-access path resolves through the single
    ``ontology`` carrier on DomainMetadata, equal to HISTORY_ONTOLOGY.
    """
    adapter = HistoryAdapter()
    md = adapter.get_metadata()
    # pipeline.py accesses md.ontology.entity_types / .relationship_types
    assert md.ontology.entity_types == HISTORY_ONTOLOGY.entity_types
    assert md.ontology.relationship_types == HISTORY_ONTOLOGY.relationship_types
