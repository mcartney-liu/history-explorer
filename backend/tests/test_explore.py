import sys
from pathlib import Path

# Make the `app` package importable when pytest is launched from the repo
# root or the backend directory.
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi.testclient import TestClient

from app.main import app, _exploration_from_data

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


def test_v1_minimal_entity_compatibility():
    # Test 1: data carrying ONLY the four M1 fields must still load and render
    # without error. Additive migration means old data stays valid — no field
    # is required to be present, missing v2 fields degrade gracefully.
    minimal = {
        "entities": [
            {
                "id": "ev-x",
                "type": "Event",
                "name": "Minimal Event",
                "description": "No v2 fields at all.",
            }
        ],
        "relationships": [],
        "timeline": [{"period": "100 BC", "event": "happened"}],
    }
    out = _exploration_from_data("minimal", minimal)
    # M1 required fields preserved
    assert out["entities"][0]["id"] == "ev-x"
    # period stays a plain string for the M1 TimelinePanel
    assert out["timeline"][0]["period"] == "100 BC"
    # no structured time in v1 data → no `date` key added
    assert "date" not in out["timeline"][0]
    # exploration still builds from the minimal shape
    assert out["exploration"]["main_entity"]["id"] == "ev-x"


def test_v2_fields_transmitted():
    # Test 2: v2 data exposes the new fields additively, without breaking the
    # M1 contract. roman_empire was migrated to v2 in M2-001 Phase 2.
    res = client.get("/explore/roman_empire")
    assert res.status_code == 200
    body = res.json()
    ent = body["entities"][0]

    # Required M1 fields preserved
    for k in ("id", "type", "name", "description"):
        assert k in ent

    # v2 additive entity fields present
    assert "global_id" in ent
    assert ent["global_id"].startswith("roman_empire:")
    assert "aliases" in ent
    assert "labels" in ent
    assert "start_date" in ent or "end_date" in ent
    assert "source" in ent and "evidence" in ent and "reliability" in ent

    # Relationship metadata slots transmitted (all optional, may be empty).
    # After the M2-001 cleanup, the metadata field is `citation` (renamed from
    # `source`) so it no longer collides with the relationship subject `source`.
    rel = body["relationships"][0]
    for k in ("confidence", "source", "citation", "evidence", "valid_time", "weight"):
        assert k in rel

    # Timeline: string `period` kept for M1 UI + structured `date` added
    tl = body["timeline"][0]
    assert isinstance(tl["period"], str)
    assert "date" in tl and isinstance(tl["date"], dict)

    # id stays LOCAL (not namespace-prefixed) → frontend click loop safe
    assert ":" not in ent["id"]


def test_new_entity_types_no_exception():
    # Test 3: Technology / Religion entities must not break the API, and new
    # relationship types (invented / practiced / contemporary_with) must be
    # handled gracefully (never raise).
    res = client.get("/explore/egypt_technology_religion")
    assert res.status_code == 200
    body = res.json()
    types = {e["type"] for e in body["entities"]}
    assert "Technology" in types
    assert "Religion" in types

    rel_types = {r["type"] for r in body["relationships"]}
    assert "invented" in rel_types
    assert "practiced" in rel_types
    assert "contemporary_with" in rel_types

    # Exploration click loop still works with the new entity ids
    assert len(body["exploration"]["related_entities"]) > 0


def test_explore_traversal_blocked():
    # Test 4: path-traversal topics must never reach the filesystem layer.
    #
    # A single FastAPI path segment cannot contain a literal "/", so a
    # traversal-style input is either split into multiple segments by the HTTP
    # layer (encoded %2f) or normalized away (literal ../). Either way it never
    # matches /explore/{topic} as a usable topic file.
    encoded = client.get("/explore/..%2f..%2f..%2f")
    assert encoded.status_code in (400, 404)  # not a valid explore topic

    # The literal form is normalized away by the HTTP client before it can
    # reach the route param — it is never treated as a topic file.
    literal = client.get("/explore/../../../")
    if literal.status_code == 200:
        assert literal.json().get("service") == "backend"  # hits root, not explore
    else:
        assert literal.status_code == 404

    # The M-H3 regex gate still rejects illegal-character single segments
    # (the path-traversal vectors that DO arrive as one segment):
    assert client.get("/explore/test.json").status_code == 400
    assert client.get("/explore/..%2f..%2fsecret").status_code in (400, 404)
