# ADR-M80-MAP: Ontology Mapping Contract (Domain Governance Layer)

## Status
Accepted (2026-08-14 — PO acceptance via M80 Gate B closure; decision recorded in PO_DECISIONS_2026-08-08 §14/§15)

## Related
- ADR-M78-FR — Domain Registration Freeze
- ADR-M78-SB — Schema Boundary
- ADR-M78-RL — Registry Lifecycle
- ADR-M79 — Causal Layer Boundary
- ADR-M80-RC — Runtime Consumption Contract (Acquisition Data Flow)

## Context
After the ontology freeze (M78), several domains (e.g. person / event / place)
expose **local relationship types** that are not present in the Global Ontology
white-list (`HISTORY_ONTOLOGY`: 6 entity / 5 rel; frozen `RELATIONSHIP_TYPES=18`
in `validation.py`). Examples: `born_in` / `ruled_in` are NOT in the 18 white-list.

To consume these local relations **without touching the Freeze baseline and
without expanding the white-list**, a declarative equivalence-translation
contract — the Mapping Contract — must live in the **Domain Governance Layer**,
translating local relation types into the Global Ontology semantic space while
preserving their source traceability.

The Mapping Contract is a governance-layer facility (analogous to ADR-M78-RL's
registry lifecycle management). It is NOT part of any specific Domain's
implementation logic.

## Layer Ownership (M80-B1 rev-1)
Mapping Contract belongs to the **Domain Governance Layer**:

```
Knowledge Graph Layer        <- consumes Mapping output (GlobalGraph)
      ^
      | (after Validation guard)
Domain Governance Layer      <- Mapping Contract defined HERE (this ADR)
      |                            - declarative equivalence translation
      |                            - provenance retention
Domain Layer (per-domain)    <- supplies Raw Relation Type + Origin
      (NOT owner of Mapping)
```

Forbidden: hard-coding translation logic inside a specific Domain Layer.
Mapping is uniformly adjudicated by the governance layer.

## Semantic Provenance (M80-B1 rev-2)
Every Mapping record MUST retain semantic provenance, with at least:

- `ontology_origin`: global ontology semantic anchor
  (e.g. `HISTORY_ONTOLOGY.relationships["part_of"]`)
- `source_relation_type`: original local relation type name being mapped
  (e.g. `"born_in"`, `"ruled_in"`)
- `mapping_id`: unique contract identifier
- `declared_at`: contract declaration timestamp
- `governance_layer_version`: governance-layer version stamp

Purpose: any GlobalGraph node can be traced back to "which Domain's which
original relation, translated by which Mapping contract" — satisfying audit
and drift-detection needs.

## Three-State Mapping (M80-B1 rev-3)
Mapping does NOT require an exact equivalent to be found. Each contract result
is one of three states:

- `MAPPED`: local relation can be equivalently translated to a Global Ontology
  relation (semantically faithful, unambiguously consumable).
- `PARTIAL`: only part of the semantics can be mapped; untranslatable aspect
  MUST be annotated; downstream consumers MUST handle via fallback / marker.
- `UNMAPPED`: currently no corresponding Global Ontology relation; the relation
  does NOT enter GlobalGraph, retained only inside the Domain Record.

The three-state design avoids the impulse to "force-expand the white-list to
complete a mapping", upholding the Freeze red line by design.

## Decoupling from RELATIONSHIP_MEANING (M80-B1 rev-4)
The Mapping Contract is **NOT bound** to `RELATIONSHIP_MEANING` (18 weighted
entries, third vocabulary source, DB-B04 drift source) in
`exploration_engine.py`:

- `RELATIONSHIP_MEANING` belongs to the Runtime / Presentation layer's semantic
  weighting expression, orthogonal to the governance-layer Mapping contract.
- **DB-B04 (vocabulary-source drift) is NOT closed within this ADR**; its
  ownership and fix path remain as-is, deferred to a separate topic (out of
  M80-B scope).
- Mapping outputs "relation type + provenance" and carries NO weight /
  presentation semantics; weight consumption remains the independent
  responsibility of `RELATIONSHIP_MEANING` on the runtime side.

## Constraints (Red Lines, carried from M80-B1)
- Do NOT modify `ENTITY_TYPES=8` / `RELATIONSHIP_TYPES=18` freeze baseline in
  `validation.py`.
- Do NOT expand the 18 relationship white-list.
- Do NOT let runtime rewrite global vocabulary in reverse.
- Mapping only performs "equivalence translation + provenance retention"; it
  does not alter ontology semantic definitions.

## Consequences
- Local non-white-list relations can be governed-consumed without touching
  Freeze.
- Provenance makes audit / drift detection feasible.
- Three-state explicitly handles "unmappable" cases, avoiding silent data loss
  or white-list bloat.
- Requires maintaining a Mapping Contract registry (implementation: M80-B2
  `mapping.py`; this ADR does NOT implement).

## Implementation Note (M80-B2)
A contract skeleton `backend/app/core/domain/mapping.py` is added under M80-B2
with three-state translation + provenance recording + drift guard. It does NOT
bind `RELATIONSHIP_MEANING` and does NOT expand the white-list. No Freeze
Revision required (additive, within governed `domain/` scope).

## References
- ADR-M78-FR / ADR-M78-SB / ADR-M78-RL — Domain Governance foundation.
- ADR-M79 — Causal Layer Boundary.
- ADR-M80-RC — Runtime Consumption Contract.
- DB-B03 — missing declarative mapping layer (addressed by this ADR).
- DB-B04 — drift guard (explicitly out of scope here).
