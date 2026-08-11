"""Tests for the Content Configuration Layer (ADR-0021).

Coverage:
  A. Read path is unconditionally available and degrades to shipped defaults
     (the landing page must never break because of this layer — ADR-0021 D5).
  B. Write path is gated by ADMIN_ENABLED and OFF by default.
  C. Media upload validates extension, magic bytes and size, and stores under
     a server-chosen, content-addressed name (no client filename is trusted).
  D. Path traversal on the media read endpoint is refused.

`CONTENT_DIR` is read on every call, so redirecting it per-test with
monkeypatch is enough — no module reload, no global mutation to undo.
"""

import base64
import json
import sys
from pathlib import Path

import pytest

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import app.main as main_module  # noqa: E402
from app.content import content_store as store  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

PNG_BYTES = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64
JPEG_BYTES = b"\xff\xd8\xff\xe0" + b"\x00" * 64
WEBP_BYTES = b"RIFF" + b"\x00\x00\x00\x00" + b"WEBP" + b"\x00" * 64


@pytest.fixture()
def client() -> TestClient:
    return TestClient(main_module.app)


@pytest.fixture(autouse=True)
def isolated_content_dir(tmp_path, monkeypatch):
    """Point the store at a throwaway directory and disable writes by default."""
    monkeypatch.setenv("CONTENT_DIR", str(tmp_path / "content"))
    monkeypatch.delenv("ADMIN_ENABLED", raising=False)
    yield tmp_path / "content"


@pytest.fixture()
def admin_on(monkeypatch):
    monkeypatch.setenv("ADMIN_ENABLED", "true")


def _b64(data: bytes) -> str:
    return base64.b64encode(data).decode("ascii")


# --------------------------------------------------------------------------
# A. Read path
# --------------------------------------------------------------------------
def test_get_content_returns_shipped_defaults_when_nothing_configured(client):
    response = client.get("/api/v1/content")
    assert response.status_code == 200
    body = response.json()
    assert body["version"] == store.CONTENT_VERSION
    assert body["updated_at"] is None
    assert [card["id"] for card in body["cards"]] == list(store.ALLOWED_CARD_IDS)
    assert body["cards"][0]["title"] == "历史叙事"
    assert all(card["image"] is None for card in body["cards"])


def test_get_content_survives_a_corrupt_file(client, isolated_content_dir):
    """A broken file must degrade to defaults, never 500 — the page depends on it."""
    isolated_content_dir.mkdir(parents=True, exist_ok=True)
    (isolated_content_dir / "site-content.json").write_text("{ not json", encoding="utf-8")

    response = client.get("/api/v1/content")
    assert response.status_code == 200
    assert response.json()["cards"][0]["title"] == "历史叙事"


def test_partial_override_falls_back_to_defaults_per_field(client, isolated_content_dir):
    """A v1 file keyed by bare slot ids is migrated on read (ADR-0021 legacy);
    only the edited field is overridden, the rest falls back to defaults."""
    isolated_content_dir.mkdir(parents=True, exist_ok=True)
    (isolated_content_dir / "site-content.json").write_text(
        json.dumps({"version": 1, "cards": [{"id": "story", "title": "改过的标题"}]}),
        encoding="utf-8",
    )

    cards = {card["id"]: card for card in client.get("/api/v1/content").json()["cards"]}
    assert cards["landing.story"]["title"] == "改过的标题"
    assert cards["landing.story"]["desc"].startswith("把人、事件、文明")  # default retained
    assert cards["landing.explore"]["title"] == "关系探索"  # untouched card intact


def test_status_endpoint_reports_gate_state(client, monkeypatch):
    off = client.get("/api/v1/content/status").json()
    assert off["admin_enabled"] is False
    assert off["slot_count"] == len(store.CONTENT_SLOTS)
    assert off["module_count"] == len(store.modules())
    monkeypatch.setenv("ADMIN_ENABLED", "1")
    on = client.get("/api/v1/content/status").json()
    assert on["admin_enabled"] is True


# --------------------------------------------------------------------------
# B. Write gate
# --------------------------------------------------------------------------
def test_write_is_forbidden_by_default(client):
    payload = {"cards": [{"id": "story", "title": "x", "desc": "y", "image": None}]}
    assert client.put("/api/v1/content", json=payload).status_code == 403
    assert client.post("/api/v1/content/reset").status_code == 403
    assert client.post(
        "/api/v1/content/media", json={"filename": "a.png", "data": _b64(PNG_BYTES)}
    ).status_code == 403


