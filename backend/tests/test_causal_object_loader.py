"""Tests for M86.2 — read-only CausalObject loader + API (Plan A).

Two layers, mirroring the M29.1-C provenance test matrix:

A. Loader unit tests (no app import):
   - data/causal_objects.json loads into 12 CausalObjects (all present)
   - every object round-trips the 11 frozen fields (M82/M84/M85 field lock)
   - nested ExplorationPathRef / RelatedCausalObjectRef parse correctly
   - to_dict() is the exact inverse used by the HTTP handler

B. HTTP integration tests (via TestClient on app.main):
   - GET /api/v1/causal-objects and /causal-objects return 200 with 12 objects
   - GET /api/v1/causal-objects/{id} (v1 + legacy) returns the single object
   - an unknown id returns 404 on both surfaces
   - existing endpoints still work (no regression)
"""
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.causal_objects import (
    CausalObject,
    ExplorationPathRef,
    RelatedCausalObjectRef,
    load_causal_objects,
)

# M85 relation_type enumeration (must match causal_object.py docstring + frontend).
RELATION_TYPES = {
    "institutional_evolution",
    "technological_chain",
    "civilization_contrast",
    "ideological_influence",
}


# ---------------------------------------------------------------------------
# A. Loader unit tests
# ---------------------------------------------------------------------------

def test_loads_all_twelve_objects():
    objects = load_causal_objects()
    assert len(objects) == 12
    # every object carries its curated id
    assert all(o.id for o in objects)
    ids = {o.id for o in objects}
    assert len(ids) == 12  # no duplicate ids


def test_eleven_frozen_fields_present():
    objects = load_causal_objects()
    for o in objects:
        # Required string spine (never None)
        assert isinstance(o.id, str) and o.id
        assert isinstance(o.cause_id, str) and o.cause_id
        assert isinstance(o.effect_id, str) and o.effect_id
        # object_type defaults to "causal" and is always present
        assert o.object_type == "causal"
        # Optional interpretive fields are None-or-string
        for field in (o.mechanism, o.consequence, o.confidence):
            assert field is None or isinstance(field, str)
        # evidence_refs / related_entities are frozen tuples of strings
        assert isinstance(o.evidence_refs, tuple)
        assert all(isinstance(r, str) for r in o.evidence_refs)
        assert isinstance(o.related_entities, tuple)
        assert all(isinstance(e, str) for e in o.related_entities)
        # nested refs are frozen tuples of the right dataclass
        assert isinstance(o.exploration_paths, tuple)
        assert isinstance(o.related_causal_objects, tuple)


def test_exploration_paths_parse():
    objects = load_causal_objects()
    # co-001 is curated with 2 exploration paths
    co001 = next(o for o in objects if o.id == "co-001")
    assert len(co001.exploration_paths) == 2
    for p in co001.exploration_paths:
        assert isinstance(p, ExplorationPathRef)
        assert p.from_gid and p.to_gid and p.relationship and p.label


def test_related_causal_objects_parse():
    objects = load_causal_objects()
    co001 = next(o for o in objects if o.id == "co-001")
    assert len(co001.related_causal_objects) == 2
    for r in co001.related_causal_objects:
        assert r.target_id and r.explanation
        assert r.relation_type in RELATION_TYPES


def test_to_dict_round_trip():
    objects = load_causal_objects()
    co001 = next(o for o in objects if o.id == "co-001")
    d = co001.to_dict()
    # 11 frozen keys present (conditionals omitted only when empty/None)
    for key in (
        "id", "cause_id", "effect_id", "object_type",
        "mechanism", "consequence", "confidence",
        "evidence_refs", "related_entities",
        "exploration_paths", "related_causal_objects",
    ):
        assert key in d, f"missing key {key}"
    assert d["id"] == "co-001"
    assert d["object_type"] == "causal"
    assert len(d["exploration_paths"]) == 2
    assert d["exploration_paths"][0]["from"] == "china_v1:idea-wenguan"
    assert d["exploration_paths"][0]["relationship"] == "preceded"
    assert len(d["related_causal_objects"]) == 2
    assert d["related_causal_objects"][0]["target_id"] == "co-004"
    assert d["related_causal_objects"][0]["relation_type"] == "institutional_evolution"


# ---------------------------------------------------------------------------
# B. HTTP integration tests
# ---------------------------------------------------------------------------

import app.main as main_module  # noqa: E402  (import after unit imports)
from fastapi.testclient import TestClient  # noqa: E402

EXPECTED_COUNT = 12


def test_app_starts():
    client = TestClient(main_module.app)
    assert client.get("/health").status_code == 200


def test_causal_objects_list_v1_and_legacy_200():
    client = TestClient(main_module.app)
    for path in ("/api/v1/causal-objects", "/causal-objects"):
        r = client.get(path)
        assert r.status_code == 200
        body = r.json()
        assert "causal_objects" in body
        assert len(body["causal_objects"]) == EXPECTED_COUNT
        # shape of the first item matches the frontend CausalObjectData contract
        first = body["causal_objects"][0]
        for key in ("id", "cause_id", "effect_id", "object_type"):
            assert key in first


def test_causal_object_get_v1_and_legacy_200():
    client = TestClient(main_module.app)
    for path in ("/api/v1/causal-objects/co-001", "/causal-objects/co-001"):
        r = client.get(path)
        assert r.status_code == 200
        body = r.json()
        assert body["id"] == "co-001"
        assert body["object_type"] == "causal"


def test_causal_object_unknown_returns_404():
    client = TestClient(main_module.app)
    for path in ("/api/v1/causal-objects/co-999", "/causal-objects/co-999"):
        r = client.get(path)
        assert r.status_code == 404


def test_regression_existing_endpoints_unchanged():
    client = TestClient(main_module.app)
    assert client.get("/explore/roman_empire").status_code == 200
    assert client.get("/entity/person-augustus").status_code == 200
    assert client.get("/search?q=augustus").status_code == 200
    assert client.get("/topics").status_code == 200
    assert client.get("/health").status_code == 200


def test_causal_objects_match_loader_count():
    """The HTTP surface must serve exactly what the loader produces."""
    client = TestClient(main_module.app)
    r = client.get("/api/v1/causal-objects")
    http_count = len(r.json()["causal_objects"])
    loader_count = len(load_causal_objects())
    assert http_count == loader_count == EXPECTED_COUNT
