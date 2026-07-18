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


# --- M4-004 Search v2: unified results[] + result_type --------------------
def test_search_result_type_present_and_valid():
    # Every unified result carries a `result_type` tag (Entity or Topic).
    res = client.get("/search?q=rome")
    assert res.status_code == 200
    results = res.json()["results"]
    assert len(results) > 0
    for r in results:
        assert r["result_type"] in ("Entity", "Topic")
    # The canonical entity match is still tagged Entity.
    loc_rome = next(r for r in results if r["id"] == "loc-rome")
    assert loc_rome["result_type"] == "Entity"


def test_search_returns_topic_results():
    # Searching a topic name surfaces Topic results (not only entities).
    res = client.get("/search?q=roman")
    results = res.json()["results"]
    topics = [r for r in results if r["result_type"] == "Topic"]
    assert len(topics) > 0
    # The roman_empire topic is reachable by its name/title.
    assert any(t["topic"] == "roman_empire" for t in topics)


def test_search_topic_result_shape():
    # A Topic result has the v2 shape and must NOT carry an entity `id`.
    res = client.get("/search?q=empire")
    results = res.json()["results"]
    topic_rec = next(r for r in results if r["result_type"] == "Topic")
    assert topic_rec["result_type"] == "Topic"
    assert topic_rec["topic"]
    assert topic_rec["name"]
    assert topic_rec["match"] in ("exact", "alias", "contains")
    # Entity-only fields are absent on a Topic result.
    assert "id" not in topic_rec
    assert "type" not in topic_rec
    assert "start" not in topic_rec
    assert "end" not in topic_rec
    assert "location" not in topic_rec


# --- M4-004 Search v2: topic scope filter ---------------------------------
def test_search_topic_filter_scopes_whole_list():
    # `topic=` scopes BOTH entity and topic results to that topic.
    res = client.get("/search?q=empire&topic=roman_empire")
    assert res.status_code == 200
    results = res.json()["results"]
    assert len(results) > 0
    for r in results:
        assert r["topic"] == "roman_empire"


def test_search_topic_filter_excludes_other_topics():
    # Without a filter, q=empire spans multiple topics.
    unfiltered = client.get("/search?q=empire").json()["results"]
    unfiltered_topics = {r["topic"] for r in unfiltered}
    assert len(unfiltered_topics) > 1

    # With topic=roman_empire, only roman_empire remains.
    scoped = client.get("/search?q=empire&topic=roman_empire").json()["results"]
    scoped_topics = {r["topic"] for r in scoped}
    assert scoped_topics == {"roman_empire"}


# --- M4-004 Search v2: no pagination surface ------------------------------
def test_search_response_has_no_pagination_keys():
    # Pagination (limit / has_more / cursor / offset) is deferred to the
    # Search Engine stage and must NOT appear in M4.
    res = client.get("/search?q=rome").json()
    assert "limit" not in res
    assert "has_more" not in res
    assert "cursor" not in res
    assert "offset" not in res


# --- M4-004 Search v2: ranking contract preserved -------------------------
def test_search_unified_does_not_break_ranking():
    # Mirrors test_search_ranking_unchanged (entity-only contract) but also
    # asserts the unified list still ranks loc-rome (exact) first and never
    # places an exact match after a contains match, even with Topic results
    # mixed in.
    res = client.get("/search?q=rome")
    results = res.json()["results"]
    assert results[0]["id"] == "loc-rome"
    assert results[0]["match"] == "exact"
    assert results[0]["result_type"] == "Entity"
    seen_contains = False
    for r in results:
        if r["match"] == "contains":
            seen_contains = True
        elif seen_contains and r["match"] == "exact":
            raise AssertionError("exact match ranked after a contains match")
