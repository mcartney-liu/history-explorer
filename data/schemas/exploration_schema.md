# History Explorer Exploration Schema v2

> M2 Knowledge Model v2 — data contract foundation.
>
> This document upgrades the M1 schema (5 core entities) to the M2 contract
> (7 active entity types, structured time, global identity, relationship
> metadata, geographic preparation) while remaining **additive** — no M1
> field is removed, and M1 data remains valid.
>
> Status: schema definition only. No database, no ORM, no Neo4j, no ETL,
> no AI service, no GIS. Implementation of Knowledge Graph / AI / GIS is
> explicitly out of scope for M2 (see §8–§9).

## Status & Versioning

- Schema version: `v2`
- Supersedes: M1 schema (5 core entities)
- Migration: additive (M1 → M2, see §10)
- Implementation freeze: AI, Knowledge Graph (Neo4j), GIS, Recommendation
  are **not implemented** in M2 — this schema only reserves structure for them.

---

## 1. BaseEntity (all entities)

Every entity, regardless of `type`, shares the following fields:

| Field | Req | Type | Description |
|---|---|---|---|
| `id` | ✅ | string | **Local** stable identifier, unchanged from M1 (e.g. `person-augustus`). Consumed by the frontend click closure and `/explore/{id}` route. |
| `type` | ✅ | enum | One of the active entity types (§2). |
| `name` | ✅ | string | Human-readable primary label. |
| `description` | ✅ | string | Short explanation / exploration entry point. |
| `global_id` | ⬜ | string | Namespaced global identifier `namespace:id` (e.g. `roman_empire:person-augustus`). Additive; does **not** replace `id`. |
| `aliases` | ⬜ | string[] | Alternate names / transliterations. |
| `labels` | ⬜ | object | Multilingual labels `{ "en": "...", "zh": "...", "la": "..." }`. Slot reserved; content filled M3+. |
| `start_date` | ⬜ | TimeValue | Structured start of the entity's span (see §4). |
| `end_date` | ⬜ | TimeValue | Structured end of the entity's span. |
| `source` | ⬜ | string | Citation / provenance reference. |
| `evidence` | ⬜ | string[] | Supporting evidence references. |
| `reliability` | ⬜ | string | Reliability rating (e.g. `A`–`D`); reserved for M3+. |

> All fields below `description` are **optional**. M1 datasets that contain
> only `{id, type, name, description}` remain fully valid.

---

## 2. Entity Types

### Active in M2 (7)

- **Event** — a historical occurrence; the default exploration anchor.
- **Person** — a historical individual / actor.
- **Civilization** — a cultural or societal system.
- **Location** — a geographic place (see §6 for geo preparation).
- **Time Period** — a historical time structure (dynasty, century, era).
- **Technology** — a material or methodological advancement (M2-001 Note 1).
- **Religion** — a spiritual / belief system (M2-001 Note 1).

### Reserved for future (NOT active in M2)

To avoid entity explosion and Content-Dump risk, the following types are
**out of M2 scope**. The model can accept them later without redesign — only
the `type` enum needs extending:

- `Artifact`
- `Institution`
- `Culture`
- `Language`

### Type-specific fields (additive to BaseEntity)

These extend BaseEntity for specific types. All are optional unless noted;
they do **not** replace BaseEntity fields.

**Event**
- `location` (id ref)
- `participants` (id ref[])
- `causes` (id ref[])
- `consequences` (id ref[])
- (`start_date` / `end_date` are provided by BaseEntity)

**Person**
- `birth` (TimeValue)
- `death` (TimeValue)
- `roles` (string[])
- `related_events` (id ref[])

**Civilization**
- `period` (id ref → Time Period)
- `region` (string or id ref → Location)
- `related_events` (id ref[])

**Location**
- `coordinates` ({ "lat": float, "lng": float }) — see §6
- `region` (string or id ref → broader Location)
- `related_events` (id ref[])
- hierarchy expressed via the `part_of` relationship (§3, §6)

**Time Period**
- `start` (TimeValue)
- `end` (TimeValue)
- (description from BaseEntity)

**Technology** (new in M2)
- `invented_by` (id ref → Person / Civilization)
- `invented_in` (TimeValue)
- `category` (string, e.g. "metallurgy", "agriculture")

**Religion** (new in M2)
- `practiced_by` (id ref → Person / Civilization)
- `practiced_in` (id ref → Location / Time Period)
- `texts` (string[], optional)

---

## 3. Relationship Model v2

A relationship connects two entities by `id`. Base shape:

| Field | Req | Type | Description |
|---|---|---|---|
| `source` | ✅ | string | `id` (or `global_id`) of the origin entity. |
| `target` | ✅ | string | `id` (or `global_id`) of the target entity. |
| `type` | ✅ | enum | One of the supported relationship types below. |

### Supported relationship types

**Retained from M1 (5):**

- `caused` — Event → Event (causal)
- `influenced` — Entity → Entity (influence)
- `participated_in` — Person → Event
- `located_at` — Entity → Location
- `related_to` — generic fallback

**New in v2 (10):**

- `before` — temporal: A occurs before B
- `after` — temporal: A occurs after B
- `contemporary_with` — temporal: A and B coexist
- `part_of` — hierarchy: child → parent (region, subsystem, dynasty)
- `ruled` — Person / Civilization → Location / Civilization
- `traded_with` — Civilization ↔ Civilization (symmetric)
- `invented` — Person / Civilization → Technology
- `discovered` — Person / Civilization → Technology (or Artifact in future)
- `practiced` — Person / Civilization → Religion
- `spoke` — Person / Civilization → Language (future)

