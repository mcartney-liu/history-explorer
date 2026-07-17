import json
import sys
from pathlib import Path

# Make the `app` package importable when pytest is launched from repo root.
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.core.repository import JsonTopicRepository
from app.core.knowledge_service import KnowledgeService
from app.core.registry import KnowledgeRegistry
from app.core.global_graph import GlobalGraph
from app.core.exploration_engine import ExplorationEngine

DATA_DIR = BACKEND_DIR.parent / "data" / "examples"


def _ks() -> KnowledgeService:
    return KnowledgeService(JsonTopicRepository(DATA_DIR))


def _engine(datasets: list) -> ExplorationEngine:
    reg = KnowledgeRegistry(datasets)
    gg = GlobalGraph(datasets, reg)
    return ExplorationEngine(gg, reg, datasets)


ROME = "roman_empire:civ-roman"
HAN = "silk_road:han_dynasty"


# ---------------------------------------------------------------------------
# 1. Single-hop exploration (real, cross-topic neighbor)
# ---------------------------------------------------------------------------
def test_explore_from_single_hop_keeps_relationship():
    ks = _ks()
    result = ks.explore_from(ROME, max_depth=1)
    silk = [n for n in result if n["global_id"] == "silk_road:silk_road"]
    assert silk, "Silk Road must appear as a single-hop neighbor of Rome"
    n = silk[0]
    # The path's first step must keep the relation type and direction.
    assert n["depth"] == 1
    assert n["steps"][0]["relationship"] == "traded_with"
    assert n["steps"][0]["direction"] == "outgoing"
    # Result is JSON-safe (no nested dataclasses).
    json.dumps(n)


# ---------------------------------------------------------------------------
# 2. Multi-hop path (real data: Rome -> Silk Road -> Han China)
# ---------------------------------------------------------------------------
def test_explore_from_multi_hop_reaches_han():
    ks = _ks()
    result = ks.explore_from(ROME, max_depth=2)
    han = [n for n in result if n["global_id"] == HAN]
    assert han, "Han China must be reachable from Rome within 2 hops"
    assert han[0]["depth"] == 2
    # Path goes through Silk Road.
    assert "silk_road:silk_road" in han[0]["path"]


def test_find_connections_rome_to_han():
    ks = _ks()
    res = ks.explore_connections(ROME, HAN)
    assert res["paths"], "expected at least one connecting path"
    top = res["paths"][0]
    assert top["nodes"][0] == ROME
    assert top["nodes"][-1] == HAN
    # Path crosses the Silk Road topic — it may route through the Silk Road
    # node itself or a specific Silk Road entity (e.g. paper technology, the
    # Han node on that topic); the Data Agent's expanded dataset created a
    # higher-scoring such path, so we assert topic membership, not a literal
    # node id.
    assert any(gid.startswith("silk_road:") for gid in top["nodes"])
    # Score breakdown is present and explainable.
    assert set(top["score_breakdown"]) == {
        "relationship_meaning",
        "temporal_coherence",
        "entity_importance",
        "path_simplicity",
        "hops",
    }


# ---------------------------------------------------------------------------
# 3. Cross-topic path (the M3.5-001 property still holds at the engine layer)
# ---------------------------------------------------------------------------
def test_connection_path_crosses_topics():
    ks = _ks()
    res = ks.explore_connections(ROME, HAN)
    top = res["paths"][0]
    topics = {
        ks.get_global_graph().get_node(gid).topic
        for gid in top["nodes"]
        if ks.get_global_graph().get_node(gid) is not None
    }
    assert "roman_empire" in topics
    assert "silk_road" in topics
    assert len(topics) > 1


