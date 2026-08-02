"""Backend test isolation - DB-B01 fix (test infrastructure only, no runtime changes).

Problem (verified via pytest repro):
  `_ADAPTERS` in app/core/domain/adapter.py is a MODULE-LEVEL global singleton shared
  across ALL test modules within a single pytest session. Some suites
  (e.g. test_domain_adapter_contract) only reset to baseline *inside* the test body via
  `_reset_to_baseline()`, leaving a dirty `"test"` entry at the end of the module.
  Downstream suites (e.g. test_m78_2_registry_lifecycle) snapshot/restore with their own
  fixture, but the snapshot they capture is already polluted, so the dirty entry is
  restored and assertions fail (order-dependent).

Fix:
  A single `autouse` fixture (scope=function) guarantees that EVERY test starts from, and
  ends at, the clean post-import baseline: only `history` is registered (eagerly
  registered by app.core.domain on import). This makes `_ADAPTERS` isolation global and
  order-independent without touching any Runtime / ADR / schema / API code.
"""

from __future__ import annotations

import pytest

# Importing the package triggers the eager `history` registration defined in
# app/core/domain/__init__.py, establishing the canonical clean baseline.
from app.core.domain import adapter as _domain_adapter
from app.core.domain.registry import AdapterRegistry
from app.core.domain.history_adapter import HistoryAdapter


def _reset_to_clean_baseline() -> None:
    """Force `_ADAPTERS` back to the post-import state: only `history` registered."""
    _domain_adapter._ADAPTERS.clear()
    AdapterRegistry.register(HistoryAdapter())


@pytest.fixture(autouse=True, scope="function")
def isolated_domain_registry():
    """Autouse, per-function isolation for the module-level `_ADAPTERS` singleton.

    Guarantees each test begins from, and leaves behind, the clean baseline
    (only `history`). Stops cross-test / cross-module pollution of the shared
    registry regardless of test execution order.
    """
    _reset_to_clean_baseline()
    yield
    _reset_to_clean_baseline()
