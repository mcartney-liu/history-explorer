"""Gap-ledger storage tests (ADR-0018 cognitive-loop extension).

Exercises the durable floor of the cognitive loop's "Knowledge Gap" state:
round-trip persistence, session-scoped isolation, upsert-overwrite semantics,
newest-first listing, and the missing-key => None contract.
"""

from __future__ import annotations

import pytest

from app.ai_gateway import gap_ledger


@pytest.fixture
def isolated_db(tmp_path, monkeypatch):
    """Point the store at a throwaway file so the suite never touches data/."""
    db = tmp_path / "gap_test.db"
    monkeypatch.setenv("GAP_DB_PATH", str(db))
    yield db


def test_upsert_then_get_roundtrip(isolated_db):
    rec = gap_ledger.upsert_gap(
        "sess-1", "french-revolution", {"evidence_index": 2, "total": 5}
    )
    assert rec["entity_id"] == "french-revolution"
    assert rec["updated_at"]
    got = gap_ledger.get_gap("french-revolution", "sess-1")
    assert got is not None
    assert got["evidence_index"] == 2
    assert got["total"] == 5


def test_session_isolation(isolated_db):
    gap_ledger.upsert_gap("sess-1", "topic-a", {"x": 1})
    # A different anonymous session must never read another's gap.
    assert gap_ledger.get_gap("topic-a", "sess-2") is None


def test_upsert_overwrites_same_key(isolated_db):
    gap_ledger.upsert_gap("s", "t", {"v": 1})
    gap_ledger.upsert_gap("s", "t", {"v": 2})
    assert gap_ledger.get_gap("t", "s")["v"] == 2


def test_list_gaps_newest_first(isolated_db):
    gap_ledger.upsert_gap("s", "a", {})
    gap_ledger.upsert_gap("s", "b", {})
    assert [i["entity_id"] for i in gap_ledger.list_gaps("s")] == ["b", "a"]


def test_missing_gap_returns_none(isolated_db):
    assert gap_ledger.get_gap("never", "s") is None
