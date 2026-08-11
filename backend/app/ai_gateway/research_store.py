"""Research persistence — SQLite store (ADR-0018, lift of red line C6).

WHY this exists (COMPASS Article 0 ①): a research package is the visible form
of the cognitive structure a user has built. Losing it on page reload means the
structure never accumulates. Persisting it is therefore not a feature, it is
the precondition for Article 0 ①.

Constraints honoured:
  - stdlib ``sqlite3`` ONLY. No new dependency, no ORM, no external DB process.
  - The DB file (``backend/data/research.db``) is a runtime artifact and is
    gitignored — it is never project source.
  - This module owns STORAGE ONLY. It never interprets a payload; the payload
    is an opaque JSON object decided by the caller. No AI logic, no graph
    access, no business rules live here.
"""

from __future__ import annotations

import json
import os
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

# backend/app/ai_gateway/research_store.py -> parents[2] == backend/
_DEFAULT_DB = Path(__file__).resolve().parents[2] / "data" / "research.db"

_SCHEMA = """
CREATE TABLE IF NOT EXISTS research (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    payload TEXT NOT NULL
)
"""

_SESSION_INDEX = (
    "CREATE INDEX IF NOT EXISTS idx_research_session "
    "ON research(session_id, created_at DESC)"
)

# Bound the per-session read so one runaway client cannot stream the whole DB.
DEFAULT_LIMIT = 200


def db_path() -> Path:
    """Resolve the database file. ``RESEARCH_DB_PATH`` overrides (tests/ops)."""
    raw = os.getenv("RESEARCH_DB_PATH", "").strip()
    return Path(raw) if raw else _DEFAULT_DB


def _connect() -> sqlite3.Connection:
    """Open a short-lived connection with the schema ensured.

    A fresh connection per operation keeps the store safe under FastAPI's
    threadpool (sync handlers run on different threads) without any locking of
    our own — sqlite3 connections are not shareable across threads by default.
    """
    path = db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(path))
    conn.row_factory = sqlite3.Row
    conn.execute(_SCHEMA)
    conn.execute(_SESSION_INDEX)
    return conn


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _row_to_record(row: sqlite3.Row) -> dict:
    """Flatten a row into the wire record the client expects.

    The frontend reads ``id`` / ``created_at`` plus the snake_case payload keys
    at the TOP level, so the payload is spread rather than nested. ``id`` and
    ``created_at`` are written last so a stale payload copy can never shadow
    the authoritative column values.
    """
    try:
        payload = json.loads(row["payload"])
    except (TypeError, ValueError):
        payload = {}
    if not isinstance(payload, dict):
        payload = {}
    return {
        **payload,
        "id": row["id"],
        "session_id": row["session_id"],
        "created_at": row["created_at"],
    }


def save_research(session_id: str, payload: dict[str, Any]) -> dict:
    """Persist one research package. Returns the stored record."""
    record_id = uuid.uuid4().hex
    created_at = _now()
    body = json.dumps(payload or {}, ensure_ascii=False)
    with _connect() as conn:
        conn.execute(
            "INSERT INTO research (id, session_id, created_at, payload) "
            "VALUES (?, ?, ?, ?)",
            (record_id, session_id, created_at, body),
        )
    return {
        **(payload or {}),
        "id": record_id,
        "session_id": session_id,
        "created_at": created_at,
    }


def list_research(session_id: str, limit: int = DEFAULT_LIMIT) -> list[dict]:
    """Newest-first research packages belonging to one session."""
    with _connect() as conn:
        rows = conn.execute(
            "SELECT id, session_id, created_at, payload FROM research "
            "WHERE session_id = ? ORDER BY created_at DESC, rowid DESC LIMIT ?",
            (session_id, max(1, int(limit))),
        ).fetchall()
    return [_row_to_record(r) for r in rows]


def get_research(record_id: str, session_id: Optional[str] = None) -> Optional[dict]:
    """Fetch one record. When ``session_id`` is given it must also match."""
    sql = "SELECT id, session_id, created_at, payload FROM research WHERE id = ?"
    args: tuple = (record_id,)
    if session_id:
        sql += " AND session_id = ?"
        args = (record_id, session_id)
    with _connect() as conn:
        row = conn.execute(sql, args).fetchone()
    return _row_to_record(row) if row else None


def delete_research(record_id: str, session_id: Optional[str] = None) -> bool:
    """Delete one record. Scoped to the session so a client cannot delete
    another session's research. Returns True when a row was removed."""
    sql = "DELETE FROM research WHERE id = ?"
    args: tuple = (record_id,)
    if session_id:
        sql += " AND session_id = ?"
        args = (record_id, session_id)
    with _connect() as conn:
        cur = conn.execute(sql, args)
        return cur.rowcount > 0
