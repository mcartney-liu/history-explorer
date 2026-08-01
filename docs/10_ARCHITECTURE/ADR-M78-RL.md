# ADR-M78-RL: AdapterRegistry `unregister` Lifecycle Completion

## Status
Proposed

## Context
M78-FR has formally placed `backend/app/core/domain` under Freeze Governance, and
ADR-M78-SB has defined the Domain / Schema boundary contract. `AdapterRegistry`
currently exposes the write and read entry points `register`, `get`, `all`,
`registered_ids`, and `is_registered` — but it lacks a symmetric lifecycle removal
capability. This ADR completes that lifecycle so that, for future explicit lifecycle
management scenarios, an adapter can be removed from the registry under a controlled,
observable contract rather than relying on ad-hoc `_ADAPTERS.clear()` + re-registration
hacks used only by test isolation helpers today.

This ADR does NOT presume any existing production requirement for removal; it only
establishes the contract for the cases where explicit unregistration is warranted.

## Current Reality
- `_ADAPTERS` is a **module-level singleton** (`adapter.py`), imported directly by
  `registry.py`. It is initialized empty and, on first `import app.core.domain`, the
  package init explicitly registers the single `history` adapter.
- `register(adapter)` writes `_ADAPTERS[adapter._metadata.domain_id] = adapter`.
- `register` with an **already-present `domain_id` silently overwrites** the prior
  reference (idempotent by key — re-registering the same id does not duplicate it).
- There is **no alias concept** anywhere in the framework: registration is keyed solely
  by `domain_id`; no secondary name or alias map exists.
- **No production code currently calls any removal API** — the only consumer
  (`AcquisitionPipeline`) reads via `AdapterRegistry.get()` and raises `ValueError` when
  a `domain_id` is absent.
- Tests isolate registry state via **snapshot / restore** of `_ADAPTERS`
  (`_reset_to_baseline()` in the contract suite and the `military_session` fixture in the
  M77 multi-domain suite), because the singleton is shared across the pytest session.

## Decision
Add a public classmethod to `AdapterRegistry`:

```python
@classmethod
def unregister(cls, domain_id: str) -> bool:
    if domain_id in _ADAPTERS:
        del _ADAPTERS[domain_id]
        return True
    return False
```

Semantics:
- **Present**: removes `_ADAPTERS[domain_id]` and returns `True`.
- **Absent**: returns `False` and raises **no exception** (idempotent, consistent with
  the existing `register` idempotency style).

## Contract Rule
All `domain_id` values use the **same** `unregister` contract. `history` receives **no
special protection or exemption** — unregistering `history` follows the identical path as
any other domain, and any code that does so is responsible for restoring the entry (as
test fixtures already do via snapshot/restore).

Explicitly forbidden under this contract:
- a `history` special case / guard,
- an alias-removal variant,
- a `clear()` convenience method.

## Non-goals
The following are explicitly out of scope for this ADR:
- `unregister_all()` / `clear()` bulk-removal APIs,
- any plugin lifecycle / hot-swap mechanism,
- dynamic loading of adapters at runtime,
- auto-discovery of adapter modules,
- a structural rewrite of the registry (the module-level `_ADAPTERS` singleton is
  retained).

## Governance
- The `domain` path is **already listed in the M78-FR `SCOPE_ALLOWLIST`**, so adding
  `unregister` within `backend/app/core/domain/registry.py` is inside the governed and
  pre-authorized scope.
- It does **not touch the Runtime Freeze**: the change stays within `domain/`, does not
  modify `ai_gateway/` Runtime, and introduces no new dependency.
- No **Freeze Revision** is required (the path is already under governance; this is an
  additive change).
- No **new allowlist entry** is needed (`backend/app/core/domain/` is already present).

## References
- ADR-M78-FR — Freeze Revision: domain governance + `SCOPE_ALLOWLIST` registration.
- ADR-M78-SB — Domain Schema Boundary Contract.
- Debt-3 — AdapterRegistry lifecycle completion.
