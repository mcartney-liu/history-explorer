"""Gap-state ledger — SQLite store (ADR-0018 cognitive-loop extension).

WHY (Article 0 ② / ③ — cognitive loop): the "Knowledge Gap" state of the
cognitive loop (docs/NEXT_PHASE/P2_COGNITIVE_LOOP_DESIGN.md) must persist so a
user's "what I still don't get" survives a page reload — otherwise the loop is
invisible and Article 0 ② (find your method) cannot be felt. This module is the
durable floor for that state.

Constraints honoured (same family as ``research_store`` / ``insight_store``
under ADR-0018):
  - stdlib ``sqlite3`` ONLY. No new dependency, no ORM, no external DB process.
  - The DB file (``backend/data/gap.db``) is a runtime artifact and is
    gitignored — never project source.
  - Storage ONLY. The ``snapshot`` payload is an opaque JSON blob decided by the
    caller (frontend). No AI logic, no graph access, no business rules here.
  - Session-scoped via the anonymous ``X-Session-Id`` header (same ownership
    model as ``/api/v1/research``): no login, no cross-session read.

Design note (D1 / D2): the ledger key is ``(session_id, entity_id)``. In the
first build the frontend passes the understanding workspace *topic* slug as
``entity_id`` (the workspace is topic-driven). A true per-entity grain is
expressed *inside* the ``snapshot`` (an optional ``entity_global_id``) and
refined in the loop-closing stage; the topic key keeps the first build
unblocked while still honouring the D1 "entity-level" intent. Persistence
scope stays "Gap + understanding snapshot only" (D2) — no full trajectory.
"""

from __future__ import annotations

import json
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

# backend/app/ai_gateway/gap_ledger.py -> parents[2] == backend/
_DEFAULT_DB = Path(__file__).resolve().parents[2] / "data" / "gap.db"

_SCHEMA = """
CREATE TABLE IF NOT EXISTS gap_ledger (
    entity_id  TEXT NOT NULL,
    session_id TEXT NOT NULL,
    snapshot   TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (entity_id, session_id)
)
"""

# Bound the per-session read so one runaway client cannot stream the whole DB.
DEFAULT_LIMIT = 200


def db_path() -> Path:
    """Resolve the database file. ``GAP_DB_PATH`` overrides (tests / ops)."""
    raw = os.getenv("GAP_DB_PATH", "").strip()
    return Path(raw) if raw else _DEFAULT_DB


def _connect() -> sqlite3.Connection:
    """Open a short-lived connection with the schema ensured.

    Mirrors ``research_store._connect``: a fresh connection per operation keeps
    the store safe under FastAPI's threadpool (sync handlers run on different
    threads) without any locking of our own — sqlite3 connections are not
    shareable across threads by default.
    """
    path = db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(path))
    conn.row_factory = sqlite3.Row
    conn.execute(_SCHEMA)
    return conn


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _row_to_record(row: sqlite3.Row) -> dict:
    """Flatten a row into the wire record the client expects.

    The opaque payload is spread at the top level; the authoritative columns
    (entity_id / session_id / updated_at) are written last so a stale payload
    copy can never shadow them.
    """
    try:
        snapshot = json.loads(row["snapshot"])
    except (TypeError, ValueError):
        snapshot = {}
    if not isinstance(snapshot, dict):
        snapshot = {}
    return {
        **snapshot,
        "entity_id": row["entity_id"],
        "session_id": row["session_id"],
        "updated_at": row["updated_at"],
    }


def upsert_gap(session_id: str, entity_id: str, snapshot: dict[str, Any]) -> dict:
    """Persist (insert or replace) the gap snapshot for one entity + session."""
    updated_at = _now()
    body = json.dumps(snapshot or {}, ensure_ascii=False)
    with _connect() as conn:
        conn.execute(
            "INSERT INTO gap_ledger (entity_id, session_id, snapshot, updated_at) "
            "VALUES (?, ?, ?, ?) "
            "ON CONFLICT(entity_id, session_id) DO UPDATE SET "
            "snapshot = excluded.snapshot, updated_at = excluded.updated_at",
            (entity_id, session_id, body, updated_at),
        )
    return {
        **(snapshot or {}),
        "entity_id": entity_id,
        "session_id": session_id,
        "updated_at": updated_at,
    }


def get_gap(entity_id: str, session_id: str) -> Optional[dict]:
    """Return one entity's gap snapshot for the session, or None if absent."""
    with _connect() as conn:
        row = conn.execute(
            "SELECT entity_id, session_id, snapshot, updated_at FROM gap_ledger "
            "WHERE entity_id = ? AND session_id = ?",
            (entity_id, session_id),
        ).fetchone()
    return _row_to_record(row) if row else None


def list_gaps(session_id: str, limit: int = DEFAULT_LIMIT) -> list[dict]:
    """Newest-first gap snapshots belonging to one session."""
    with _connect() as conn:
        rows = conn.execute(
            "SELECT entity_id, session_id, snapshot, updated_at FROM gap_ledger "
            "WHERE session_id = ? ORDER BY updated_at DESC, rowid DESC LIMIT ?",
            (session_id, max(1, int(limit))),
        ).fetchall()
    return [_row_to_record(r) for r in rows]
