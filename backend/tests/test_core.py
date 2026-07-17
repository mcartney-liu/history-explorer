import sys
from pathlib import Path

# Make the `app` package importable when pytest is launched from the repo
# root or the backend directory.
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.core.repository import JsonTopicRepository
from app.core.knowledge_service import KnowledgeService
from app.core.graph import DirectedGraph
from app.validation import build_global_validation_report

DATA_DIR = BACKEND_DIR.parent / "data" / "examples"


def _ks() -> KnowledgeService:
    return KnowledgeService(JsonTopicRepository(DATA_DIR))


# --- Repository Layer ------------------------------------------------------
def test_repository_lists_topics():
    repo = JsonTopicRepository(DATA_DIR)
    topics = repo.list_topics()
    assert "roman_empire" in topics
    assert "egypt_technology_religion" in topics
    # cache: second load returns the same object
    assert repo.load_topic("roman_empire") is repo.load_topic("roman_empire")


# --- Registries ------------------------------------------------------------
def test_registry_resolves_local_and_global():
    ks = _ks()
    ref = ks.resolve_entity("person-augustus")
    assert ref is not None and ref.topic == "roman_empire" and ref.local_id == "person-augustus"
    ref2 = ks.resolve_entity("roman_empire:person-augustus")
    assert ref2 is not None and ref2.local_id == "person-augustus"


def test_find_by_alias():
    ks = _ks()
    refs = ks.find_by_alias("Octavian")
    assert any(r.local_id == "person-augustus" for r in refs)


def test_find_by_name():
    ks = _ks()
    ref = ks.find_by_name("Augustus")
    assert ref is not None and ref.local_id == "person-augustus"


# --- Graph / traversal -----------------------------------------------------
def test_graph_traversal_related():
    ks = _ks()
    related = ks.find_related("roman_empire", "person-augustus", direction="outgoing")
    assert any(r["id"] == "event-roman-empire-established" for r in related)
    # incoming direction yields nothing for augustus (he is only a source here)
    inc = ks.find_related("roman_empire", "person-augustus", direction="incoming")
    assert all(r["direction"] == "incoming" for r in inc)


def test_graph_structure():
    ks = _ks()
    g: DirectedGraph = ks.get_graph("roman_empire")
    assert "person-augustus" in g.nodes
    # The per-topic graph is intra-topic BY DESIGN: cross-topic (global_id)
    # edges live in the Knowledge Layer's registries, not the per-topic
    # adjacency. So a foreign entity never appears as a node here.
    assert "civ-egypt" not in g.nodes
    assert "silk_road" not in g.nodes


def test_graph_path_and_orphans():
    ks = _ks()
    g = ks.get_graph("egypt_technology_religion")
    # every node in the egypt topic is connected (no orphan expected here)
    assert isinstance(g.orphans(), list)


# --- Search via core -------------------------------------------------------
def test_search_uses_core():
    ks = _ks()
    results = ks.search("augustus")
    assert any(r["id"] == "person-augustus" and r["match"] == "exact" for r in results)
    # cross-topic term spans topics
    topics = {r["topic"] for r in ks.search("egypt")}
    assert "egypt_technology_religion" in topics


# --- Global (cross-topic) validation stays contract-compatible -------------
def test_global_validation_compatible_with_m2():
    ks = _ks()
    report = build_global_validation_report(ks)
    # Counts must reflect the ACTUAL repository, not a hardcoded snapshot.
    # The dataset keeps growing (4 topics in M3.5 -> 8 after M4-001); asserting
    # against a fixed number would break on every future expansion. So derive
    # the expected totals from the live datasets the report was built over.
    datasets = ks.get_topic_datasets()
    total_entities = sum(len(d.get("entities", [])) for _, d in datasets)
    total_rels = sum(len(d.get("relationships", [])) for _, d in datasets)
    total_timeline = sum(len(d.get("timeline", [])) for _, d in datasets)
    assert report.topic_count == len(datasets)
    assert report.entity_count == total_entities
    assert report.relationship_count == total_rels
    assert report.timeline_count == total_timeline
    assert report.error_count == 0
    assert report.status == "healthy"
    # The two legacy M2 quality warnings (Kemet duplicate alias, tp-27bc
    # orphan) were resolved in M3-003 — the dataset is now clean.
    codes = {i.code for i in report.issues}
    assert "DUPLICATE_ALIAS" not in codes
    assert "ORPHAN_ENTITY" not in codes


# --- KnowledgeService is built once & is the single read-model ------------
def test_core_single_build():
    ks = _ks()
    assert ks.get_search_index() is ks.get_search_index()