def test_put_then_get_round_trip(client, admin_on):
    payload = {
        "cards": [
            {"id": "landing.story", "title": "新标题", "desc": "新描述", "image": None},
            {"id": "landing.explore", "title": "关系探索", "desc": "原样", "image": "abc123.png"},
        ]
    }
    put = client.put("/api/v1/content", json=payload)
    assert put.status_code == 200
    assert put.json()["updated_at"] is not None

    cards = {card["id"]: card for card in client.get("/api/v1/content").json()["cards"]}
    assert cards["landing.story"]["title"] == "新标题"
    assert cards["landing.explore"]["image"] == "abc123.png"
    assert cards["landing.research"]["title"] == "深度研究"  # untouched card keeps its default


def test_blank_values_fall_back_to_defaults(client, admin_on):
    client.put(
        "/api/v1/content",
        json={"cards": [{"id": "landing.story", "title": "   ", "desc": "", "image": None}]},
    )
    cards = {card["id"]: card for card in client.get("/api/v1/content").json()["cards"]}
    assert cards["landing.story"]["title"] == "历史叙事"


def test_unknown_card_id_is_rejected(client, admin_on):
    response = client.put(
        "/api/v1/content",
        json={"cards": [{"id": "not-a-card", "title": "x", "desc": "y", "image": None}]},
    )
    assert response.status_code == 400
    assert "unknown card id" in response.json()["detail"]


def test_reset_restores_factory_state(client, admin_on):
    client.put(
        "/api/v1/content",
        json={"cards": [{"id": "story", "title": "临时", "desc": "临时", "image": None}]},
    )
    assert client.get("/api/v1/content").json()["cards"][0]["title"] == "临时"

    reset = client.post("/api/v1/content/reset")
    assert reset.status_code == 200
    assert reset.json()["updated_at"] is None
    assert client.get("/api/v1/content").json()["cards"][0]["title"] == "历史叙事"


# --------------------------------------------------------------------------
# C. Media
# --------------------------------------------------------------------------
@pytest.mark.parametrize(
    "name,blob",
    [("a.png", PNG_BYTES), ("b.jpg", JPEG_BYTES), ("c.webp", WEBP_BYTES)],
)
def test_upload_accepts_supported_formats_and_serves_them(client, admin_on, name, blob):
    upload = client.post("/api/v1/content/media", json={"filename": name, "data": _b64(blob)})
    assert upload.status_code == 200, upload.text
    stored = upload.json()

    # server-chosen, content-addressed name — the client name is never trusted
    assert stored["filename"] != name
    assert stored["filename"].endswith(Path(name).suffix)
    assert stored["size_bytes"] == len(blob)

    served = client.get(f"/api/v1/content/media/{stored['filename']}")
    assert served.status_code == 200
    assert served.content == blob


def test_upload_accepts_data_url_prefix(client, admin_on):
    payload = {"filename": "a.png", "data": f"data:image/png;base64,{_b64(PNG_BYTES)}"}
    assert client.post("/api/v1/content/media", json=payload).status_code == 200


def test_identical_uploads_deduplicate(client, admin_on):
    first = client.post("/api/v1/content/media", json={"filename": "a.png", "data": _b64(PNG_BYTES)})
    second = client.post("/api/v1/content/media", json={"filename": "z.png", "data": _b64(PNG_BYTES)})
    assert first.json()["filename"] == second.json()["filename"]


def test_upload_rejects_unsupported_extension(client, admin_on):
    response = client.post(
        "/api/v1/content/media", json={"filename": "evil.svg", "data": _b64(PNG_BYTES)}
    )
    assert response.status_code == 400
    assert "unsupported file type" in response.json()["detail"]


def test_upload_rejects_content_extension_mismatch(client, admin_on):
    """PNG bytes wearing a .jpg extension must not slip through."""
    response = client.post(
        "/api/v1/content/media", json={"filename": "fake.jpg", "data": _b64(PNG_BYTES)}
    )
    assert response.status_code == 400
    assert "does not match" in response.json()["detail"]


def test_upload_rejects_oversized_image(client, admin_on):
    huge = PNG_BYTES + b"\x00" * (store.MAX_IMAGE_BYTES + 1)
    response = client.post(
        "/api/v1/content/media", json={"filename": "big.png", "data": _b64(huge)}
    )
    assert response.status_code == 400
    assert "exceeds" in response.json()["detail"]


def test_upload_rejects_invalid_base64(client, admin_on):
    response = client.post(
        "/api/v1/content/media", json={"filename": "a.png", "data": "!!!not base64!!!"}
    )
    assert response.status_code == 400


# --------------------------------------------------------------------------
# D. Traversal / unknown media
# --------------------------------------------------------------------------
@pytest.mark.parametrize(
    "name", ["missing.png", "..%2F..%2Fsecret.png", "sub%2Fdir.png", "note.txt"]
)
def test_media_read_refuses_unknown_or_traversal_names(client, name):
    assert client.get(f"/api/v1/content/media/{name}").status_code == 404


