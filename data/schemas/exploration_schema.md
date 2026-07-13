# History Explorer Exploration Schema

> Initial historical exploration data model foundation.
> Defines structured historical entities and relationships that will support
> future Knowledge Graph, AI interpretation, and exploration features.
>
> Status: schema definition only. No database, no ORM, no Neo4j, no ETL.

## Core Entities

History Explorer models history through five core entity types:

- **Event**
- **Person**
- **Civilization**
- **Location**
- **Time Period**

## Event

Represents historical events.

Fields:

- `id`
- `name`
- `description`
- `start_date`
- `end_date`
- `location`
- `participants`
- `causes`
- `consequences`

## Person

Represents historical individuals.

Fields:

- `id`
- `name`
- `birth`
- `death`
- `roles`
- `related_events`

## Civilization

Represents civilizations or societies.

Fields:

- `id`
- `name`
- `period`
- `region`
- `related_events`

## Location

Represents geographic places.

Fields:

- `id`
- `name`
- `coordinates`
- `region`
- `related_events`

## Time Period

Represents historical time structures.

Fields:

- `id`
- `name`
- `start`
- `end`
- `description`

## Relationships

Relationship types connect entities and form the basis of the future
knowledge graph:

- `caused`
- `influenced`
- `participated`
- `located_at`
- `related_to`

## Exploration Flow

The data model supports the core user flow:

```
Explore
  ↓
Connect
  ↓
Understand
  ↓
Discover
```

Entities and relationships together enable meaningful connections between
historical topics rather than isolated information.
