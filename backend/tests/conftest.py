"""Pytest session isolation for the module-level `_ADAPTERS` domain registry.

`_ADAPTERS` (app/core/domain/adapter.py) is a module-level singleton shared across
all test modules within a single pytest session. Individual test files use their own
snapshot/restore or `_reset_to_baseline()` helpers, but some leave a residual adapter
(e.g. "test") at file-scope end. When a later file snapshots the "current state" it
captures that pollution, and restore re-solidifies it -- breaking
test_m78_2_registry_lifecycle::test_lookup_compatibility_after_restore under full runs.

This autouse fixture force-restores the import baseline (`history` only) after EVERY
test, regardless of per-file cleanup, guaranteeing a clean `_ADAPTERS` for the next
test. It is a test-infrastructure guard only: it does not touch production code,
the 8/18 freeze, the Runtime, or the AI boundary.
"""
import pytest

from app.core.domain.adapter import _ADAPTERS
from app.core.domain.history_adapter import HistoryAdapter
from app.core.domain.registry import AdapterRegistry


@pytest.fixture(autouse=True)
def _isolate_domain_registry():
    """Force-restore the import baseline after each test."""
    yield
    _ADAPTERS.clear()
    AdapterRegistry.register(HistoryAdapter())
