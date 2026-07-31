# ADR-0010 — API Evolution and Compatibility Strategy

## ADR Number

ADR-0010

## Title

API Evolution and Compatibility Strategy — v1 frozen + legacy dual-mount, forward-compatible design for Mobile / Institution / third-party integration (M73 planning record)

## Status

**Planned / Design-only (M73 Phase1)**. Approved as a strategy document only — **no backend change, no /api/v2 implementation**. The strategy becomes binding when the first v2-compatible change is proposed (M74+).

## Context

History Explorer's backend (`backend/app/main.py`) exposes a FastAPI surface mounted **twice**:
- canonical `/api/v1/*` (`v1_router`, `operation_id="v1_*"`)
- frozen legacy paths (`legacy_router`, `operation_id` without prefix) — v1 == legacy by design

Nine endpoints exist today: `explore/{topic}`, `entity/{entity_id}`, `entity/{entity_id}/recommendations`, `search`, `topics`, `health`, `healthz`, plus the M66 timeline/relationships surface. The frontend consumes these directly (`App.tsx` `API_BASE`, `aiClient.ts`).

**Future consumers** (per the M70+ roadmap and M73 Alpha direction):
- **Mobile** (M74-M76): same read model, bandwidth/offline concerns, needs stable envelope + explicit version
- **Institution Pilot** (M73-M75): whitelisted access patterns, auditability, stable contracts
- **Third-party / Creator ecosystem** (M77+): public read API for package consumption, provenance headers

The gap: today's API has **no explicit version negotiation** beyond the static `/api/v1` prefix and no documented breaking-change process. The dual-mount is a compatibility freeze, not an evolution mechanism.

## Decision

1. **Keep v1 frozen and the legacy dual-mount untouched** — it is the compatibility baseline (all 247 backend tests + frontend contract depend on it). No endpoint, field, or response shape may change under `/api/v1` without a Freeze Revision Gate.

2. **Adopt a versioned envelope for NEW surfaces** (only when a new surface is actually needed — not now):
   - Every response gains a stable envelope: `{ "api_version": "1", "data": ..., "meta": { "trace_id", "requested_at" } }` — additive, applied to new endpoints only; v1 payloads are NOT re-wrapped (would break frontend).
   - Version negotiation: `Accept: application/json; version=1` header (preferred) with `/api/v2/*` path fallback; `/api/v1` continues to serve v1 semantics forever.

3. **Breaking-change process (binding when v2 arrives):**
   - Any breaking change ships as **new endpoint + deprecated old one** (deprecation header `Deprecation: true` + `Sunset` date).
   - Minimum **one milestone deprecation window** before removal; `release-consistency-check` gains a rule that docs list deprecations.
   - A breaking change requires an ADR + PO approval (same gate as freeze revisions).

4. **Contract documentation** (M74, before Mobile/Institution work starts):
   - OpenAPI schema for `/api/v1` published as the single source of truth for third parties.
   - Field-level stability contract: `entity_id` / `global_id` / `source_id` referencing remains the stable identity scheme (local id ↔ global id mapping preserved).

## Consequences

- **Positive**: Mobile/Institution/third-party consumers get a stable, documented, versioned contract; legacy stays untouched; no churn in the frozen freeze baseline.
- **Negative / cost**: envelope + versioning work is deferred but must be scheduled before M74 integration; new surfaces add test surface.
- **Deferred**: actual `/api/v2` implementation, OpenAPI publication, deprecation tooling — all out of M73 scope (this ADR is the strategy record only).

## Alternatives Considered

- **Full rewrite to /api/v2 now**: rejected — would break the frontend contract and violate the freeze baseline for zero current benefit.
- **Header-only versioning without envelope**: adopted for negotiation, but the envelope is still needed for traceability on new surfaces.
- **Do nothing**: rejected — Mobile/Institution (M74+) will otherwise start ad-hoc endpoint evolution.

## Redline Impact

None. backend diff = 0; runtime 0.13.0 unchanged; no dependency; no LLM; no accounts/cloud. This ADR is a design record only.
