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


# --- /search -------------------------------------------------------------
def test_search_empty_query():
    res = client.get("/search?q=")
    assert res.status_code == 200
    body = res.json()
    assert body["count"] == 0
    assert body["results"] == []


def test_search_exact_match():
    # "augustus" exactly matches entity id `person-augustus` (case-insensitive).
    res = client.get("/search?q=augustus")
    assert res.status_code == 200
    results = res.json()["results"]
    assert any(r["id"] == "person-augustus" and r["match"] == "exact" for r in results)


def test_search_alias_match():
    # "Octavian" is an alias of person-augustus -> alias-ranked, not exact.
    res = client.get("/search?q=octavian")
    assert res.status_code == 200
    body = res.json()
    assert body["count"] >= 1
    hit = next(r for r in body["results"] if r["id"] == "person-augustus")
    assert hit["match"] == "alias"


def test_search_contains_match():
    # "pyramid" is a substring of "Great Pyramid Built" (no exact/alias hit).
    res = client.get("/search?q=pyramid")
    assert res.status_code == 200
    body = res.json()
    assert body["count"] >= 1
    assert any(r["match"] == "contains" for r in body["results"])


def test_search_ranking_exact_before_contains():
    # "rome" exactly matches loc-rome (name "Rome") and is a substring of
    # "Roman Civilization" (civ-roman). Exact must outrank contains.
    res = client.get("/search?q=rome")
    assert res.status_code == 200
    results = res.json()["results"]
    assert results[0]["id"] == "loc-rome"
    assert results[0]["match"] == "exact"
    # No exact match should ever appear after a contains match.
    seen_contains = False
    for r in results:
        if r["match"] == "contains":
            seen_contains = True
        elif seen_contains and r["match"] == "exact":
            raise AssertionError("exact match ranked after a contains match")


def test_search_spans_multiple_topics():
    # A cross-dataset term should surface entities from more than one dataset.
    res = client.get("/search?q=egypt")
    assert res.status_code == 200
    topics = {r["topic"] for r in res.json()["results"]}
    assert "egypt_technology_religion" in topics


# --- Reported feedback bug (2026-08-20): localized (non-Latin) label search
def test_search_localized_label_exact():
    # "张骞" is the zh label of person-zhang-qian (whose canonical `name` is
    # "Zhang Qian"). The search must match the localized label, not just the
    # English name, so the Person surfaces — previously it was hidden and only
    # the event mentioning 张骞 in its description came back.
    res = client.get("/search?q=张骞")
    assert res.status_code == 200
    body = res.json()
    assert body["count"] >= 1
    person = next((r for r in body["results"] if r["id"] == "person-zhang-qian"), None)
    assert person is not None, "张骞 (localized label) must surface the Person entity"
    assert person["result_type"] == "Entity"
    assert person["match"] == "exact"
    # The Person must outrank the event that only mentions 张骞 in its description.
    event = next((r for r in body["results"] if r["id"] == "event-silk-road-opened"), None)
    if event is not None:
        assert body["results"].index(person) < body["results"].index(event)


def test_search_phrase_contains_label():
    # "丝绸之路开辟" previously returned 0 results: no entity had that exact
    # name and the old matcher only did exact/alias/substring. The route entity
    # "silk_road" (label "丝绸之路") is now surfaced via name_within, and the
    # dedicated event (label "丝绸之路开辟") via exact label match.
    res = client.get("/search?q=丝绸之路开辟")
    assert res.status_code == 200
    body = res.json()
    assert body["count"] >= 2
    ids = {r["id"] for r in body["results"]}
    assert "silk_road" in ids
    assert "event-silk-road-opened" in ids
    opened = next(r for r in body["results"] if r["id"] == "event-silk-road-opened")
    assert opened["match"] == "exact"
    route = next(r for r in body["results"] if r["id"] == "silk_road")
    assert route["match"] == "name_within"


# --- /entity -------------------------------------------------------------
def test_entity_found_shape():
    res = client.get("/entity/person-augustus")
    assert res.status_code == 200
    body = res.json()
    # The four required sections are all present.
    for key in ("summary", "timeline", "relationships", "exploration"):
        assert key in body
    assert body["id"] == "person-augustus"
    assert isinstance(body["timeline"], list)
    assert isinstance(body["relationships"], list)
    assert body["exploration"]["main_entity"]["id"] == "person-augustus"
    assert len(body["exploration"]["related_entities"]) > 0


def test_entity_relationship_directions():
    # Outgoing: entity is the relationship source.
    out = client.get("/entity/person-augustus").json()
    assert any(
        r["direction"] == "outgoing" and r["source"] == "person-augustus"
        for r in out["relationships"]
    )
    # Incoming: entity is the relationship target.
    inc = client.get("/entity/event-roman-empire-established").json()
    assert any(
        r["direction"] == "incoming" and r["target"] == "event-roman-empire-established"
        for r in inc["relationships"]
    )


def test_entity_404():
    res = client.get("/entity/does-not-exist-xyz")
    assert res.status_code == 404


def test_entity_navigation_loop_resolvable():
    # Every related entity on an entity page must itself resolve via /entity,
    # so the Explore -> Connect -> Continue click loop is server-side sound.
    base = client.get("/entity/civ-egypt").json()
    related = base["exploration"]["related_entities"]
    assert len(related) > 0
    for rel in related:
        assert client.get(f"/entity/{rel['id']}").status_code == 200