# ---------------------------------------------------------------------------
# 4. Temporal ordering (synthetic: relationship-equal, time decides rank)
# ---------------------------------------------------------------------------
def test_temporal_coherence_ranks_contemporary_above_distant():
    datasets = [
        (
            "time_test",
            {
                "entities": [
                    {
                        "id": "x",
                        "type": "Civilization",
                        "name": "X",
                        "global_id": "time_test:x",
                        "start_date": {"value": -100},
                        "end_date": {"value": 200},
                    },
                    {
                        "id": "yn",
                        "type": "Civilization",
                        "name": "Y Near",
                        "global_id": "time_test:yn",
                        "start_date": {"value": -50},
                    },
                    {
                        "id": "yf",
                        "type": "Civilization",
                        "name": "Y Far",
                        "global_id": "time_test:yf",
                        "start_date": {"value": 1500},
                    },
                ],
                "relationships": [
                    {"source": "x", "target": "yn", "type": "influenced"},
                    {"source": "x", "target": "yf", "type": "influenced"},
                ],
            },
        )
    ]
    engine = _engine(datasets)
    ranked = engine.explore("time_test:x", max_depth=1)
    assert len(ranked) == 2
    # Both edges share type 'influenced'; only temporal coherence differs.
    assert ranked[0].global_id == "time_test:yn"
    assert ranked[1].global_id == "time_test:yf"
    assert (
        ranked[0].score_breakdown["temporal_coherence"]
        > ranked[1].score_breakdown["temporal_coherence"]
    )


def test_temporal_coherence_formula():
    engine = _engine(
        [
            (
                "t",
                {
                    "entities": [
                        {"id": "a", "type": "Location", "global_id": "t:a"},
                        {"id": "b", "type": "Location", "global_id": "t:b"},
                    ],
                    "relationships": [],
                },
            )
        ]
    )
    # Same year -> 1.0; 500-year gap -> 0.5; unknown -> neutral 0.5/0.6.
    assert engine._temporal_coherence({"start_date": {"value": -100}}, {"start_date": {"value": -100}}) == 1.0
    assert engine._temporal_coherence({"start_date": {"value": 0}}, {"start_date": {"value": 500}}) == 0.5
    assert engine._temporal_coherence(None, None) == 0.5
    assert engine._temporal_coherence({"start_date": {"value": 0}}, None) == 0.6


# ---------------------------------------------------------------------------
# 5. Relationship meaning beats naive shortest path (synthetic, equal length)
# ---------------------------------------------------------------------------
def test_relationship_meaning_drives_ranking_over_equal_length():
    datasets = [
        (
            "multi",
            {
                "entities": [
                    {
                        "id": "s",
                        "type": "Civilization",
                        "name": "S",
                        "global_id": "multi:s",
                        "start_date": {"value": -500},
                    },
                    {
                        "id": "t",
                        "type": "Civilization",
                        "name": "T",
                        "global_id": "multi:t",
                        "start_date": {"value": -480},
                    },
                    {
                        "id": "m1",
                        "type": "Location",
                        "name": "M1",
                        "global_id": "multi:m1",
                    },
                    {
                        "id": "m2",
                        "type": "Person",
                        "name": "M2",
                        "global_id": "multi:m2",
                    },
                ],
                "relationships": [
                    # Weak 2-hop chain: located_at (0.5) x2
                    {"source": "s", "target": "m1", "type": "located_at"},
                    {"source": "m1", "target": "t", "type": "located_at"},
                    # Strong 2-hop chain: influenced (0.95) x2
                    {"source": "s", "target": "m2", "type": "influenced"},
                    {"source": "m2", "target": "t", "type": "influenced"},
                ],
            },
        )
    ]
    engine = _engine(datasets)
    res = engine.find_connections("multi:s", "multi:t")
    assert len(res.paths) >= 2
    top = res.paths[0]
    # Both are 2 hops; the strong (influenced) path must outrank the weak one.
    rels = [s.relationship for s in top.steps]
    assert rels == ["influenced", "influenced"]
    weak = [p for p in res.paths if [s.relationship for s in p.steps] == ["located_at", "located_at"]]
    assert weak and top.score > weak[0].score


# ---------------------------------------------------------------------------
# 6. No path case
# ---------------------------------------------------------------------------
def test_no_connection_returns_empty():
    ks = _ks()
    res = ks.explore_connections(ROME, "no_such:node")
    assert res["paths"] == []
    assert "No connection" in res["explanation"]


# ---------------------------------------------------------------------------
# 7. Determinism: identical inputs -> identical output
# ---------------------------------------------------------------------------
def test_exploration_is_deterministic():
    ks = _ks()
    a = json.dumps(ks.explore_connections(ROME, HAN), sort_keys=True)
    b = json.dumps(ks.explore_connections(ROME, HAN), sort_keys=True)
    assert a == b
    c = json.dumps(ks.explore_from(ROME, max_depth=2), sort_keys=True)
    d = json.dumps(ks.explore_from(ROME, max_depth=2), sort_keys=True)
    assert c == d
