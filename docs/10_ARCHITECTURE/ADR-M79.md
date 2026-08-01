# ADR-M79: Causal Layer Boundary Contract

## Status

Proposed

## Context

M77 introduced the multi-domain framework and recorded **Debt-2 (Causal Logic Representation Gap)**
(`docs/10_ARCHITECTURE/M77_MULTI_DOMAIN_VALIDATION_ADR.md:57-60`): the current `Ontology`
(`backend/app/core/domain/ontology.py:28-29`) can only express `Entity` + `Relationship`
(`entity_types` / `relationship_types`). It has no structured causal dimensions —
no `Cause` / `Mechanism` / `Consequence` / `Confidence` / `Evidence`.

There is already an *event causal* surface in the system:

- M36.0 (`f27d0b6`) added an event causal layer whose edges are plain Knowledge Graph typed
  edges — `caused` / `influenced` / `before` / `after`
  (see `backend/tests/test_ai_gateway.py:209-218`).
- Those edges are **opaque**: the graph stores the link, but carries no causal *semantics*
  (no `mechanism`, `consequence`, `confidence`, or `evidence` attributes).

So the gap is not "more causal edges" — it is the absence of a structured causal *representation*
that sits on top of the graph and gives the links meaning.

Critically, M79 does **not** extend `Ontology` or `DomainSchema` to fill this gap:

- `ADR-M78-SB` §2.2 / §3 already forbids `Ontology` from carrying causal dimensions, and lists
  "Introducing causal dimensions into `Ontology` or any domain carrier" as an explicit non-goal.
- `ADR-M78-SB` §2.3 fixes `DomainSchema.fields` as derived solely from `Ontology`
  (`backend/app/core/domain/schemas.py:13-17`, `backend/app/core/acquisition/pipeline.py:63-67`).

M79 therefore establishes an **independent Causal Semantic Layer** that closes Debt-2 without
disturbing the M78-SB boundary contract.

## Decision

Introduce a new, self-contained package:

```
backend/app/core/causal/
```

as the **Causal Semantic Layer**. It owns its own model and carries causal meaning by
**referencing** existing Knowledge Graph / domain identifiers, never by extending the vocabulary.

The layer's core model (`CausalStatement`, created in M79 Phase 3) is a design contract with these
fields:

- `cause_id: str` — reference to an existing entity / event / relationship id in the KG.
- `effect_id: str` — reference to an existing entity / event / relationship id in the KG.
- `causal_type: str` — the kind of causal relation (e.g. `enable` / `trigger` / `inhibit`).
- `mechanism: str | None` — how the cause produces the effect.
- `consequence: str | None` — the observed or inferred outcome.
- `confidence: float | None` — strength / certainty of the causal claim.
- `evidence_refs: tuple[str, ...]` — references to supporting source / provenance identifiers.

These fields define the layer's **model contract**. They do not imply a full causal-inference
implementation in this milestone — M79 establishes the boundary and the model shape only.

`CausalStatement` is a **reference model**: it points at ids that already exist in the KG / domain
model. It is not an `Entity`, not a `Relationship`, and not an `Ontology` extension.

## Boundary Rules

The Causal Layer is an **interpretive semantic layer, not a domain vocabulary extension**.
The following are forbidden:

1. **Ontology MUST NOT gain causal fields.**
   No `causal_rules`, `inference_rules`, `mechanism`, or `consequence` may be added to
   `Ontology` or any domain carrier. (Reinforces `ADR-M78-SB` §2.2 / §3.)

2. **DomainSchema MUST NOT add causal fields.**
   `DomainSchema.fields` remains derived solely from `Ontology`
   (`schemas.py:13-17`, `pipeline.py:63-67`). Causal semantics never enter the pipeline output
   contract.

3. **Global Schema Constraint Baseline (8/18) MUST NOT hold causal definitions.**
   `backend/app/validation.py` stays the platform safety boundary; it does not and will not define
   causal vocabulary.

4. **KnowledgeGraph core MUST NOT be modified into a causal engine.**
   `backend/app/core/graph.py` keeps storing `caused` / `influenced` as opaque typed edges.
   The Causal Layer reads/references those ids; it does not rewrite the graph core.

