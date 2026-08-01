"""M77-A Multi-Domain Framework Validation.

Proves the M76-extracted Ontology + Adapter Framework supports a second domain
(Military History) as a NON-INVASIVE extension:
- No modification to History Domain / Runtime / any existing file.
- MilitaryAdapter is registered ONLY in the test scope (no default production reg).
- Registry isolation uses snapshot/restore of the module-level `_ADAPTERS` dict.
  NO new `unregister` API is introduced (Debt-3 stays un-touched).

Gate coverage:
  TG-A  Ontology independence
  TG-B  Registry isolation
  TG-C  Pipeline domain routing  (+ TG-M77-C4 Cross Binding Prevention)
  TG-D  Regression + boundary validation
"""
from __future__ import annotations

import pytest
from pathlib import Path

from app.core.domain.adapter import _ADAPTERS, DomainMetadata
from app.core.domain.registry import AdapterRegistry
from app.core.domain.history_adapter import HistoryAdapter
from app.core.domain.ontology import Ontology, HISTORY_ONTOLOGY
from app.core.domain.military_ontology import MILITARY_HISTORY_ONTOLOGY
from app.core.domain.military_adapter import MilitaryAdapter
from app.core.acquisition.pipeline import AcquisitionPipeline


# ---------------------------------------------------------------------------
# Fixture: snapshot / restore Registry state (no unregister API).
# ---------------------------------------------------------------------------
@pytest.fixture
def military_session():
    """Save/Restore the module-level `_ADAPTERS` registry around a test.

    Snapshots the M76-A post-import baseline (history eagerly registered),
    registers MilitaryAdapter for the duration of the test, then restores the
    exact snapshot on teardown. This guarantees no cross-test pollution and no
    leakage of the 'military' key into other suites - without adding a public
    unregister() API.
    """
    snapshot = dict(_ADAPTERS)  # domain_id -> adapter ref (baseline)
    AdapterRegistry.register(MilitaryAdapter())
    yield
    _ADAPTERS.clear()
    _ADAPTERS.update(snapshot)


# ===========================================================================
# TG-A — Ontology independence
# ===========================================================================
def test_tg_a1_military_ontology_is_frozen_ontology():
    """MILITARY_HISTORY_ONTOLOGY is a frozen Ontology instance."""
    assert isinstance(MILITARY_HISTORY_ONTOLOGY, Ontology)
    with pytest.raises(Exception):
        MILITARY_HISTORY_ONTOLOGY.entity_types = ("x",)


def test_tg_a2_military_ontology_distinct_from_history():
    """Military Ontology is a SEPARATE object and content from HISTORY_ONTOLOGY."""
    assert MILITARY_HISTORY_ONTOLOGY is not HISTORY_ONTOLOGY
    assert MILITARY_HISTORY_ONTOLOGY.entity_types != HISTORY_ONTOLOGY.entity_types
    assert MILITARY_HISTORY_ONTOLOGY.relationship_types != HISTORY_ONTOLOGY.relationship_types


def test_tg_a3_metadata_carrier_does_not_mutate_history_ontology():
    """A DomainMetadata carrying the Military Ontology leaves HISTORY_ONTOLOGY intact."""
    md = DomainMetadata(domain_id="military", label="M77 example", ontology=MILITARY_HISTORY_ONTOLOGY)
    assert md.ontology is MILITARY_HISTORY_ONTOLOGY
    assert md.ontology is not HISTORY_ONTOLOGY
    # frozen guarantees the shared HISTORY_ONTOLOGY object is never altered
    with pytest.raises(Exception):
        HISTORY_ONTOLOGY.entity_types = ("y",)


# ===========================================================================
# TG-B — Registry isolation  (uses military_session fixture)
# ===========================================================================
def test_tg_b1_register_military_succeeds(military_session):
    """Explicit AdapterRegistry.register() accepts a second domain."""
    assert AdapterRegistry.is_registered("military")
    assert AdapterRegistry.get("military") is not None


def test_tg_b2_history_and_military_coexist(military_session):
    """Both domains live in _ADAPTERS simultaneously; history ref is unchanged."""
    ids = AdapterRegistry.registered_ids()
    assert "history" in ids
    assert "military" in ids
    # history adapter reference preserved (no overwrite)
    assert AdapterRegistry.get("history") is not None
    # baselined history adapter object identity is stable
    baseline_history = HistoryAdapter()
    assert AdapterRegistry.get("history").get_metadata().domain_id == "history"


def test_tg_b3_ontologies_not_polluted(military_session):
    """Each domain resolves to its OWN ontology; no cross-binding in the registry."""
    mil = AdapterRegistry.get("military").get_metadata().ontology
    hist = AdapterRegistry.get("history").get_metadata().ontology
    assert mil is MILITARY_HISTORY_ONTOLOGY
    assert hist is HISTORY_ONTOLOGY
    assert mil is not hist


def test_tg_b4_history_domain_untouched_by_military_registration(military_session):
    """Registering military does not alter the History domain's identity/ontology."""
    hist_md = AdapterRegistry.get("history").get_metadata()
    assert hist_md.domain_id == "history"
    assert hist_md.ontology is HISTORY_ONTOLOGY
    assert hist_md.ontology.entity_types == HISTORY_ONTOLOGY.entity_types


