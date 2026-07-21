# Exploration API Documentation v2.1

> API contract between **Frontend → Backend API → Historical Data Model**.
>
> Updated for the M2 Knowledge Model v2: 7 active entity types, structured
> time, and relationship metadata (`citation`). The top-level response shape is
> unchanged from v1.0 — fully backward compatible.
>
> **v2.1 additions (M2-002 / M2-002.5 / M2-005):** cross-dataset
> `GET /search`, entity detail `GET /entity/{id}`, and the read-only
> diagnostic `GET /health`. These are additive — `/explore/{topic}` keeps its
> exact shape.

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

Active in the v2 knowledge model (7):

- `Event`
- `Person`
- `Civilization`
- `Location`
- `Time Period`
- `Technology` (added in M2-001)
- `Religion` (added in M2-001)

> Reserved for future (the model accepts them without redesign): `Artifact`,
> `Institution`, `Culture`, `Language`.

---

## 5. Relationship Model

A **relationship** connects two historical entities. Each relationship has:

| Field | Type | Description |
|---|---|---|
| `source` | string | **Subject** entity `id` where the relationship originates. |
| `target` | string | **Subject** entity `id` where the relationship points. |
| `type` | string | One of the supported relationship types. |

### Relationship metadata (optional)

Each relationship MAY carry provenance/weight metadata. Note `citation` is the
metadata field — distinct from the subject `source`/`target` (see
`exploration_schema.md` §3). Never reuse `source` for metadata.

| Field | Type | Description |
|---|---|---|
| `confidence` | float (0–1) | Edge strength for graph traversal. |
| `citation` | string | Citation / provenance reference. |
| `evidence` | string[] | Supporting evidence. |
| `valid_time` | { start, end } | Period during which the relation holds. |
| `weight` | float | Exploration ranking weight. |

### Supported relationship types

Retained from M1 (5):

- `caused` — Event → Event
- `influenced` — Entity → Entity
- `participated_in` — Person → Event
- `located_at` — Entity → Location
- `related_to` — generic fallback

New in v2 (10):

- `before` / `after` / `contemporary_with` — temporal
- `part_of` — hierarchy (child → parent)
- `ruled` — Person/Civilization → Location/Civilization
- `traded_with` — Civilization ↔ Civilization
- `invented` / `discovered` — Person/Civilization → Technology
- `practiced` — Person/Civilization → Religion
- `spoke` — Person/Civilization → Language (future)

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

## 6.1. Search Endpoint — `GET /search`

**Purpose:** find an entity by id / name / alias / description across **all**
example topics (M2-002). No full-text engine — ranked best-first match.

| Field | Value |
|---|---|
| HTTP Method | `GET` |
| Path | `/search` |
| Query Parameter | `q` (string) — the search term |

**Ranking (best-first):** `0` exact id/name → `1` alias → `2` substring
(id/name/alias/description). Deterministic, no AI / fuzzy logic. The in-memory
entity index is built once at startup; search reads from it, so there is no
per-request filesystem scan.

**Example:** `GET /search?q=augustus`

```json
{
  "query": "augustus",
  "count": 1,
  "results": [
    {
      "id": "person-augustus",
      "name": "Augustus",
      "type": "Person",
      "topic": "roman_empire",
      "description": "…",
      "match": "exact",
      "start": "63 BC",
      "end": "14 CE",
      "location": null
    }
  ]
}
```

`start` / `end` / `location` are **additive display enrichment** (M2-002.5);
they are `null` when the entity has no structured time / region. Empty `q`
returns `{ "query": "", "results": [], "count": 0 }`.

---

## 6.2. Entity Endpoint — `GET /entity/{entity_id}`

**Purpose:** return one entity's summary, timeline, relationships and an
entity-centered exploration view (M2-002). Powers the click-through from
search results and related entities.

| Field | Value |
|---|---|
| HTTP Method | `GET` |
| Path | `/entity/{entity_id}` |
| Path Parameter | `entity_id` — a **local** id (e.g. `person-augustus`) **or** a `global_id` (e.g. `roman_empire:person-augustus`); both resolve to the same local entity. |

**Example:** `GET /entity/person-augustus`

```json
{
  "id": "person-augustus",
  "type": "Person",
  "name": "Augustus",
  "summary": { "id": "person-augustus", "type": "Person", "name": "Augustus", "description": "…" },
  "timeline": [ { "period": "63 BC", "event": "Augustus born", "date": { "value": -63, "label": "63 BC" } } ],
  "relationships": [
    {
      "type": "participated_in",
      "source": "person-augustus",
      "target": "event-roman-empire-established",
      "direction": "outgoing",
      "other": { "id": "event-roman-empire-established", "name": "Roman Empire Established", "type": "Event" }
    }
  ],
  "exploration": {
    "main_entity": { "id": "person-augustus", "type": "Person", "name": "Augustus", "description": "…" },
    "related_entities": [ { "id": "event-roman-empire-established", "type": "Event", "relationship": "participated_in" } ]
  }
}
```

Each `relationships[]` entry carries `direction` (`outgoing` / `incoming`)
relative to the requested entity and an `other` block (id/name/type) so the
frontend can render and navigate to the connected entity without re-resolving
names. `404` when no entity carries that id or global_id.

---

## 6.3. Health Endpoint — `GET /health`

**Purpose:** read-only system + data-quality summary for developers / ops
(M2-005). **Never crashes** — it always returns `200`, reporting problems as
warnings/errors rather than raising.

```json
{
  "status": "healthy",
  "health": {
    "topic_count": 2,
    "entity_count": 11,
    "relationship_count": 8,
    "timeline_count": 3,
    "warning_count": 2,
    "error_count": 0
  },
  "topics": [ { "topic": "roman_empire", "entity_count": 5, "relationship_count": 5, "timeline_count": 1, "warning_count": 1, "error_count": 0, "issues": [ … ] } ],
  "issues": [ { "severity": "warning", "code": "ORPHAN_ENTITY", "topic": "roman_empire", "message": "Entity `tp-27bc` has no relationships (orphan)." } ]
}
```

`status` is `healthy` when `error_count == 0`, else `degraded`. The report is
built once at startup and reused here — same performance model as the search
index. See `backend/app/validation.py` for the full check catalogue
(schema / cross-reference / duplicate / relationship-consistency / per-topic /
health).

---

## 7. Frontend Compatibility

The API is designed to evolve without breaking existing consumers.

**Currently used by the frontend:**

- `summary` — summary panel on topic and entity pages.
- `timeline` — timeline panel (period + event; v2 `date` object passed through).
- `entities` — search index source + id→name resolution for relationships /
  related entities / timeline click-through.
- `relationships` — relationship network + related-entity list (topic page) and
  the entity-centered relationship view (`/entity`); every edge is navigable.
- `exploration` — `main_entity` + `related_entities` drive the topic exploration
  view; `/entity` reuses the same shape centered on the requested entity.

**Retained for compatibility (no longer the primary path):**

- `connections` — derived list kept so any legacy consumer keeps working.

**Requirement:** any additional field added in the future must remain
backward compatible — the fields above must keep their shape so the
existing frontend continues to work unchanged. The cross-dataset
`/search` and entity `/entity/{id}` responses are likewise additive and
non-breaking.

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

*Version 2.1 — M2 (Knowledge Model v2 + Search/Entity/Health). Syncs the API
contract with `exploration_schema.md` v2; the relationship metadata field
`citation` was renamed from `source` to remove a JSON duplicate-key collision.
Adds the additive `GET /search`, `GET /entity/{id}` and `GET /health`
endpoints — no breaking change to the existing `/explore` shape.*
