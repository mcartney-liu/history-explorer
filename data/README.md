# History Explorer Data Layer

## Purpose

Historical knowledge data foundation.

**Data principle:** High-quality structured knowledge is more important than
large amounts of data.

## Future Responsibilities

- Data management.
- Entity modeling.
- Knowledge graph preparation.
- Data processing.

## Directory Structure

- `raw/` — Original historical data sources.
- `processed/` — Processed and cleaned historical data.
- `schemas/` — Data structure definitions.
- `examples/` — Sample historical data examples.

## Current Status

Foundation only.

No real datasets imported yet. No databases created yet.

---

# Historical Data Extension Guide v1.0

> This guide explains how to add a new historical exploration topic. Every new
> topic must follow the same **entity model**, **relationship model**,
> **exploration structure**, and **data quality principles** so the API contract
> stays stable.
>
> This is documentation only. It does not add data, does not change the API, and
> does not introduce a database, ETL, or AI pipeline.

## How to Add a New Historical Topic

1. Pick a topic `id` using lowercase words joined by hyphens, e.g. `roman-empire`.
2. Create a data file under `examples/` named `{topic with hyphens -> underscores}_example.json`.
   - Example topic `roman-empire` -> file `examples/roman_empire_example.json`.
3. Fill the file with `title`, `summary`, `timeline`, `entities`, and `relationships`
   (the `connections` and `exploration` fields are derived by the API and must NOT
   be authored by hand).
4. Validate that every `relationships[].source` and `relationships[].target`
   references a real `entities[].id`.

The topic segment in the URL maps directly:
`GET /explore/roman-empire` -> `data/examples/roman_empire_example.json`.

See `schemas/exploration_schema.md` for the canonical field reference.

## Directory Structure

The data layer is organized as:

```
data/
├── raw/         # Original historical data sources (future).
├── processed/   # Processed and cleaned historical data (future).
├── schemas/     # Data structure definitions (e.g. exploration_schema.md).
└── examples/    # Sample historical data consumed by the API today.
```

- `raw/` — drop zone for original datasets and external imports (not yet used).
- `processed/` — normalized entities and clean relationships (not yet used).
- `schemas/` — structure definitions that document the contract.
- `examples/` — the only directory the API reads from today; each file is one
  explorable topic.

## Entity Requirements

Every topic should define a set of entities. Supported entity types:

- `Event`
- `Person`
- `Civilization`
- `Location`
- `Time Period`

Each entity requires these four fields:

| Field | Type | Description |
|---|---|---|
| `id` | string | Stable unique identifier, e.g. `person-augustus`. |
| `type` | string | One of the supported entity types above. |
| `name` | string | Human-readable label. |
| `description` | string | Short, factual explanation. |

## Relationship Requirements

Relationships connect entities into a graph. Format:

| Field | Type | Description |
|---|---|---|
| `source` | string | Entity `id` where the relationship originates. |
| `target` | string | Entity `id` where the relationship points. |
| `type` | string | One of the supported relationship types. |

Supported relationship types:

- `caused`
- `influenced`
- `participated_in`
- `located_at`
- `related_to`

Relationships reference entities by `id` (never by name string), so the graph
stays explicit and queryable.

## Exploration Structure

The `exploration` block (`main_entity` + `related_entities`) is **computed by the
API** from `entities` and `relationships` — authors should not write it by hand.

To make exploration meaningful, follow one rule when authoring data:
- Ensure the topic has at least one `Event` entity that is connected via
  relationships to other entities. The API selects the first `Event` as the
  `main_entity` and derives `related_entities` from its connections.

If a topic has no `Event`, the API falls back to the first entity as the main
entity. Connected knowledge (rather than isolated entities) is what produces a
useful exploration view.

## Data Quality Principles

- **Prefer connected knowledge over isolated facts.** A topic with relationships
  between entities is far more valuable than a list of disconnected entries.
- **Preserve historical context.** Keep `description`, `timeline`, and
  relationship meaning accurate and in context.
- **Avoid unsupported relationships.** Only use the five supported relationship
  types; do not invent new ones without updating the schema first.
- **Keep entity identifiers stable.** Once an `id` is published (e.g. referenced
  by other topics or future links), do not rename it.
- **Maintain source traceability for future expansion.** Note where facts come
  from so the dataset can grow and be audited later.

## Future Direction

The data layer is designed to grow without breaking the API:

- **Knowledge Graph migration** — entities and id-based relationships are already
  graph-shaped and can move to a dedicated graph store later.
- **Larger historical datasets** — more `examples/*.json` topics, plus `raw/` and
  `processed/` pipelines as they mature.
- **AI-assisted data expansion** — the explicit entity-relationship structure is
  an ideal input for an LLM layer in a later sprint.

These directions are possibilities only. This guide introduces **none** of: a
database implementation, an ETL pipeline, or an AI generation workflow.