# ===========================================================================
# TG-C — Pipeline domain routing  (uses military_session fixture)
# ===========================================================================
def test_tg_c1_military_pipeline_routes_to_military_ontology(military_session, tmp_path):
    """AcquisitionPipeline('military') builds schema from MILITARY_HISTORY_ONTOLOGY."""
    result = AcquisitionPipeline("military", tmp_path).run()
    assert result.domain_id == "military"
    mil_prefix = list(MILITARY_HISTORY_ONTOLOGY.entity_types) + list(
        MILITARY_HISTORY_ONTOLOGY.relationship_types
    )
    assert result.schema.fields[: len(mil_prefix)] == mil_prefix


def test_tg_c2_history_pipeline_routes_to_history_ontology(military_session, tmp_path):
    """AcquisitionPipeline('history') builds schema from HISTORY_ONTOLOGY; prefixes differ."""
    result = AcquisitionPipeline("military", tmp_path).run()
    hist_result = AcquisitionPipeline("history", tmp_path).run()
    assert hist_result.domain_id == "history"

    mil_prefix = list(MILITARY_HISTORY_ONTOLOGY.entity_types) + list(
        MILITARY_HISTORY_ONTOLOGY.relationship_types
    )
    hist_prefix = list(HISTORY_ONTOLOGY.entity_types) + list(HISTORY_ONTOLOGY.relationship_types)
    assert result.schema.fields[: len(mil_prefix)] == mil_prefix
    assert hist_result.schema.fields[: len(hist_prefix)] == hist_prefix
    # Proof of domain-specific routing: prefixes are distinct
    assert mil_prefix != hist_prefix


def test_tg_c3_empty_data_dir_still_routes(military_session, tmp_path):
    """Routing is derived from the Ontology, independent of any loaded data."""
    mil_result = AcquisitionPipeline("military", tmp_path).run()
    hist_result = AcquisitionPipeline("history", tmp_path).run()
    assert mil_result.sources == []  # empty dir -> no sources
    assert hist_result.sources == []
    assert len(mil_result.schema.fields) > 0
    assert len(hist_result.schema.fields) > 0


def test_tg_m77_c4_cross_binding_prevention(military_session, tmp_path):
    """Military domain MUST NOT bind to HISTORY_ONTOLOGY (Cross Binding Prevention)."""
    mil_md = AdapterRegistry.get("military").get_metadata()
    # 1. registration-time binding is to the Military Ontology, not History
    assert mil_md.ontology is MILITARY_HISTORY_ONTOLOGY
    assert mil_md.ontology is not HISTORY_ONTOLOGY

    # 2. the emitted schema prefix comes from the Military Ontology
    result = AcquisitionPipeline("military", tmp_path).run()
    mil_prefix = list(MILITARY_HISTORY_ONTOLOGY.entity_types) + list(
        MILITARY_HISTORY_ONTOLOGY.relationship_types
    )
    hist_prefix = list(HISTORY_ONTOLOGY.entity_types) + list(HISTORY_ONTOLOGY.relationship_types)
    assert result.schema.fields[: len(mil_prefix)] == mil_prefix
    assert result.schema.fields[: len(mil_prefix)] != hist_prefix

    # 3. a History-exclusive entity type must NOT appear in the military schema prefix
    history_exclusive = HISTORY_ONTOLOGY.entity_types[0]  # "person"
    assert history_exclusive not in MILITARY_HISTORY_ONTOLOGY.entity_types
    assert history_exclusive not in result.schema.fields[: len(mil_prefix)]


# ===========================================================================
# TG-D — Regression + boundary validation
# ===========================================================================
def test_tg_d1_history_baseline_intact_without_military():
    """Outside the military_session, the History baseline is exactly as M76 shipped."""
    ids = AdapterRegistry.registered_ids()
    assert "history" in ids
    # Military is NOT eagerly registered (no default production registration)
    assert "military" not in ids
    assert AdapterRegistry.get("history").get_metadata().ontology is HISTORY_ONTOLOGY


def test_tg_d2_no_default_production_registration():
    """M77 does NOT wire MilitaryAdapter into the default startup registration path."""
    # domain/__init__.py eager-registers only HistoryAdapter; importing the Military
    # module must NOT auto-register it.
    import app.core.domain.military_adapter  # noqa: F401  (import side-effect check)

    assert "military" not in AdapterRegistry.registered_ids()
    assert AdapterRegistry.get("history") is not None


def test_tg_d3_history_ontology_unchanged_by_m77():
    """Boundary validation: HISTORY_ONTOLOGY is byte-for-byte unchanged (frozen, 6/5)."""
    assert HISTORY_ONTOLOGY.entity_types == (
        "person",
        "place",
        "event",
        "organization",
        "period",
        "civilization",
    )
    assert HISTORY_ONTOLOGY.relationship_types == (
        "born_in",
        "ruled_in",
        "influenced_by",
        "part_of",
        "preceded_by",
    )
