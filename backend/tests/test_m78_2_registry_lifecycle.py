"""M78.2 AdapterRegistry Lifecycle Completion - `unregister` contract tests.

Validates the symmetric `unregister` lifecycle API added in M78.2 (see ADR-M78-RL).

State isolation: `_ADAPTERS` is a MODULE-LEVEL registry shared across test functions
within a single pytest session. Every test uses the `registry_snapshot` fixture (or an
explicit snapshot/restore) so that no test pollutes the `history` baseline that other
suites (test_domain_adapter_contract, test_m77_*, test_ontology_contract) rely on.

Gate coverage:
  LC-1  unregister existing domain returns True and de-registers it
  LC-2  unregister missing domain returns False, registry unchanged
  LC-3  history unregister + restore keeps lookup working
  LC-4  Registry -> Adapter lookup compatibility after restore
"""
from __future__ import annotations

import pytest

from app.core.domain.adapter import (
    _ADAPTERS,
    BaseDomainAdapter,
    DomainMetadata,
    ValidationRules,
)
from app.core.domain.registry import AdapterRegistry
from app.core.domain.ontology import Ontology


class _LifecycleTestAdapter(BaseDomainAdapter):
    """A fresh adapter instance NOT eagerly registered on import."""

    def __init__(self, domain_id: str = "test") -> None:
        super().__init__(
            DomainMetadata(
                domain_id=domain_id,
                label="Lifecycle Test Adapter",
                ontology=Ontology(entity_types=(), relationship_types=()),
                description="M78.2 lifecycle contract test adapter",
            ),
            ValidationRules(
                required_fields=["domain_id"],
                allow_empty=False,
                strict_mode=True,
            ),
        )


@pytest.fixture
def registry_snapshot():
    """Save/Restore the module-level `_ADAPTERS` registry around a test.

    Snapshots the post-import baseline (history eagerly registered), yields for the
    test body, then restores the exact snapshot on teardown. Guarantees no cross-test
    pollution even when a test calls unregister() on the `history` key.
    """
    snapshot = dict(_ADAPTERS)
    yield
    _ADAPTERS.clear()
    _ADAPTERS.update(snapshot)


# LC-1 ----------------------------------------------------------------------
def test_unregister_existing_returns_true(registry_snapshot):
    """unregister on a registered domain_id removes it and returns True."""
    AdapterRegistry.register(_LifecycleTestAdapter("test"))
    assert AdapterRegistry.is_registered("test")

    assert AdapterRegistry.unregister("test") is True
    assert not AdapterRegistry.is_registered("test")


# LC-2 ----------------------------------------------------------------------
def test_unregister_missing_returns_false(registry_snapshot):
    """unregister on an unknown domain_id returns False and mutates nothing."""
    before = set(AdapterRegistry.registered_ids())

    assert AdapterRegistry.unregister("nonexistent-domain") is False

    assert set(AdapterRegistry.registered_ids()) == before
    assert AdapterRegistry.is_registered("history")  # baseline untouched


# LC-3 ----------------------------------------------------------------------
def test_history_unregister_then_restore(registry_snapshot):
    """Unregistering `history` then restoring the snapshot recovers lookup.

    `history` receives NO special unregister protection (ADR-M78-RL Contract Rule);
    it is removed like any other domain_id, but the snapshot/restore isolation fully
    recovers it for the rest of the session.
    """
    snapshot = dict(_ADAPTERS)

    assert AdapterRegistry.unregister("history") is True
    assert not AdapterRegistry.is_registered("history")

    # restore the snapshot within the test to prove lookup recovers
    _ADAPTERS.clear()
    _ADAPTERS.update(snapshot)
    assert AdapterRegistry.get("history") is not None


# LC-4 ----------------------------------------------------------------------
def test_lookup_compatibility_after_restore(registry_snapshot):
    """unregister does not perturb the adapter lookup contract after restore.

    After unregistering a temporary domain and restoring the baseline, the `history`
    adapter resolves with consistent metadata/domain_id - proving the symmetric
    lifecycle API preserves the lookup contract for surviving entries.
    """
    snapshot = dict(_ADAPTERS)

    AdapterRegistry.register(_LifecycleTestAdapter("test"))
    assert AdapterRegistry.unregister("test") is True

    # restore baseline explicitly so we can assert on the post-restore lookup contract
    _ADAPTERS.clear()
    _ADAPTERS.update(snapshot)

    history_adapter = AdapterRegistry.get("history")
    assert history_adapter is not None
    assert history_adapter.get_metadata().domain_id == "history"
    assert not AdapterRegistry.is_registered("test")
