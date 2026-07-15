import sys
from pathlib import Path

# Make the `app` package importable when pytest is launched from the repo
# root or the backend directory.
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

# The stable API contract: every /explore/{topic} response carries these keys,
# regardless of whether example data exists for the topic.
EXPECTED_TOP_LEVEL_KEYS = {
    "topic",
    "title",
    "summary",
    "entities",
    "relationships",
    "timeline",
    "connections",
    "exploration",
}


def test_root_status():
    res = client.get("/")
    assert res.status_code == 200
    body = res.json()
    assert body["project"] == "History Explorer"
    assert body["service"] == "backend"


def test_explore_known_topic_shape():
    res = client.get("/explore/roman_empire")
    assert res.status_code == 200
    body = res.json()

    # 1) Full contract present
    assert EXPECTED_TOP_LEVEL_KEYS <= set(body.keys())
    assert body["topic"] == "roman_empire"
    assert body["title"] == "Roman Empire"

    # 2) Known topic carries real data
    assert isinstance(body["entities"], list) and len(body["entities"]) > 0
    assert isinstance(body["timeline"], list) and len(body["timeline"]) > 0

    # 3) Exploration sub-contract (drives the UI panels + click loop)
    exploration = body["exploration"]
    assert "main_entity" in exploration
    assert "related_entities" in exploration
    assert isinstance(exploration["related_entities"], list)
    assert len(exploration["related_entities"]) > 0

    # 4) Legacy compatibility field still present for the frontend
    assert isinstance(body["connections"], list)


def test_explore_unknown_topic_fallback():
    res = client.get("/explore/atlantis_lost")
    assert res.status_code == 200
    body = res.json()

    # Fallback MUST keep the exact same shape (frontend contract stays stable)
    assert EXPECTED_TOP_LEVEL_KEYS <= set(body.keys())
    assert body["topic"] == "atlantis_lost"

    # Empty entity lists + a single placeholder timeline entry
    assert body["entities"] == []
    assert body["relationships"] == []
    assert isinstance(body["timeline"], list) and len(body["timeline"]) >= 1
    assert body["exploration"]["related_entities"] == []


def test_explore_invalid_topic_dot_blocked():
    # A dot is not in the allowed charset → must be rejected, never treated as
    # a filename suffix that could leak the storage layout.
    res = client.get("/explore/test.json")
    assert res.status_code == 400


def test_explore_invalid_topic_uppercase_blocked():
    # Uppercase letters are outside the allowed charset.
    res = client.get("/explore/Roman_Empire")
    assert res.status_code == 400


def test_explore_invalid_topic_separator_blocked():
    # Slashes / path separators are outside the allowed charset. A single
    # FastAPI path segment cannot contain "/", so traversal-style input is
    # either rejected by our regex gate (400) or never matches the route
    # (404) — either way it can never reach the filesystem layer.
    res = client.get("/explore/..%2f..%2fsecret")
    assert res.status_code in (400, 404)
    assert res.status_code != 200


def test_explore_invalid_topic_space_blocked():
    # Spaces are outside the allowed charset.
    res = client.get("/explore/roman%20empire")
    assert res.status_code == 400
