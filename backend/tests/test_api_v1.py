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

# M3-002: the canonical API lives under /api/v1 and MUST be byte-for-byte
# identical to the frozen legacy routes (same handler function, same body).
V1 = "/api/v1"


def test_v1_explore_matches_legacy():
    legacy = client.get("/explore/roman_empire").json()
    v1 = client.get(f"{V1}/explore/roman_empire").json()
    assert v1 == legacy
    assert v1["topic"] == "roman_empire"


def test_v1_entity_matches_legacy():
    legacy = client.get("/entity/person-augustus").json()
    v1 = client.get(f"{V1}/entity/person-augustus").json()
    assert v1 == legacy
    assert v1["id"] == "person-augustus"


def test_v1_search_matches_legacy():
    legacy = client.get("/search?q=augustus").json()
    v1 = client.get(f"{V1}/search?q=augustus").json()
    assert v1 == legacy
    assert v1["count"] >= 1


def test_v1_topics_matches_legacy():
    # M5-A-1: the new topic-catalog endpoint must be byte-for-byte identical
    # under /api/v1 and the frozen legacy path (same handler, v1 == legacy).
    legacy = client.get("/topics").json()
    v1 = client.get(f"{V1}/topics").json()
    assert v1 == legacy
    assert "topics" in v1
    assert isinstance(v1["topics"], list)
    assert len(v1["topics"]) >= 1


def test_topics_contract_shape():
    # M5-A-1: every entry carries exactly {topic, title, summary} and no extra
    # fields, so the frozen client contract is not widened.
    body = client.get(f"{V1}/topics").json()
    assert set(body.keys()) == {"topics"}
    for item in body["topics"]:
        assert set(item.keys()) == {"topic", "title", "summary"}
        assert isinstance(item["topic"], str) and item["topic"]
        assert isinstance(item["title"], str)
        assert isinstance(item["summary"], str)


def test_topics_slugs_match_knowledge_core():
    # M5-A-1: the returned slugs are exactly the topics the Knowledge Core
    # exposes (no invented/duplicated topics), and summary is bounded.
    body = client.get(f"{V1}/topics").json()
    slugs = [t["topic"] for t in body["topics"]]
    # No duplicates, order matches the registry load order.
    assert len(slugs) == len(set(slugs))
    # The catalog is a pure projection of the existing topic set.
    for slug in slugs:
        assert client.get(f"{V1}/explore/{slug}").status_code == 200


def test_v1_health_matches_legacy():
    legacy = client.get("/health").json()
    v1 = client.get(f"{V1}/health").json()
    assert v1 == legacy
    assert v1["status"] == "healthy"


def test_v1_invalid_topic_blocked():
    # The same M-H3 regex gate applies under /api/v1.
    assert client.get(f"{V1}/explore/test.json").status_code == 400
    assert client.get(f"{V1}/explore/Roman_Empire").status_code == 400


def test_healthz_liveness_probe():
    # /healthz is a new, cheap liveness endpoint (no data-quality payload).
    res = client.get(f"{V1}/healthz")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert "version" in body

    # Legacy (no-prefix) liveness probe also exists for compatibility.
    assert client.get("/healthz").status_code == 200


def test_health_is_readiness_not_liveness():
    # /health still carries the full validation report (readiness), which is
    # heavier than /healthz. Their shapes differ on purpose.
    h = client.get("/health").json()
    assert "health" in h  # readiness payload
    z = client.get("/healthz").json()
    assert "health" not in z  # liveness payload


def test_response_hardening_headers_present():
    # Responses are stamped with hardening headers without altering the body.
    res = client.get(f"{V1}/healthz")
    assert res.headers.get("X-API-Version") == "v1"
    assert res.headers.get("X-Content-Type-Options") == "nosniff"

    # The same headers appear on a legacy route response.
    res2 = client.get("/explore/roman_empire")
    assert res2.headers.get("X-API-Version") == "v1"
    assert res2.headers.get("X-Content-Type-Options") == "nosniff"
