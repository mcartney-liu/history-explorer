import json
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="History Explorer API",
    description="Backend API service foundation for History Explorer.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "project": "History Explorer",
        "status": "running",
        "service": "backend",
    }


# --- Structured exploration data source (S3-004) ---
# Exploration content is loaded from a local JSON file under data/examples/
# instead of being hardcoded here. Rules: no database, no ORM, no external
# API, no data pipeline — simple file reading only.
EXPLORATION_DATA_DIR = (
    Path(__file__).resolve().parent.parent.parent / "data" / "examples"
)


def _load_topic_data(topic: str) -> dict | None:
    """Load structured example data for a topic from the data/examples dir."""
    file_path = EXPLORATION_DATA_DIR / f"{topic.replace('-', '_')}_example.json"
    if not file_path.exists():
        return None
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError:
        return None


def _exploration_from_data(topic: str, data: dict) -> dict:
    """Map structured entities/relationships to the stable API response shape.

    Source JSON now carries explicit `entities` and `relationships` (with
    entity ids), replacing the old text-only `connections`. A derived
    `connections` compatibility field is kept so the existing frontend keeps
    working unchanged.
    """
    entities = data.get("entities", [])
    relationships = data.get("relationships", [])
    timeline = data.get("timeline", [])

    entity_name = {e.get("id"): e.get("name", "") for e in entities}

    connections = []
    for rel in relationships:
        target_id = rel.get("target", "")
        connections.append(
            {
                "type": rel.get("type", "related_to"),
                "name": entity_name.get(target_id, target_id),
            }
        )

    return {
        "topic": topic,
        "title": data.get("title", topic.replace("-", " ").title()),
        "summary": data.get("summary", "A historical exploration example."),
        "entities": entities,
        "relationships": relationships,
        "timeline": timeline,
        "connections": connections,
    }


def _generic_exploration(topic: str) -> dict:
    """Fallback for topics without loaded example data (still hardcoded).

    Keeps the same response shape (entities/relationships/timeline/connections)
    so the frontend contract stays stable.
    """
    title = topic.replace("-", " ").replace("_", " ").title()
    return {
        "topic": topic,
        "title": title,
        "summary": "A historical exploration example.",
        "entities": [],
        "relationships": [],
        "timeline": [
            {"period": "Unknown", "event": f"{title} historical period"},
        ],
        "connections": [
            {"type": "person", "name": "Historical figure"},
        ],
    }


@app.get("/explore/{topic}")
def explore(topic: str):
    """Return historical exploration results for a given topic.

    Data is sourced from the structured example file when available,
    otherwise a generic fallback is returned.
    """
    data = _load_topic_data(topic)
    if data is not None:
        return _exploration_from_data(topic, data)
    return _generic_exploration(topic)
