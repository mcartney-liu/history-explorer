import sys
from pathlib import Path

# Make the `app` package importable when pytest is launched from the repo
# root or the backend directory.
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import app.main as main_mod
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


# --- Task 1 & 5: index builds once, then reused from memory ---------------
def test_index_built_once_at_startup():
    # The shared index object is stable: build-once, read-many.
    idx = main_mod.knowledge_service.get_search_index()
    assert isinstance(idx, list) and len(idx) > 0
    ids = {r["id"] for r in idx}
    assert "person-augustus" in ids
    assert "loc-rome" in ids


def test_repeated_searches_reuse_index_no_rebuild():
    # After startup, search must read from the single in-memory index and
    # never rebuild it (no filesystem access, no duplicated index).
    ks = main_mod.knowledge_service
    idx_before = ks.get_search_index()
    res = client.get("/search?q=augustus")
    assert res.status_code == 200
    results = res.json()["results"]
    assert any(r["id"] == "person-augustus" for r in results)
    # The index object is reused across requests (built once at startup).
    assert ks.get_search_index() is idx_before
    assert ks._search_provider._index is idx_before


# --- Task 3 (backend half): ranking unchanged ------------------------------
def test_search_ranking_unchanged():
    res = client.get("/search?q=rome")
    results = res.json()["results"]
    # exact (loc-rome, name "Rome") must outrank contains ("Roman Civilization")
    assert results[0]["id"] == "loc-rome"
    assert results[0]["match"] == "exact"
    seen_contains = False
    for r in results:
        if r["match"] == "contains":
            seen_contains = True
        elif seen_contains and r["match"] == "exact":
            raise AssertionError("exact match ranked after a contains match")


# --- Task 2: local id + global_id lookup -----------------------------------
def test_entity_local_id_lookup():
    res = client.get("/entity/person-augustus")
    assert res.status_code == 200
    assert res.json()["id"] == "person-augustus"


def test_entity_global_id_lookup():
    # global_id from the roman_empire dataset resolves to the same local entity.
    res = client.get("/entity/roman_empire:person-augustus")
    assert res.status_code == 200
    body = res.json()
    assert body["id"] == "person-augustus"
    assert body["name"] == "Augustus"
    # The four required sections are all still present.
    for key in ("summary", "timeline", "relationships", "exploration"):
        assert key in body


def test_entity_global_id_unknown_404():
    res = client.get("/entity/roman_empire:does-not-exist")
    assert res.status_code == 404


# --- Task 3 (backend half): additive enrichment fields ---------------------
def test_search_response_carries_enrichment_fields():
    # Augustus has structured start/end dates; Rome (Location) has a region.
    res = client.get("/search?q=augustus")
    augustus = next(r for r in res.json()["results"] if r["id"] == "person-augustus")
    assert augustus["start"] == "63 BC"
    assert augustus["end"] == "14 CE"
    assert augustus["location"] is None  # Person has no region

    rome = client.get("/search?q=rome").json()["results"][0]
    assert rome["id"] == "loc-rome"
    assert rome["location"] == "Italian Peninsula"
