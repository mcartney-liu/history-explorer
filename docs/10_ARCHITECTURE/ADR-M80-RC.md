# ADR-M80-RC: Runtime Consumption Contract (Acquisition Data Flow)

## Status
Accepted (2026-08-14 — PO acceptance via M80 Gate B closure; decision recorded in PO_DECISIONS_2026-08-08 §14/§15)

## Related
- ADR-M80-MAP — Ontology Mapping Contract
- ADR-M78-FR / ADR-M78-SB / ADR-M78-RL
- ADR-M79 — Causal Layer Boundary

## Context
Define the standard data flow from raw data ingress to the global knowledge
graph, locate the Mapping contract injection point, and identify the single
production-consumption point (`pipeline.py:49` `AdapterRegistry.get`).

## Acquisition Data Flow (M80-B1 rev-5)
Standard flow (linear, unidirectional, Validation cannot be bypassed):

```
Raw Source
   |  (external raw data, any format)
   v
Acquisition
   |  (collect / normalize into Domain Record structure;
   |   does NOT alter ontology semantics)
   v
Domain Record
   |  (contains local relation type + ontology_origin candidate)
   v
Mapping                 <-- ADR-M80-MAP injects HERE
   |  (equivalence translation + provenance;
   |   outputs MAPPED / PARTIAL / UNMAPPED)
   v
Validation
   |  (Freeze Guard: ENTITY_TYPES=8 / RELATIONSHIP_TYPES=18 strict check;
   |   UNMAPPED does NOT pass; PARTIAL must carry fallback marker)
   v
GlobalGraph
      (final globally consumable graph for Knowledge Graph Layer)
```

Constraint: any relation entering GlobalGraph MUST pass through both Mapping
and Validation. Raw Source MUST NOT bypass Acquisition and write directly into
Domain Record.

## Consumption Point (carried)
- `pipeline.py:49` `AdapterRegistry.get(self._domain_id)` is the single
  production-consumption point.
- `causal` / `acquisition` currently have NO consumers; not activated within
  this ADR's scope.
- The Runtime adapter layer consumes ONLY via the Mapping result published by
  the Governance Layer; it does NOT define its own translation logic (echoing
  ADR-M80-MAP §Layer Ownership).

## Runtime / Mapping Decoupling (echoes ADR-M80-MAP §Decoupling)
- Runtime-side weighting (`RELATIONSHIP_MEANING`) does NOT participate in this
  flow's type adjudication.
- Mapping produces "type + provenance"; Runtime overlays presentation weight on
  top — responsibilities separated, neither rewrites the other.

## Constraints
- Validation strictly guards the Freeze baseline; Mapping MUST NOT let a
  non-white-list relation pass Validation under a "mapped" identity.
- Do NOT modify code, do NOT add a runtime reverse-write-vocabulary path.

## Consequences
- Data flow is unidirectionally clear, Mapping injection point explicit, easy to
  audit and test.
- Closes the loop with ADR-M80-MAP's Layer ownership, provenance, and
  three-state design.
- Implementation depends on M80-B2's `mapping.py` and doc sync (this ADR does
  NOT implement).

## Implementation Note (M80-B2)
`mapping.py` skeleton provides the three-state contract API consumed at the
Mapping stage above. It is intentionally NOT wired into the Acquisition
pipeline, Graph runtime, Causal, or Exploration Engine per M80-B2 authorization
scope. Wiring is deferred to a later milestone requiring separate PO approval.

## References
- ADR-M80-MAP — Ontology Mapping Contract.
- ADR-M78-FR / ADR-M78-SB / ADR-M78-RL — Domain Governance foundation.
- ADR-M79 — Causal Layer Boundary.
- DB-B02 — new layers (domain/causal/acquisition) zero Runtime consumption.