5. **Causal Layer MUST NOT introduce independent entity vocabulary.**
   All entities / events referenced by `CausalStatement` MUST point at existing KG / domain
   identifiers. The Causal Layer is a semantic interpretation layer, **NOT** an ontology extension.

Correct layering:

```
Ontology            →  domain knowledge vocabulary (source of truth)
   ↓  (DomainSchema.fields derived from Ontology)
DomainSchema        →  pipeline output contract

KnowledgeGraph      →  node / edge storage (caused / influenced = opaque typed edges)
   │  entity / event / relationship ids
   ↓
Causal Layer        →  references KG ids, stores causal semantics (mechanism / consequence /
                       confidence / evidence_refs)

Causal Layer does NOT modify back:
   Ontology  ·  DomainSchema  ·  Graph Core
```

## Non-goals

The following are explicitly **out of scope** for M79 and belong to future milestones (M80+):

- causal inference
- Bayesian reasoning
- automatic causal discovery
- LLM-based causal extraction pipeline
- a causal reasoning / inference engine
- causal prediction

M79 is the architectural boundary and model contract only.

## Consequences

**Positive**

- Closes Debt-2's *representation* gap with an explicit, reviewable boundary.
- Causal semantics become auditable and separable from the graph storage.
- Reuses the proven M29.1 provenance pattern: an independent read-only model that references
  topic / KG ids without mutating the knowledge-graph core
  (`docs/15_DECISIONS/HEALTHCHECK_2026-07-30_BACKEND.md:25`).
- Consistent with `ADR-0003` (Grounded AI Interpretation Layer): an interpretation layer, not a
  vocabulary expansion.

**Negative**

- Adds an architecture contract that must be maintained; future changes touching `causal/` should
  be checked against this ADR.
- The boundary is documentation + model contract; enforcement relies on review discipline plus the
  M79 test suite (Phase 4), which asserts the layer stays decoupled from `Ontology` / `validation`
  / `DomainSchema`.

## Governance

- **Freeze Revision**: REQUIRED and already completed in M79 Phase 1 (commit `ab101d7`).
  `SCOPE_ALLOWLIST` gained two entries: the directory `backend/app/core/causal/` (trailing slash,
  matching the matcher's `p.endsWith("/") && file.startsWith(p)` branch) and the test file
  `backend/tests/test_m79_causal_layer.py`.
- **Runtime Freeze**: affected — M79 adds a new runtime region `backend/app/core/causal/`. The
  change is additive, introduces no new dependency, and modifies none of the frozen carriers
  (`ontology.py` / `validation.py` / `schemas.py` / `pipeline.py` / `adapter.py` / `graph.py`).
- **New ADR**: required — M79 introduces a cross-cutting architecture layer, exactly the case
  `ADR-M78-SB` / `ADR-M78-RL` were written for.

## References

- `ADR-M78-SB` — Domain Schema Boundary Contract (upstream boundary anchor: §2.2 / §3 / §4).
- `ADR-M78-FR` — Freeze Governance for `backend/app/core/domain/`.
- `ADR-M78-RL` — AdapterRegistry `unregister` Lifecycle Completion.
- `ADR-0003` (`docs/15_DECISIONS/ADR-0003_M61_grounded_ai_interpretation_layer.md`) — interpretation-layer precedent.
- M29.1 provenance read-only reference model (`docs/15_DECISIONS/HEALTHCHECK_2026-07-30_BACKEND.md:25`).
- `docs/10_ARCHITECTURE/M77_MULTI_DOMAIN_VALIDATION_ADR.md:57-60` — Debt-2 (Causal Logic Representation Gap).
- `backend/app/core/domain/ontology.py:28-29` (`Ontology`: `entity_types` / `relationship_types` only).
- `backend/app/core/domain/schemas.py:13-17`, `backend/app/core/acquisition/pipeline.py:63-67` (`DomainSchema.fields` derivation).
- `backend/app/core/domain/military_ontology.py:8` (M79 reserved comment: causal dimensions belong to M79, not the ontology).
- `backend/tests/test_ai_gateway.py:209-218` (existing event causal edges `caused` / `influenced` / `before` / `after`).
- M36.0 event causal layer (commit `f27d0b6`).
- M79 Phase 1 Freeze Revision commit `ab101d7` (`chore(freeze): allow M79 causal layer scope`).
