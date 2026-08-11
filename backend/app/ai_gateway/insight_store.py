"""Entity insight store — 历史见解固化存储（stdlib sqlite3 only, ADR-0018 范式）。

历史见解由后台触发 AI 基于证据生成后固化于此；前端只读固化内容，
不再每次实时调用 AI（PO 2026-08-10 判定：生成一次固定，刷新由后台管理）。
无新依赖、无 ORM、无外部 DB 进程。
"""
from __future__ import annotations

import json
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

_SCHEMA = """
CREATE TABLE IF NOT EXISTS entity_insights (
    global_id TEXT PRIMARY KEY,
    insight TEXT NOT NULL,
    evidence TEXT NOT NULL DEFAULT '[]',
    engine TEXT NOT NULL DEFAULT 'ai',
    updated_at TEXT NOT NULL
)
"""

_DEFAULT_DB = Path(__file__).resolve().parents[2] / "data" / "entity_insights.db"


def db_path() -> Path:
    """Resolve the database file. ``INSIGHT_DB_PATH`` overrides (tests/ops)."""
    raw = os.getenv("INSIGHT_DB_PATH", "").strip()
    return Path(raw) if raw else _DEFAULT_DB


def _connect() -> sqlite3.Connection:
    path = db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(path))
    conn.row_factory = sqlite3.Row
    conn.execute(_SCHEMA)
    return conn


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def save_insight(
    global_id: str, insight: str, evidence: list, engine: str = "ai"
) -> dict:
    """Upsert a curated/AI-generated insight for an entity."""
    updated = _now()
    conn = _connect()
    try:
        conn.execute(
            "INSERT INTO entity_insights (global_id, insight, evidence, engine, updated_at) "
            "VALUES (?,?,?,?,?) "
            "ON CONFLICT(global_id) DO UPDATE SET "
            "insight=excluded.insight, evidence=excluded.evidence, "
            "engine=excluded.engine, updated_at=excluded.updated_at",
            (global_id, insight, json.dumps(evidence, ensure_ascii=False), engine, updated),
        )
        conn.commit()
        return {
            "global_id": global_id,
            "insight": insight,
            "evidence": evidence,
            "engine": engine,
            "updated_at": updated,
        }
    finally:
        conn.close()


def get_insight(global_id: str) -> dict | None:
    conn = _connect()
    try:
        row = conn.execute(
            "SELECT * FROM entity_insights WHERE global_id=?", (global_id,)
        ).fetchone()
        if row is None:
            return None
        return {
            "global_id": row["global_id"],
            "insight": row["insight"],
            "evidence": json.loads(row["evidence"] or "[]"),
            "engine": row["engine"],
            "updated_at": row["updated_at"],
        }
    finally:
        conn.close()


def list_insights(limit: int = 200) -> list[dict]:
    conn = _connect()
    try:
        rows = conn.execute(
            "SELECT * FROM entity_insights ORDER BY updated_at DESC LIMIT ?", (limit,)
        ).fetchall()
        return [
            {
                "global_id": r["global_id"],
                "insight": r["insight"],
                "evidence": json.loads(r["evidence"] or "[]"),
                "engine": r["engine"],
                "updated_at": r["updated_at"],
            }
            for r in rows
        ]
    finally:
        conn.close()
