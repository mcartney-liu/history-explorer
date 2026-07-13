# Backend

Backend API service foundation for History Explorer.

## Purpose

The backend provides API services, business logic, and data orchestration for
the platform. This directory currently holds only the service foundation
(skeleton) — no business features are implemented yet.

## Technology

- **Python** 3.11+
- **FastAPI** — web framework for building APIs
- **Uvicorn** — ASGI server

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   └── main.py       # FastAPI application entry point
├── requirements.txt  # Runtime dependencies
└── README.md
```

## API

### `GET /`

Returns service status:

```json
{
  "project": "History Explorer",
  "status": "running",
  "service": "backend"
}
```

## Run

Install dependencies:

```bash
pip install -r requirements.txt
```

Start the development server:

```bash
uvicorn app.main:app --reload
```

The API will be available at `http://127.0.0.1:8000`.

Interactive API docs (Swagger UI) are available at `http://127.0.0.1:8000/docs`.

## Exploration API

### `GET /explore/{topic}`

Provides historical exploration results for a given topic.

Example request:

```
GET /explore/roman-empire
```

Example response:

```json
{
  "topic": "roman-empire",
  "title": "Roman Empire",
  "summary": "A historical civilization whose empire dominated the Mediterranean world for centuries.",
  "entities": [
    { "id": "event-roman-empire-established", "type": "Event", "name": "Roman Empire Established", "description": "..." },
    { "id": "person-augustus", "type": "Person", "name": "Augustus", "description": "..." },
    { "id": "civ-roman", "type": "Civilization", "name": "Roman Civilization", "description": "..." }
  ],
  "relationships": [
    { "source": "person-augustus", "target": "event-roman-empire-established", "type": "participated_in" }
  ],
  "timeline": [
    { "period": "27 BC", "event": "Roman Empire Established" }
  ],
  "connections": [
    { "type": "related_to", "name": "Roman Civilization" }
  ]
}
```

**Purpose:** Provide historical exploration results as a structured entity-relationship model.

**Current status:** Data-driven from `data/examples/{topic}_example.json`. The `connections` field is a derived compatibility layer generated from `relationships` so the frontend can keep working unchanged.

**Future:** Will connect AI Layer and Data Layer.

**Supported relationship types:** `caused`, `influenced`, `participated_in`, `located_at`, `related_to`.

## Entity Relationship Data

The exploration API uses an explicit **entity-relationship** model instead of
plain text connections.

- **entities** — typed nodes (Event, Person, Civilization, Location, Time Period),
  each with a stable `id`, `type`, `name`, and `description`.
- **relationships** — typed edges linking two entity `id`s via `source`, `target`,
  and `type`. Supported types: `caused`, `influenced`, `participated_in`,
  `located_at`, `related_to`.
- **connections** — a backward-compatible field derived from `relationships`
  (`{type, name}`), kept so the existing frontend keeps working without changes.

This structure is the first step toward a Knowledge Graph. Today the data is
read from local JSON files under `data/examples`; in the future it can migrate
to a dedicated Knowledge Graph database without changing the API contract.

## Data Source

**Current:**
Exploration API reads structured entity-relationship example data from `data/examples`.

**Future:**
Will connect to a historical Knowledge Graph database.

## Future Responsibilities

- API services.
- Business logic.
- Data orchestration.
- User requests.

> This directory is under active development. Only the service foundation is
> implemented so far.