def test_media_read_is_public(client, admin_on, monkeypatch):
    """Once uploaded, artwork stays readable even with the admin gate closed."""
    stored = client.post(
        "/api/v1/content/media", json={"filename": "a.png", "data": _b64(PNG_BYTES)}
    ).json()
    monkeypatch.delenv("ADMIN_ENABLED", raising=False)
    assert client.get(f"/api/v1/content/media/{stored['filename']}").status_code == 200


# --------------------------------------------------------------------------
# Regression: existing endpoints untouched
# --------------------------------------------------------------------------
def test_existing_endpoints_still_respond(client):
    assert client.get("/api/v1/topics").status_code == 200


# --------------------------------------------------------------------------
# A2. Registry-driven surface: modules, defaults endpoint, items, legacy
# --------------------------------------------------------------------------
def test_get_content_defaults_returns_factory_document(client):
    """`/content/defaults` is the pure factory state — distinct from
    `/content` (which merges overrides) so the console can offer a per-card
    *restore*. Registry-derived, so it can never drift from CONTENT_SLOTS."""
    body = client.get("/api/v1/content/defaults").json()
    assert body["version"] == store.CONTENT_VERSION
    assert body["updated_at"] is None
    assert [c["id"] for c in body["cards"]] == list(store.ALLOWED_CARD_IDS)
    first = body["cards"][0]
    assert first["module"] and first["label"]
    assert "items" in first  # field present on every card


def test_content_is_grouped_into_modules(client):
    body = client.get("/api/v1/content").json()
    mods = {m["module"]: set(m["card_ids"]) for m in body["modules"]}
    assert len(mods) == len(store.modules())
    # the union of every module's card_ids covers all slots exactly once
    union = set().union(*mods.values())
    assert union == set(store.ALLOWED_CARD_IDS)


def test_items_round_trip_on_supports_items_slot(client, admin_on):
    """Slots that declare `supports_items` persist and return the bullet list."""
    slot = next(c for c in store.default_document()["cards"] if c["supports_items"])
    payload = {
        "cards": [
            {"id": slot["id"], "title": slot["title"], "desc": slot["desc"], "items": ["甲", "乙", "丙"]}
        ]
    }
    put = client.put("/api/v1/content", json=payload)
    assert put.status_code == 200
    cards = {c["id"]: c for c in client.get("/api/v1/content").json()["cards"]}
    assert cards[slot["id"]]["items"] == ["甲", "乙", "丙"]


def test_legacy_bare_id_is_migrated_on_read(client, isolated_content_dir):
    """A stored v1 document keyed by bare ids is transparently migrated."""
    isolated_content_dir.mkdir(parents=True, exist_ok=True)
    (isolated_content_dir / "site-content.json").write_text(
        json.dumps({"version": 1, "cards": [{"id": "story", "title": "legacy 标题"}]}),
        encoding="utf-8",
    )
    cards = {c["id"]: c for c in client.get("/api/v1/content").json()["cards"]}
    assert "landing.story" in cards
    assert cards["landing.story"]["title"] == "legacy 标题"


def test_dynamic_explore_modules_are_image_configurable(client):
    """ADR-0021 dynamic modules: explore_packs / explore_topics are derived from
    live data sources at import time, and every slot they expose must be
    backend-image-configurable (supports_image=True) so the admin layer can
    drive their artwork without code changes."""
    body = client.get("/api/v1/content").json()
    mods = {m["module"]: m for m in body["modules"]}

    assert "explore_packs" in mods
    assert "explore_topics" in mods

    cards = {c["id"]: c for c in body["cards"]}
    for mod_id in ("explore_packs", "explore_topics"):
        card_ids = mods[mod_id]["card_ids"]
        assert card_ids, f"{mod_id} must expose at least one card"
        for cid in card_ids:
            assert cards[cid]["supports_image"] is True

    # explore_packs count must track the packages data source exactly.
    packages_path = BACKEND_DIR.parent / "data" / "exploration_packages.json"
    raw = json.loads(packages_path.read_text(encoding="utf-8"))
    expected_packs = len(
        [p for p in raw.get("packages", []) if isinstance(p, dict) and p.get("slug")]
    )
    assert len(mods["explore_packs"]["card_ids"]) == expected_packs

    # explore_topics count tracks site-config topic_ordering, else the default 4.
    site_cfg = BACKEND_DIR.parent / "data" / "content" / "site-config.json"
    if site_cfg.is_file():
        ordering = json.loads(site_cfg.read_text(encoding="utf-8")).get("topic_ordering", [])
    else:
        ordering = ["roman_empire", "greek_philosophy", "persian_empire", "ancient_india"]
    assert len(mods["explore_topics"]["card_ids"]) == len(ordering)