### Relationship metadata (reserved, all optional)

Every relationship MAY carry the following metadata. M2 does **not** require
these to be populated — they are structural slots so a future KG / AI layer
can consume provenance without redesign:

| Field | Type | Description |
|---|---|---|
| `confidence` | float (0–1) | Edge strength for graph traversal. |
| `citation` | string | Citation / provenance reference for the relationship. Renamed from `source` in the M2-001 cleanup to avoid a JSON duplicate-key collision with the relationship's subject `source` field. |
| `evidence` | string[] | Supporting evidence. |
| `valid_time` | { start, end } | Period during which the relation holds. |
| `weight` | float | Exploration ranking weight. |

> **Naming rule (M2-001 cleanup):** the relationship *subject* endpoints
> (`source`, `target`) and the *metadata* `citation` are deliberately distinct
> keys. Never reuse `source` for relationship metadata — JSON collapses
> duplicate object keys to the last value, which would erase the subject id and
> break the exploration click loop. `source` / `target` are the edge ends;
> `citation` is provenance.

---

## 4. Temporal Model v2

Structured time is represented by a `TimeValue` object. This **freezes the
data structure**; M2 does **not** implement time reasoning (sorting, overlap
detection) — that arrives with M3+ Knowledge Graph.

```json
{
  "value": -27,
  "precision": "year",
  "certainty": "exact",
  "label": "27 BC",
  "range": { "start": -27, "end": 476 }
}
```

| Field | Type | Description |
|---|---|---|
| `value` | number | Sortable numeric year. **BCE is negative** (e.g. `-27` = 27 BC); CE positive (`476`). Century expressed as the century anchor (e.g. `-5` ≈ 5th century BCE). Dynasty expressed via `label` + `range`. |
| `precision` | enum | `year` \| `month` \| `day` \| `century` \| `dynasty` \| `approx` |
| `certainty` | enum | `exact` \| `approximate` \| `uncertain` |
| `label` | string | Human-readable form ("27 BC", "circa 500 BCE", "Han Dynasty"). |
| `range` | { start, end } | Present when the value spans an interval (e.g. a dynasty's extent). |

**Coverage:** BCE / CE, exact date, date range, century, dynasty,
approximate, uncertain — all supported by the combination of `precision` +
`certainty` + `range`.

---

## 5. Identifier Strategy

- **`id` (M1 local value, preserved):** `person-augustus`
  - Consumed by the M1 frontend click closure (`RelatedEntityList` →
    `handleEntityClick` → `/explore/{id}`).
  - Constrained by the M-H3 route regex `^[a-z0-9_-]+$` (no `:` allowed).
  - **Must remain unchanged** — no route or regex change in M2.
- **`global_id` (new, additive):** `roman_empire:person-augustus`
  - Format: `namespace:id`, where `namespace` is the source dataset.
  - Eliminates cross-dataset id collisions (a known M2-002 risk).
  - Appears only in **data**; never in the URL path.

---

## 6. Geographic Preparation

`Location` entities gain fields to support a future GIS module — **fields
only, no GIS implementation in M2**:

- `coordinates`: `{ "lat": float, "lng": float }` (WGS84)
- `region`: string or id ref to a broader `Location`
- hierarchy: expressed via the `part_of` relationship (City → Region →
  Empire → Continent)

A future GIS module consumes `coordinates` + `part_of` without redesign.

---

## 7. Exploration Flow (unchanged intent)

```
Explore → Connect → Understand → Discover
```

Entities + id-based relationships keep enabling meaningful connections rather
than isolated information. The v2 additions (temporal relations, hierarchy,
metadata) deepen this without changing the flow.

---

## 8. Architecture Principles (unchanged)

- **No Database / ORM / Graph DB** — content loaded from
  `data/examples/*.json`.
- **No AI / LLM** — exploration is data-driven and deterministic. `source` /
  `evidence` fields are reserved containers only.
- **Knowledge Graph Ready** — the property-graph shape (nodes + id-based
  edges + metadata slots) maps 1:1 to a future Neo4j graph without redesign.

---

## 9. Out-of-Scope (M2 freeze)

Explicitly **not implemented** in M2 (reserved only):

- AI / LLM integration (charter §4 red line)
- Neo4j / Knowledge Graph database
- GIS / map UI
- Recommendation algorithms
- Real population of `source` / `evidence` / `reliability` / `labels`

---

## 10. M1 → M2 Migration

This migration is **additive and requires no redesign**:

- **Old data remains valid.** M1 datasets containing only
  `{id, type, name, description}` (plus any original type-specific fields)
  load unchanged. All v2 fields are optional; the backend adapter treats
  missing fields as `None` / empty.
- **No field removed.** Every M1 field (`id`, `type`, `name`, `description`,
  and the original type-specific fields) continues to be valid.
- **JSON → Structured DB → Knowledge Graph:** the node-edge property-graph
  structure is preserved end-to-end. New fields are added as properties on
  nodes / edges; the core graph shape never changes. Migration to a structured
  DB or Neo4j is a 1:1 mapping — no paradigm shift.

### M1 fields confirmed still valid

`id`, `type`, `name`, `description`;
Event(`start_date`, `end_date`, `location`, `participants`, `causes`,
`consequences`);
Person(`birth`, `death`, `roles`, `related_events`);
Civilization(`period`, `region`, `related_events`);
Location(`coordinates`, `region`, `related_events`);
Time Period(`start`, `end`).

---

*Version 2.0 — M2 Knowledge Model v2 (Phase 1: schema contract). Schema-only;
no backend, frontend, data, or API changes.*
