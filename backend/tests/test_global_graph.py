import sys
from pathlib import Path

# Make the `app` package importable when pytest is launched from the repo
# root or the backend directory.
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.core.repository import JsonTopicRepository
from app.core.knowledge_service import KnowledgeService
from app.core.global_graph import GlobalGraph

DATA_DIR = BACKEND_DIR.parent / "data" / "examples"


def _ks() -> KnowledgeService:
    return KnowledgeService(JsonTopicRepository(DATA_DIR))


# ---------------------------------------------------------------------------
# 1. Global node registration
# ---------------------------------------------------------------------------
def test_global_graph_registers_every_entity():
    """Every entity across all topics becomes a global node (32 total)."""
    gg = _ks().get_global_graph()
    assert isinstance(gg, GlobalGraph)
    assert gg.node_count == 32
    # A foreign (cross-topic) node is reachable as a first-class node.
    assert gg.get_node("silk_road:silk_road") is not None
    assert gg.get_node("hellenistic_world:civ-greek") is not None


# ---------------------------------------------------------------------------
# 2. Cross-topic edges are INCLUDED (the core M3.5-001 property)
# ---------------------------------------------------------------------------
def test_global_graph_includes_cross_topic_edges():
    """All 45 relationships become edges — cross-topic (global_id) edges are
    kept, unlike the per-topic KnowledgeGraph which drops them."""
    gg = _ks().get_global_graph()
    assert gg.edge_count == 45

    # The roman_empire -> silk_road:silk_road (traded_with) edge is present.
    out = gg.out_neighbors("roman_empire:civ-roman")
    targets = {e.target: e.type for e in out}
    assert targets.get("silk_road:silk_road") == "traded_with"
    # And the roman -> hellenistic_world:civ-greek (conquered) edge — the
    # Data Agent expanded this to the M3.5-000 `conquered` relationship.
    assert targets.get("hellenistic_world:civ-greek") == "conquered"


def test_global_graph_complements_per_topic_graph():
    """Per-topic graph excludes foreign nodes; GlobalGraph includes them.
    This documents the relationship between the two graph layers."""
    ks = _ks()
    per_topic = ks.get_graph("roman_empire")
    global_g = ks.get_global_graph()
    # Per-topic layer: cross-topic targets are NOT nodes here.
    assert "silk_road:silk_road" not in per_topic.nodes
    # Global layer: the same target IS a node, with an edge into it.
    assert "silk_road:silk_road" in global_g.get_node("silk_road:silk_road").global_id


# ---------------------------------------------------------------------------
# 3. neighbors() — out / in / both
# ---------------------------------------------------------------------------
def test_global_neighbors_outgoing_includes_foreign():
    ks = _ks()
    neighbors = ks.global_neighbors("roman_empire:civ-roman", direction="outgoing")
    silk = [n for n in neighbors if n["global_id"] == "silk_road:silk_road"]
    assert silk, "cross-topic neighbor must appear in outgoing neighbors"
    assert silk[0]["relationship"] == "traded_with"
    assert silk[0]["direction"] == "outgoing"
    # The Silk Road entity is modeled as a Location (the trade route), not a
    # Civilization — the data, not the graph code, decides the entity type.
    assert silk[0]["type"] == "Location"
    assert silk[0]["topic"] == "silk_road"


def test_global_neighbors_incoming_direction():
    ks = _ks()
    # From the Silk Road side, Rome is an incoming neighbor.
    incoming = ks.global_neighbors("silk_road:silk_road", direction="incoming")
    rome = [n for n in incoming if n["global_id"] == "roman_empire:civ-roman"]
    assert rome and rome[0]["direction"] == "incoming"


# ---------------------------------------------------------------------------
# 4. find_path() — shortest path across topics
# ---------------------------------------------------------------------------
def test_global_find_path_rome_to_han_china():
    """Rome -> Silk Road -> Han China is walkable as one global path."""
    ks = _ks()
    path = ks.find_global_path("roman_empire:civ-roman", "silk_road:han_dynasty")
    assert path is not None
    assert path[0] == "roman_empire:civ-roman"
    assert path[-1] == "silk_road:han_dynasty"
    assert "silk_road:silk_road" in path
    # path length is edges+1; rome->silk_road->han = 2 edges -> 3 nodes
    assert len(path) == 3


def test_global_find_path_none_when_unreachable():
    # A node that is not in the graph yields None.
    ks = _ks()
    assert ks.find_global_path("roman_empire:civ-roman", "no_such:node") is None


# ---------------------------------------------------------------------------
# 5. subgraph() — scoped neighborhood
# ---------------------------------------------------------------------------
def test_global_subgraph_scopes_to_depth():
    ks = _ks()
    sub = ks.global_subgraph(["roman_empire:civ-roman"], max_depth=2)
    gids = {n.global_id for n in sub.all_nodes()}
    # Within 2 hops: Rome -> Silk Road -> Han China.
    assert "roman_empire:civ-roman" in gids
    assert "silk_road:silk_road" in gids
    assert "silk_road:han_dynasty" in gids
    # The subgraph is strictly smaller than (or equal to) the full graph.
    assert sub.node_count <= ks.get_global_graph().node_count
    assert sub.edge_count <= ks.get_global_graph().edge_count


def test_global_subgraph_preserves_edges():
    ks = _ks()
    sub = ks.global_subgraph(["roman_empire:civ-roman"], max_depth=1)
    edge_types = {e.type for e in sub.out_neighbors("roman_empire:civ-roman")}
    assert "traded_with" in edge_types
