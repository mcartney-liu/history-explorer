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
  "summary": "A historical civilization example.",
  "timeline": [
    {
      "period": "27 BC",
      "event": "Roman Empire established"
    }
  ],
  "connections": [
    {
      "type": "person",
      "name": "Augustus"
    }
  ]
}
```

**Purpose:** Provide historical exploration results.

**Current status:** Mock response only.

**Future:** Will connect AI Layer and Data Layer.

## Future Responsibilities

- API services.
- Business logic.
- Data orchestration.
- User requests.

> This directory is under active development. Only the service foundation is
> implemented so far.
