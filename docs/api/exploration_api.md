# Exploration API Documentation v1.0

> API contract between **Frontend → Backend API → Historical Data Model**.
>
> This document stabilizes the exploration API structure before future
> frontend expansion, AI integration, and Knowledge Graph development.

---

## 1. API Overview

**Endpoint:** `GET /explore/{topic}`

**Purpose:** Retrieve historical exploration information for a given topic.
The API turns a topic into a structured entity-relationship exploration result,
covering:

- **Historical topic exploration** — a topic resolves to titled, summarized content.
- **Timeline discovery** — key periods and events along the topic's history.
- **Entity discovery** — typed historical entities (Event, Person, Civilization, Location, Time Period).
- **Relationship discovery** — typed links between entities (e.g. `participated_in`, `located_at`).

The current implementation is data-driven: content is read from structured
example files under `data/examples/{topic}_example.json`. No database, ORM,
graph database, or AI service is involved.

---

## 2. Request

| Field | Value |
|---|---|
| HTTP Method | `GET` |
| Path | `/explore/{topic}` |
| Path Parameter | `topic` (string) — the historical exploration topic |

**Example:**

```
GET /explore/roman-empire
```

The `topic` segment maps to the data file `data/examples/roman_empire_example.json`
(hyphens in the topic become underscores in the filename). Topics without a
matching example file receive a generic fallback response (same structure,
empty `entities`/`relationships`/`exploration`).

---

## 3. Response Structure

```json
{
  "topic": "",
  "title": "",
  "summary": "",
  "timeline": [],
  "entities": [],
  "relationships": [],
  "connections": [],
  "exploration": {
    "main_entity": {},
    "related_entities": []
  }
}
```

### Section explanations

- **Basic exploration information** — `topic`, `title`, `summary`: identity and a
  short description of the explored subject.
- **Timeline** (`timeline[]`) — chronological anchors: each item has `period`
  (e.g. `"27 BC"`) and `event` (a label).
- **Entities** (`entities[]`) — the typed node list of the subject (see
  [Entity Model](#4-entity-model)).
- **Relationships** (`relationships[]`) — the typed edge list connecting entity
  ids (see [Relationship Model](#5-relationship-model)).
- **Connections** (`connections[]`) — a backward-compatible field derived from
  `relationships`. Each item is `{ "type": <relationship type>, "name": <target entity name> }`.
  It exists so the current frontend keeps working without changes.
- **Exploration context** (`exploration`) — an exploration-friendly view that
  groups the raw graph around a primary entity (see
  [Exploration Layer](#6-exploration-layer)).

### Example response (`GET /explore/roman-empire`)

```json
{
  "topic": "roman-empire",
  "title": "Roman Empire",
  "summary": "A historical civilization whose empire dominated the Mediterranean world for centuries.",
  "timeline": [
    { "period": "27 BC", "event": "Roman Empire Established" }
  ],
  "entities": [
    { "id": "event-roman-empire-established", "type": "Event", "name": "Roman Empire Established", "description": "..." },
    { "id": "person-augustus", "type": "Person", "name": "Augustus", "description": "..." },
    { "id": "civ-roman", "type": "Civilization", "name": "Roman Civilization", "description": "..." },
    { "id": "loc-rome", "type": "Location", "name": "Rome", "description": "..." },
    { "id": "tp-27bc", "type": "Time Period", "name": "27 BC", "description": "..." }
  ],
  "relationships": [
    { "source": "person-augustus", "target": "event-roman-empire-established", "type": "participated_in" },
    { "source": "event-roman-empire-established", "target": "civ-roman", "type": "related_to" },
    { "source": "event-roman-empire-established", "target": "loc-rome", "type": "located_at" }
  ],
  "connections": [
    { "type": "participated_in", "name": "Roman Empire Established" },
    { "type": "related_to", "name": "Roman Civilization" },
    { "type": "located_at", "name": "Rome" }
  ],
  "exploration": {
    "main_entity": {
      "id": "event-roman-empire-established",
      "type": "Event",
      "name": "Roman Empire Established",
      "description": "..."
    },
    "related_entities": [
      { "id": "person-augustus", "type": "Person", "relationship": "participated_in" },
      { "id": "civ-roman", "type": "Civilization", "relationship": "related_to" },
      { "id": "loc-rome", "type": "Location", "relationship": "located_at" }
    ]
  }
}
```

---

## 4. Entity Model

An **entity** is a typed historical node. Each entity has:

| Field | Type | Description |
|---|---|---|
| `id` | string | Stable unique identifier (e.g. `person-augustus`). |
| `type` | string | One of the supported entity types. |
| `name` | string | Human-readable label. |
| `description` | string | Short explanation. |

### Supported entity types

- `Event`
- `Person`
- `Civilization`
- `Location`
- `Time Period`

---

## 5. Relationship Model

A **relationship** connects two historical entities. Each relationship has:

| Field | Type | Description |
|---|---|---|
| `source` | string | Entity `id` where the relationship originates. |
| `target` | string | Entity `id` where the relationship points. |
| `type` | string | One of the supported relationship types. |

### Supported relationship types

- `caused`
- `influenced`
- `participated_in`
- `located_at`
- `related_to`

Relationships reference entities by `id` (not by name string), so the graph is
explicit and queryable — the first step toward a Knowledge Graph.

---

## 6. Exploration Layer

The `exploration` block groups the raw entity-relationship graph into a
view optimized for exploration UI. It is a lightweight transformation of the
same `entities`/`relationships` data and introduces no new dependency.

- **`main_entity`** — the primary entity currently being explored.
  Selection heuristic: the first `Event` entity, otherwise the first entity.
- **`related_entities`** — entities directly connected to `main_entity` through
  a relationship, each annotated with the `relationship` type that links it to
  the main entity (e.g. `{ "id": "person-augustus", "type": "Person", "relationship": "participated_in" }`).

This layer is additive: the full `entities` and `relationships` arrays remain
available for clients that want the complete graph.

---

## 7. Frontend Compatibility

The API is designed to evolve without breaking existing consumers.

**Currently used by the frontend:**

- `summary`
- `timeline`
- `connections`

**Future-expandable fields (already present, safe to adopt later):**

- `entities`
- `relationships`
- `exploration`

**Requirement:** any additional field added in the future must remain
backward compatible — the three fields above must keep their shape so the
existing frontend continues to work unchanged.

---

## 8. Architecture Principles

### No Database Dependency

The current API does **not** depend on:

- Database
- ORM
- Graph database

Content is loaded by reading local JSON files (`data/examples/`). This keeps
the foundation simple and dependency-free.

### No AI Dependency

The current API does **not** depend on:

- External AI provider
- LLM service

Exploration results are fully data-driven and deterministic.

### Knowledge Graph Ready

The API structure already supports future:

- Knowledge Graph expansion (entities + id-based relationships).
- Relationship queries (filtering/traversal over `relationships`).
- AI exploration assistant (the explicit graph is the ideal input for an LLM
  layer in a later sprint).

Because the contract is stable, the migration to a dedicated Knowledge Graph
backend can happen without changing the response shape consumed by the frontend.

---

## 9. Related Documents

- [Technical_Architecture.md](../../Technical_Architecture.md)
- [Information_Architecture.md](../../Information_Architecture.md)
- [MVP_Scope.md](../../MVP_Scope.md)
- [Product_Architecture.md](../../Product_Architecture.md)
- [PRD.md](../../PRD.md)

---

*Version 1.0 — Sprint 3 (Knowledge Exploration Foundation). Documentation-only;
no backend or frontend implementation changes.*
