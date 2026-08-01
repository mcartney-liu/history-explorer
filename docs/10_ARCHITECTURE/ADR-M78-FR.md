# ADR-M78-FR: Register backend/app/core/domain into Freeze Governance

## Status

Proposed

## Context

M77-A introduced the multi-domain framework under `backend/app/core/domain/`. The directory contains:

- `ontology.py` — `Ontology` frozen dataclass and `HISTORY_ONTOLOGY`
- `adapter.py` — `BaseDomainAdapter` and `DomainMetadata`
- `registry.py` — `AdapterRegistry`
- `schemas.py` — `DomainSchema`
- `history_adapter.py` — `HistoryAdapter`
- `military_adapter.py` — `MilitaryAdapter` and `MILITARY_HISTORY_ONTOLOGY`

These files were released in M77-A (commit `73a8cbd`) and are already part of the shipped backend. However, `backend/app/core/domain/` is currently **not** present in the `SCOPE_ALLOWLIST` of `scripts/freeze-check.mjs`. As a result, changes under this path were not included in freeze-check scope evaluation.

### Findings Absorption

Two findings from the M78 Reality Audit must be reflected in all M78 documentation:

- **EvidenceClaim**: `EvidenceClaim` (in `evidence_claim.py`) has no `confidence` field. Documentation must not reference `evidence_claim.confidence`.
- **SOURCE_TYPES**: the real enumeration in `source_registry.py` is the 7-value set `{primary, secondary, archival, literature, inscription, oral, other}`. The `primary/academic/reference` three-tier model does not reflect the actual `SOURCE_TYPES` and must not be used.

## Historical Audit

The M78 Historical Freeze Audit examined why `backend/app/core/domain/` was not evaluated by freeze-check during the M77 release.

- `scripts/freeze-check.mjs` obtains changed files via `git diff --name-only master...HEAD`.
- The M77 release was performed by direct push-to-master.
- After the push, `master...HEAD` contained no changed files (the diff was empty).
- Because the diff input was empty, `backend/app/core/domain/` files were not included in freeze-check scope evaluation.

This is a property of the diff-based scope mechanism, not a change to any source file. The audit concluded that, during the M77 release event, `backend/app/core/domain/` files were not included in freeze-check scope evaluation because the release event produced an empty `master...HEAD` diff.

## Decision

This ADR approves a single, additive change:

- Register the prefix `backend/app/core/domain/` into `SCOPE_ALLOWLIST` in `scripts/freeze-check.mjs`.

Explicitly within the scope of this decision:

- The registration is **additive only** (one new prefix entry; no existing allowlist entry is modified or removed).
- **No Runtime Freeze boundary change.**
- **No Runtime behavior change.**
- **No framework semantic change.**

## Scope Boundary

This ADR approves **only** the `backend/app/core/domain/` prefix. It does **not** approve any other backend path, module, or directory. Any future addition of a backend location to `SCOPE_ALLOWLIST` requires its own separate ADR and Freeze Gate approval.

## Consequences

Positive:

- Domain framework changes under `backend/app/core/domain/` now enter formal Freeze Governance.
- Future M78 backend evolution has an explicit governance path through the Freeze Gate.

Limitations:

- The freeze-check diff-based mechanism remains unchanged (scope is still derived from `git diff master...HEAD`).
- The release-mode validation improvement (verification against a release baseline instead of `master...HEAD`) is deferred and is outside the scope of this ADR.

## Deferred Recommendation

A future evaluation may consider adding release-mode verification to freeze-check, so that scope validation runs against the release baseline instead of `master...HEAD`. This recommendation is intentionally deferred and is outside the scope of M78. It is not implemented by this ADR, and `scripts/freeze-check.mjs` is not modified by this ADR.

## Verification

- `SCOPE_ALLOWLIST` contains `backend/app/core/domain/`.
- Local `node scripts/freeze-check.mjs` confirms that diffs touching `backend/app/core/domain/` are evaluated through scope checking after allowlist registration.
- Existing allowlist entries are unmodified (additive only).
- `backend/` Runtime Freeze guard paths (`ai_gateway/`, `evidence_claim/`, `exploration/`, `dataset_provider/`, `source_registry/`, `runtime/`, etc.) are untouched.
- No commit / tag / push is performed during this ADR preparation; the change lands only after PO approval and the Freeze Gate.

## References

- M78 Reality Audit Report
- M78 Historical Freeze Audit Report
- M78 Freeze Revision Proposal — Final QA Report
- `scripts/freeze-check.mjs` (`SCOPE_ALLOWLIST`, `getChangedFiles`, `checkScope`, `_scopeAllowed`)
- M77-A commit `73a8cbd` (multi-domain framework: `military_ontology.py`, `military_adapter.py`, `test_m77_multi_domain_framework.py`)
- `.github/workflows/ci.yml` (freeze-check job trigger)
