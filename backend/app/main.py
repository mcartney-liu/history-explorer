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


# In-memory mock exploration data.
# Rules (S3-001): no database, no external API, no AI, no file loading.
MOCK_EXPLORATIONS = {
    "roman-empire": {
        "topic": "roman-empire",
        "title": "Roman Empire",
        "summary": "A historical civilization example.",
        "timeline": [
            {"period": "27 BC", "event": "Roman Empire established"},
        ],
        "connections": [
            {"type": "person", "name": "Augustus"},
        ],
    },
}


def _mock_exploration(topic: str) -> dict:
    if topic in MOCK_EXPLORATIONS:
        return MOCK_EXPLORATIONS[topic]

    # Generic mock response for any other topic (still hardcoded, no data source).
    title = topic.replace("-", " ").replace("_", " ").title()
    return {
        "topic": topic,
        "title": title,
        "summary": "A historical exploration example.",
        "timeline": [
            {"period": "Unknown", "event": f"{title} historical period"},
        ],
        "connections": [
            {"type": "person", "name": "Historical figure"},
        ],
    }


@app.get("/explore/{topic}")
def explore(topic: str):
    """Return historical exploration results for a given topic (mock only)."""
    return _mock_exploration(topic)
