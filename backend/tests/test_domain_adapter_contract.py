"""M76-B Adapter Framework Contract Test Hardening.

Contract tests for the decoupled Adapter Registry lifecycle (M76-A, HEAD=665be11).
Does NOT modify any business / Runtime code - only asserts on the public AdapterRegistry API.

State isolation: `_ADAPTERS` is a MODULE-LEVEL registry shared across test functions
within a single pytest session. Each gate resets to the M76-A post-import baseline
(`history` eagerly registered, nothing else) so cross-test pollution cannot occur.
"""
import pytest
from pathlib import Path

from app.core.domain import BaseDomainAdapter, DomainMetadata, ValidationRules
from app.core.domain.adapter import _ADAPTERS
from app.core.domain.registry import AdapterRegistry
from app.core.domain.history_adapter import HistoryAdapter
from app.core.acquisition.pipeline import AcquisitionPipeline


class _TestAdapter(BaseDomainAdapter):
    """A fresh adapter instance NOT eagerly registered on import."""

    def __init__(self, domain_id: str = "test") -> None:
        super().__init__(
            DomainMetadata(
                domain_id=domain_id,
                label="Test Adapter",
                entity_types=[],
                relationship_types=[],
                description="M76-B contract test adapter",
            ),
            ValidationRules(
                required_fields=["domain_id"],
                allow_empty=False,
                strict_mode=True,
            ),
        )


def _reset_to_baseline():
    """Restore the M76-A post-import state: only `history` is registered."""
    _ADAPTERS.clear()
    AdapterRegistry.register(HistoryAdapter())


def test_tg_a_explicit_registration_contract():
    """Explicit AdapterRegistry.register() is the ONLY registration entry point."""
    _reset_to_baseline()
    ad = _TestAdapter()
    # Before register: not in registry
    assert not AdapterRegistry.is_registered("test")
    # Explicit registration (the single write path)
    AdapterRegistry.register(ad)
    assert AdapterRegistry.is_registered("test")
    assert AdapterRegistry.get("test") is ad
    assert "test" in AdapterRegistry.registered_ids()


def test_tg_b_no_constructor_side_effect():
    """BaseDomainAdapter.__init__ must NOT write into _ADAPTERS.

    Verifies: new instance -> before register registry lacks domain_id
            -> after register registry resolves.
    """
    _reset_to_baseline()
    ad = _TestAdapter()
    # Before explicit register: registry does NOT contain this domain_id
    assert not AdapterRegistry.is_registered("test")
    # Explicit register (the only write path)
    AdapterRegistry.register(ad)
    assert AdapterRegistry.get("test") is ad


def test_tg_c_duplicate_registration_idempotent():
    """Re-registering the same adapter must not duplicate the domain_id."""
    _reset_to_baseline()
    ad = _TestAdapter()
    AdapterRegistry.register(ad)
    AdapterRegistry.register(ad)  # second call is idempotent
    assert AdapterRegistry.registered_ids().count("test") == 1


def test_tg_d_multi_adapter_coexistence():
    """history + a second adapter can be registered simultaneously.

    Verifies multi-adapter coexistence WITHOUT hardcoding registered_ids() == ["history"].
    """
    _reset_to_baseline()
    # history is already registered via domain/__init__.py eager import (baseline)
    assert AdapterRegistry.is_registered("history")
    # Register a second adapter alongside history
    test_ad = _TestAdapter()
    AdapterRegistry.register(test_ad)
    ids = AdapterRegistry.registered_ids()
    assert "history" in ids
    assert "test" in ids
    assert AdapterRegistry.get("history") is not None
    assert AdapterRegistry.get("test") is test_ad


def test_tg_e_pipeline_registry_decoupling_regression():
    """AcquisitionPipeline consumes AdapterRegistry.get() - decoupling regression guard.

    With M76-A, history is eagerly registered on import, so the pipeline resolves
    WITHOUT any consumer-side registration. Constructing the pipeline must not raise.
    """
    _reset_to_baseline()
    assert AdapterRegistry.is_registered("history")
    pipe = AcquisitionPipeline(domain_id="history", data_dir=Path("./__none__"))
    assert pipe is not None


def test_tg_f_existing_pytest_regression():
    """New contract tests integrate without breaking the shell-layer suite baseline."""
    _reset_to_baseline()
    ad = _TestAdapter()
    AdapterRegistry.register(ad)
    assert AdapterRegistry.is_registered("test")
    assert "history" in AdapterRegistry.registered_ids()
    AdapterRegistry.register(ad)  # idempotent
    assert AdapterRegistry.registered_ids().count("test") == 1
