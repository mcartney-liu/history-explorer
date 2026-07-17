"""M4-002 Cross-topic Enrichment tests (Backend Engineer, M4-002-002).

Verifies the three KnowledgeService projection methods and the additive API
fields. All checks run against the real M4-001 dataset (8 topics). The
ExplorationEngine and the Schema Freeze are intentionally NOT exercised here
— M4-002 is a structural projection, not a re-scoring change.
"""

import sys
from pathlib import Path

# Make the `app` package importable when pytest is launched from repo root.
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi.testclient import TestClient

from app.main import app
from app.core.repository import JsonTopicRepository
from app.core.knowledge_service import KnowledgeService

DATA_DIR = BACKEND_DIR.parent / "data" / "examples"
V1 = "/api/v1"
client = TestClient(app)


def _ks() -> KnowledgeService:
    return KnowledgeService(JsonTopicRepository(DATA_DIR))


ROME = "roman_empire:civ-roman"
SILK = "silk_road:silk_road"


# ---------------------------------------------------------------------------
# 1. KnowledgeService.cross_topic_related
# ---------------------------------------------------------------------------
def test_cross_topic_related_returns_neighbors():
    ks = _ks()
    related = ks.cross_topic_related(ROME)
    assert related, "expected at least one cross-topic neighbor of Rome"
    src_topic = ks.get_global_graph().get_node(ROME).topic
    for item in related:
        # The neighbor's global_id must resolve to a real node.
        assert ks.get_global_graph().get_node(item["global_id"]) is not None
        # It must live in a DIFFERENT topic than the source.
        assert item["topic"] != src_topic
        # Relationship + direction must be present and well-formed.
        assert item["relationship"]
        assert item["direction"] in ("outgoing", "incoming")
        # Stable shape keys are all present.
        for key in ("id", "name", "type", "global_id", "topic", "relationship", "direction"):
            assert key in item
    gids = {r["global_id"] for r in related}
    assert SILK in gids


def test_cross_topic_related_unknown_global_id_is_empty():
    assert _ks().cross_topic_related("no_such:node") == []


# ---------------------------------------------------------------------------
# 2. KnowledgeService.related_topics_for_entity
# ---------------------------------------------------------------------------
def test_related_topics_for_entity():
    ks = _ks()
    topics = ks.related_topics_for_entity(ROME)
    assert topics, "expected at least one connected topic"
    src_topic = ks.get_global_graph().get_node(ROME).topic
    for t in topics:
        assert t["topic"] != src_topic
        assert t["cross_topic_edge_count"] > 0
        assert set(t.keys()) == {"topic", "cross_topic_edge_count"}
    names = {t["topic"] for t in topics}
    assert "silk_road" in names


def test_related_topics_for_entity_count_not_double_counted():
    """Each cross-topic edge is counted exactly once (no duplicate topic)."""
    ks = _ks()
    topics = ks.related_topics_for_entity(ROME)
    seen = set()
    for t in topics:
        assert t["topic"] not in seen
        seen.add(t["topic"])


# ---------------------------------------------------------------------------
# 3. KnowledgeService.related_topics_for_topic (all 8 topics)
# ---------------------------------------------------------------------------
def test_related_topics_for_topic_runs_for_all_topics():
    ks = _ks()
    for topic in ks.list_topics():
        stats = ks.related_topics_for_topic(topic)
        for s in stats:
            assert s["topic"] != topic
            assert s["cross_topic_edge_count"] > 0
            assert set(s.keys()) == {"topic", "cross_topic_edge_count"}


def test_related_topics_for_topic_no_new_index():
    """The projection reads existing GlobalGraph nodes only — it returns a list
    (never raises, never fabricates a topic index) for every topic."""
    ks = _ks()
    for topic in ks.list_topics():
        assert isinstance(ks.related_topics_for_topic(topic), list)


# ---------------------------------------------------------------------------
# 4. API contract — additive fields present, existing fields intact
# ---------------------------------------------------------------------------
def test_explore_exposes_cross_topic_fields():
    legacy = client.get("/explore/roman_empire").json()
    v1 = client.get(f"{V1}/explore/roman_empire").json()
    assert v1 == legacy  # v1 == legacy still holds with additive fields

    assert "related_topics" in legacy
    assert isinstance(legacy["related_topics"], list)
    assert "cross_topic_related" in legacy["exploration"]
    assert isinstance(legacy["exploration"]["cross_topic_related"], list)

    # Existing fields are untouched.
    assert "related_entities" in legacy["exploration"]
    assert "connections_explained" in legacy
    assert "relationships" in legacy


def test_explore_cross_topic_related_shape_and_v1_legacy():
    """The explore endpoint's cross_topic_related is present, additive, and
    preserves v1==legacy. (It may be empty when the centered Event has no
    direct cross-topic edges — that is correct, not a defect.)"""
    legacy = client.get("/explore/roman_empire").json()
    v1 = client.get(f"{V1}/explore/roman_empire").json()
    assert v1 == legacy
    assert isinstance(legacy["exploration"]["cross_topic_related"], list)
    for item in legacy["exploration"]["cross_topic_related"]:
        for key in ("id", "name", "type", "global_id", "topic", "relationship", "direction"):
            assert key in item


def test_explore_related_topics_nonempty_for_some_topic():
    ks = _ks()
    found = False
    for topic in ks.list_topics():
        body = client.get(f"/explore/{topic}").json()
        if body["related_topics"]:
            found = True
            break
    assert found, "expected at least one topic to report connected topics"


def test_entity_exposes_related_topics():
    legacy = client.get("/entity/person-augustus").json()
    v1 = client.get(f"{V1}/entity/person-augustus").json()
    assert v1 == legacy

    assert "related_topics" in legacy
    assert isinstance(legacy["related_topics"], list)
    # Existing relationships[].other contract preserved (M3.5-003).
    assert legacy["relationships"]
    assert "other" in legacy["relationships"][0]
    assert "global_id" in legacy["relationships"][0]["other"]


def test_entity_related_topics_nonempty_for_cross_linked_entity():
    """A entity known to have cross-topic edges surfaces non-empty
    related_topics through the entity endpoint (positive data check)."""
    legacy = client.get(f"/entity/{ROME}").json()
    v1 = client.get(f"{V1}/entity/{ROME}").json()
    assert v1 == legacy
    assert legacy["related_topics"], "Rome (civ-roman) has cross-topic edges"
    names = {t["topic"] for t in legacy["related_topics"]}
    assert "silk_road" in names
