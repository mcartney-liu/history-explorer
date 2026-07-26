"""Integration tests for GET /provenance/{entity_id} (M29.1-C).

M29.2 Test Matrix, categories B (runtime integration) + C (regression):
- PROVENANCE_PROJECTION=true: app starts; both /api/v1/provenance/{id} and the
  legacy /provenance/{id} return 200 with correct provenance records; an unknown
  id returns 200 with an empty list (no 404 — absence of provenance is valid).
- PROVENANCE_PROJECTION=false: the endpoint returns 404 with a clear detail, and
  the existing KnowledgeService endpoints (/entity, /topics, /explore) keep
  working — i.e. clean fallback to vM27.1 behavior.
- No existing endpoint behavior changed (regression sweep).

The handler reads module-level `PROVENANCE_PROJECTION` + `provenance_index`
globals, so the disabled case is exercised by patching those globals (no
subprocess / env juggling needed) — faithfully mirroring the real flag gate.
"""

import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import app.main as main_module
from fastapi.testclient import TestClient


def test_provenance_projection_flag_default_true_and_index_built():
    # app.main is imported with default env -> flag on, index present
    assert main_module.PROVENANCE_PROJECTION is True
    assert main_module.provenance_index is not None


def test_app_starts_with_projection_enabled():
    client = TestClient(main_module.app)
    assert client.get("/health").status_code == 200


def test_provenance_v1_and_legacy_return_200_with_records():
    client = TestClient(main_module.app)
    subject = main_module.provenance_index.subjects()[0]
    for path in (f"/api/v1/provenance/{subject}", f"/provenance/{subject}"):
        r = client.get(path)
        assert r.status_code == 200
        body = r.json()
        assert body["entity_id"] == subject
        assert isinstance(body["provenance"], list)
        assert len(body["provenance"]) >= 1
        rec = body["provenance"][0]
        assert set(rec.keys()) == {"subject_id", "source_id", "claim_id", "reference"}


def test_provenance_unknown_entity_returns_200_empty():
    client = TestClient(main_module.app)
    for path in ("/api/v1/provenance/zzz-no-such", "/provenance/zzz-no-such"):
        r = client.get(path)
        assert r.status_code == 200
        assert r.json()["provenance"] == []


def test_provenance_disabled_returns_404_but_knowledge_runtime_works():
    saved_flag = main_module.PROVENANCE_PROJECTION
    saved_index = main_module.provenance_index
    main_module.PROVENANCE_PROJECTION = False
    main_module.provenance_index = None
    try:
        client = TestClient(main_module.app)
        for path in ("/api/v1/provenance/x", "/provenance/x"):
            r = client.get(path)
            assert r.status_code == 404
            assert "disabled" in (r.json().get("detail") or "").lower()
        # regression: KnowledgeService endpoints still work under vM27.1 fallback
        assert client.get("/entity/person-augustus").status_code == 200
        assert client.get("/topics").status_code == 200
        assert client.get("/explore/roman_empire").status_code == 200
    finally:
        main_module.PROVENANCE_PROJECTION = saved_flag
        main_module.provenance_index = saved_index


def test_regression_existing_endpoints_unchanged():
    client = TestClient(main_module.app)
    assert client.get("/explore/roman_empire").status_code == 200
    assert client.get("/entity/person-augustus").status_code == 200
    assert client.get("/search?q=augustus").status_code == 200
    assert client.get("/topics").status_code == 200
    assert client.get("/health").status_code == 200
