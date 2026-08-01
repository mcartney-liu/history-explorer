# ADR-M78-SB: Domain Schema Boundary Contract

## Status

Proposed

## 1. Context

The multi-domain framework under `backend/app/core/domain/` defines a domain through three distinct carriers. Their current relationship, taken from the actual source:

**Ontology** (`ontology.py:20-29`)
- `entity_types` — tuple of entity vocabulary
- `relationship_types` — tuple of relationship vocabulary
- frozen dataclass; `HISTORY_ONTOLOGY` = 6 entity / 5 relation; `MILITARY_HISTORY_ONTOLOGY` = 5 / 5

**DomainMetadata** (`adapter.py:36-41`)
- domain identity (`domain_id`, `label`)
- ontology reference (holds one `Ontology` instance, default `HISTORY_ONTOLOGY`)
- `description`
- does not define its own schema fields

**DomainSchema** (`schemas.py:13-17`)
- pipeline output container (`name`, `version`, `fields`)
- instantiated at `acquisition/pipeline.py:60`; its `fields` are assembled at runtime from `metadata.ontology.entity_types + relationship_types + fixed source fields` (pipeline.py:63-67)

**Current problems**
- The responsibilities of `Ontology`, `DomainMetadata`, and `DomainSchema` are not stated as an explicit contract. Each file documents its own surface, but no artifact defines how the three relate.
- `DomainSchema.fields` is derived from `Ontology` only through inline assembly inside `pipeline.py`. There is currently no explicit architectural contract preventing future changes from introducing a second, competing schema source — a latent double-schema-source drift risk.
- The Global Schema Constraint Baseline (8/18) in `validation.py` exists independently of the domain `Ontology`. The two are not bridged or even referenced. `military_ontology.py:7` already records this separation: "Does NOT expand to Global Schema Constraint Baseline (8/18) - that is M78." The boundary between them is implicit.

## 2. Decision

This ADR fixes the boundary between the three carriers:

**Ontology**
- Sole source of domain knowledge vocabulary (entity / relationship terms).
- Does not carry pipeline schema structure.
- Does not carry causal dimensions.
- Does not carry runtime constraint definitions.

**DomainMetadata**
- Carries domain identity and binding information (domain_id, label, ontology reference, description).
- Is not a second schema source. It references an `Ontology`; it does not re-declare vocabulary.

**DomainSchema**
- Is the pipeline output contract container.
- Its `fields` must be derived from the referenced `Ontology`. No independent vocabulary may be introduced inside `DomainSchema` unless a future ADR explicitly revises this boundary.

## 3. Non-goals

This ADR explicitly does **not** approve:
- Modifying the Global Schema Constraint Baseline (8/18).
- Extending 8/18.
- Aligning `HISTORY_ONTOLOGY` (6/5) to 8/18.
- Introducing causal dimensions into `Ontology` or any domain carrier.
- Turning `Ontology` into a runtime inference model.

## 4. Global Schema Relationship

**Question evaluated**: should `Ontology` gain a `global_schema_ref` field that points at the Global Constraint Boundary?

**Assessment**

- Adding a field to `Ontology` modifies a frozen dataclass and introduces a direct code dependency from the domain vocabulary toward `validation.py`. That makes `Ontology` aware of an enforcement layer it currently does not reference.
- The relationship being expressed is referential and informational, not behavioral. Nothing in the runtime reads such a field today.
- A code field also implies a maintenance obligation: any future change to the Global Constraint Boundary would need a corresponding `Ontology` field update, recreating the very coupling this ADR seeks to avoid.

**Decision**: do **not** add `global_schema_ref` to `Ontology`. The relationship is captured as a documentation contract instead.

The contract describes a one-directional, non-code-dependent flow:

```
Ontology            →  domain knowledge vocabulary (source of truth)
   ↓  (DomainSchema.fields derived from Ontology)
DomainSchema        →  pipeline output contract
   ↓  (output boundary; Global Constraint is a separate enforcement layer)
Global Constraint Boundary (8/18, in validation.py)
```

`Ontology` does **not** directly depend on the Global Schema. `DomainSchema` is the output contract; the Global Constraint Boundary is an independent enforcement layer that the pipeline output may be checked against, but `Ontology` itself stays decoupled from it. This ADR records that separation as the standing contract. The ADR document and `docs/10_ARCHITECTURE/` notes are the authoritative statement of the relationship; no code change is required to express it.

## 5. Governance

- **Freeze Revision**: not required. This ADR changes no `freeze-check.mjs` logic and adds no allowlist entry. `backend/app/core/domain/` is already registered (ADR-M78-FR).
- **Allowlist**: not required. No new backend path is introduced.
- **Runtime Freeze**: not affected. The Global Schema Constraint Baseline (8/18) is unchanged; no runtime behavior, no new runtime region, no framework semantic change. The boundary contract is documentation plus the existing `DomainSchema.fields`-from-`Ontology` derivation already present in `pipeline.py`.

## 6. Consequences

**Positive**
- Removes ambiguity about which carrier owns domain vocabulary versus pipeline output.
- Lowers the future risk of a second, divergent schema source appearing inside `DomainSchema`.
- Makes the `Ontology` ↔ Global Constraint separation explicit, reducing the chance of an accidental 8/18 modification.

**Negative**
- Adds an architecture contract that must be maintained: future changes touching `domain/` carriers should be checked against this ADR.
- The relationship is documentation-only, so enforcement depends on review discipline rather than a code assertion.

## References

- M78 Development Plan Proposal (M78.1 Schema Boundary Contract Proposal)
- `backend/app/core/domain/ontology.py` (Ontology, HISTORY_ONTOLOGY)
- `backend/app/core/domain/adapter.py` (DomainMetadata, BaseDomainAdapter)
- `backend/app/core/domain/schemas.py` (DomainSchema)
- `backend/app/core/acquisition/pipeline.py:60-68` (DomainSchema.fields derivation)
- `backend/app/core/domain/military_ontology.py:7` (8/18 separation note)
- Global Schema Constraint Baseline (8/18) in `backend/app/validation.py`
- ADR-M78-FR (Freeze Governance for `backend/app/core/domain/`)
