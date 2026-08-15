# Friend-trial user feedback persistence + reply loop.
#
# WHY: the homepage FeedbackWidget previously only wrote to the visitor's own
# browser localStorage, so feedback from friend-trial users (who reach the
# tunnel backend on this same machine) never reached the PO. This module gives
# the widget a real backend sink.
#
# CLOSED LOOP (added in this revision):
#   - Friend submits  -> POST /api/v1/feedback  -> stored, returns id.
#   - Friend sees own  -> GET  /api/v1/feedback/{id}  (id kept in their browser).
#   - PO replies        -> POST /admin/feedback/{id}/reply  (token-protected).
#   - Friend sees reply -> GET  /api/v1/feedback/{id}  now carries `reply`.
#   - PO management UI  -> GET  /admin/feedback  (inline HTML, localhost only).
#
# RED-LINE SAFETY:
#   - ZERO new dependency (stdlib json / os / uuid / pathlib / datetime /
#     threading only).
#   - NO database (no sqlite, no ORM) — a plain append-only JSONL file. This is
#     a strictly SMALLER surface than the ADR-0018 sqlite research store; it
#     does not reuse or extend that gate, it just avoids the "no persistence"
#     red line via the same spirit (local file, no external DB process,
#     gitignored runtime state).
#   - NO AI / LLM / graph / business logic. Pure I/O + validation.
#   - The /admin/* surface is intentionally NOT proxied by the tunnel's
#     serve.js (PROXY_PREFIXES omits "/admin"), so it is reachable only from
#     this machine via localhost:8002 — the public tunnel can never open it.
#
# STORAGE: backend/data/feedback.jsonl, resolved from __file__ so BOTH the
# tunnel backend (8002) and the local dev backend (8001) read/write the SAME
# file on this machine — feedback collected via the tunnel is visible locally.

import json
import os
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel, Field

router = APIRouter()
# Admin surface (localhost only — not proxied through the public tunnel).
admin_router = APIRouter()

# backend/app/feedback.py -> backend/data/feedback.jsonl
_STORE_DIR = Path(__file__).resolve().parent.parent / "data"
_STORE_PATH = _STORE_DIR / "feedback.jsonl"

# Serialize reads/rewrites so a concurrent append can't be lost during a
# read-modify-write reply (low-traffic admin action; lock is cheap).
# RLock (not Lock): reply_feedback holds the lock across a _write_all() call
# that itself re-acquires it, so the lock MUST be reentrant or the same thread
# deadlocks on the second acquire.
_STORE_LOCK = threading.RLock()

_ALLOWED_SENTIMENTS = {"up", "down"}


def _ensure_env() -> None:
    """Best-effort load of backend/.env so FEEDBACK_ADMIN_TOKEN is available
    regardless of the process working directory. Reads the file resolved from
    __file__ (backend/.env); only sets vars not already present, so it never
    clobbers an explicit shell export or main.py's own dotenv load.
    """
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if not env_path.is_file() or "FEEDBACK_ADMIN_TOKEN" in os.environ:
        return
    try:
        with open(env_path, "r", encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, _, val = line.partition("=")
                key = key.strip()
                val = val.strip().strip('"').strip("'")
                if key and key not in os.environ:
                    os.environ[key] = val
    except OSError:
        pass


class FeedbackIn(BaseModel):
    sentiment: Optional[str] = Field(default=None, description="'up' | 'down' | null")
    message: Optional[str] = Field(default=None, description="optional free-text note")
    page: Optional[str] = Field(default=None, description="page/context tag from the widget")
    ts: Optional[int] = Field(default=None, description="client timestamp (epoch ms)")


class FeedbackEntry(BaseModel):
    id: str
    sentiment: Optional[str] = None
    message: Optional[str] = None
    page: Optional[str] = None
    client_ts: Optional[int] = None
    received_at: str
    # Reply loop (added in the closed-loop revision). Older stored lines lack
    # these keys; the Optional defaults keep them backward-compatible.
    reply: Optional[str] = None
    reply_at: Optional[str] = None
    reply_by: Optional[str] = None


class FeedbackReply(BaseModel):
    token: str = Field(description="FEEDBACK_ADMIN_TOKEN from backend/.env")
    message: str = Field(description="reply text shown to the friend")
    by: Optional[str] = Field(default=None, description="who replied (defaults to 'PO')")


def _ensure_store() -> None:
    _STORE_DIR.mkdir(parents=True, exist_ok=True)
    if not _STORE_PATH.exists():
        _STORE_PATH.touch()


def _read_all() -> list[FeedbackEntry]:
    """Read every stored record (file order). Malformed lines are skipped."""
    if not _STORE_PATH.exists():
        return []
    rows: list[FeedbackEntry] = []
    with _STORE_PATH.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                rows.append(FeedbackEntry(**json.loads(line)))
            except Exception:
                # skip any malformed line rather than failing the read
                continue
    return rows


def _write_all(records: list[FeedbackEntry]) -> None:
    """Atomically rewrite the whole store (used by the reply action)."""
    _ensure_store()
    tmp = _STORE_PATH.with_suffix(".jsonl.tmp")
    with _STORE_LOCK:
        with tmp.open("w", encoding="utf-8") as f:
            for r in records:
                f.write(json.dumps(r.model_dump(), ensure_ascii=False) + "\n")
        tmp.replace(_STORE_PATH)


def save_feedback(entry: FeedbackIn) -> FeedbackEntry:
    if entry.sentiment is not None and entry.sentiment not in _ALLOWED_SENTIMENTS:
        # Validation is best-effort; we don't want to drop legit feedback.
        # Unknown sentiment is normalized to None rather than 400-ing.
        entry.sentiment = None
    _ensure_store()
    record = FeedbackEntry(
        id=uuid.uuid4().hex[:12],
        sentiment=entry.sentiment,
        message=(entry.message or None),
        page=entry.page,
        client_ts=entry.ts,
        received_at=datetime.now(timezone.utc).isoformat(),
        reply=None,
        reply_at=None,
        reply_by=None,
    )
    with _STORE_LOCK:
        with _STORE_PATH.open("a", encoding="utf-8") as f:
            f.write(json.dumps(record.model_dump(), ensure_ascii=False) + "\n")
    return record


def list_feedback(limit: int = 200) -> list[FeedbackEntry]:
    rows = _read_all()
    rows.reverse()  # newest first
    return rows[:limit]


@router.post("/feedback")
def post_feedback(payload: FeedbackIn):
    record = save_feedback(payload)
    return {"ok": True, "id": record.id}


@router.get("/feedback")
def get_feedback(limit: int = 200):
    items = list_feedback(limit)
    return {"count": len(items), "items": items}


class BoardItem(BaseModel):
    message: str
    received_at: str
    reply: Optional[str] = None
    reply_by: Optional[str] = None
    reply_at: Optional[str] = None


@router.get("/feedback/board")
def get_feedback_board():
    """Public, anonymous feedback wall. Returns every feedback message plus
    any PO reply, with identifying metadata stripped (no id, client_ts, page,
    or sentiment). The submit date (`received_at`) and reply date
    (`reply_at`) ARE kept so the wall can show "建议于 YYYY-MM-DD" / "History
    Explorer · YYYY-MM-DD". Order: newest first by received_at.
    Reachable on the public tunnel (serve.js proxies /api/v1)."""
    rows = _read_all()
    rows.sort(key=lambda r: r.received_at or "", reverse=True)
    items: list[BoardItem] = []
    for r in rows:
        if not r.message:
            continue
        items.append(
            BoardItem(
                message=r.message,
                received_at=r.received_at,
                reply=r.reply,
                reply_by=r.reply_by,
                reply_at=r.reply_at,
            )
        )
    return {"count": len(items), "items": items}


@router.get("/feedback/{feedback_id}")
def get_feedback_by_id(feedback_id: str):
    """Friend-facing: fetch ONE feedback entry by id (their own browser holds
    the id). Returns the entry including any `reply` the PO has written."""
    for r in _read_all():
        if r.id == feedback_id:
            return r
    raise HTTPException(status_code=404, detail="未找到该反馈")


# --- Localhost-only admin surface (NOT proxied by the public tunnel) -------


@admin_router.get("/admin/feedback")
def admin_feedback_page():
    """Inline, dependency-free management page. Reachable only from
    localhost:8002 (serve.js does not proxy /admin), so the public tunnel
    can never open it. Reply actions require FEEDBACK_ADMIN_TOKEN."""
    return Response(content=_ADMIN_PAGE_HTML, media_type="text/html; charset=utf-8")


@admin_router.post("/admin/feedback/{feedback_id}/reply")
def reply_feedback(feedback_id: str, payload: FeedbackReply):
    _ensure_env()
    expected = os.environ.get("FEEDBACK_ADMIN_TOKEN")
    if not expected:
        raise HTTPException(
            status_code=500,
            detail="反馈管理口令未配置（backend/.env 缺少 FEEDBACK_ADMIN_TOKEN）",
        )
    if not payload.token or payload.token != expected:
        raise HTTPException(status_code=403, detail="口令错误")
    text = (payload.message or "").strip()
    if not text:
        raise HTTPException(status_code=422, detail="回复内容不能为空")
    with _STORE_LOCK:
        records = _read_all()
        target = next((r for r in records if r.id == feedback_id), None)
        if target is None:
            raise HTTPException(status_code=404, detail="未找到该反馈")
        target.reply = text
        target.reply_at = datetime.now(timezone.utc).isoformat()
        target.reply_by = (payload.by or "PO").strip() or "PO"
        _write_all(records)
        return target.model_dump()


_ADMIN_PAGE_HTML = """<!doctype html>
<html lang="zh">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>用户反馈管理</title>
<style>
  :root { color-scheme: light dark; }
  body { font-family: -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
         margin: 0; padding: 24px; background: #f5f3ee; color: #1f1b16; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .sub { color: #6b6157; font-size: 13px; margin: 0 0 20px; }
  .token-bar { display: flex; gap: 8px; align-items: center; margin-bottom: 20px; flex-wrap: wrap; }
  .token-bar input { padding: 8px 10px; border: 1px solid #c9bfb2; border-radius: 8px;
                     font-size: 13px; min-width: 280px; }
  .token-bar button { padding: 8px 14px; border: 1px solid #8a6d3b; background: #8a6d3b;
                      color: #fff; border-radius: 8px; cursor: pointer; font-size: 13px; }
  .card { background: #fff; border: 1px solid #e2d9cb; border-radius: 12px;
          padding: 14px 16px; margin-bottom: 12px; }
  .card .meta { font-size: 12px; color: #8a7f72; margin-bottom: 6px; }
  .card .msg { font-size: 14px; line-height: 1.6; white-space: pre-wrap; word-break: break-word; }
  .reply-box { margin-top: 10px; display: flex; gap: 8px; align-items: flex-start; flex-wrap: wrap; }
  .reply-box textarea { flex: 1; min-width: 240px; min-height: 48px; padding: 8px 10px;
                        border: 1px solid #c9bfb2; border-radius: 8px; font-size: 13px;
                        font-family: inherit; resize: vertical; }
  .reply-box button { padding: 8px 16px; border: 1px solid #2f6b3a; background: #2f6b3a;
                      color: #fff; border-radius: 8px; cursor: pointer; font-size: 13px; }
  .reply-done { margin-top: 10px; padding: 10px 12px; background: #eef6ef;
                border: 1px solid #cfe3d2; border-radius: 8px; font-size: 13px; line-height: 1.6; }
  .reply-done .by { color: #2f6b3a; font-size: 12px; }
  .status { font-size: 13px; margin: 8px 0; min-height: 18px; }
  .status.err { color: #b23b2e; }
  .status.ok { color: #2f6b3a; }
  .empty { color: #8a7f72; font-size: 14px; }
</style>
</head>
<body>
  <h1>用户反馈管理</h1>
  <p class="sub">本页仅本机可访问（localhost:8002）。输入 backend/.env 中的 FEEDBACK_ADMIN_TOKEN 后可回复，朋友在其浏览器即可看到。</p>
  <div class="token-bar">
    <input id="token" type="password" placeholder="管理口令 FEEDBACK_ADMIN_TOKEN" />
    <button id="saveToken">记住口令</button>
  </div>
  <div id="status" class="status"></div>
  <div id="list"></div>

<script>
const $ = (id) => document.getElementById(id);
const TOKEN_KEY = "he_feedback_admin_token";

function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function fmt(ts) {
  if (!ts) return "";
  try { return new Date(ts).toLocaleString("zh-CN"); } catch { return ts; }
}
function setStatus(msg, kind) {
  const el = $("status");
  el.textContent = msg || "";
  el.className = "status" + (kind ? " " + kind : "");
}

function render(items) {
  const list = $("list");
  list.innerHTML = "";
  if (!items.length) {
    list.innerHTML = '<p class="empty">暂无反馈。</p>';
    return;
  }
  for (const it of items) {
    const card = document.createElement("div");
    card.className = "card";
    const sentiment = it.sentiment === "up" ? "有用"
                    : it.sentiment === "down" ? "没用" : "未评分";
    const meta = "id: " + it.id + " · " + sentiment + " · 页面: " + (it.page || "-")
               + " · 提交: " + fmt(it.received_at);
    let html = '<div class="meta">' + escapeHtml(meta) + '</div>';
    html += '<div class="msg">' + escapeHtml(it.message || "(无文字)") + '</div>';
    if (it.reply) {
      html += '<div class="reply-done"><div>' + escapeHtml(it.reply) + '</div>'
            + '<div class="by">— ' + escapeHtml(it.reply_by || "PO")
            + ' 回复于 ' + escapeHtml(fmt(it.reply_at)) + '</div></div>';
    } else {
      html += '<div class="reply-box">'
            + '<textarea data-id="' + escapeHtml(it.id) + '" placeholder="写回复…"></textarea>'
            + '<button data-id="' + escapeHtml(it.id) + '">回复</button></div>';
    }
    card.innerHTML = html;
    list.appendChild(card);
  }
  list.querySelectorAll(".reply-box button").forEach((btn) => {
    btn.addEventListener("click", () => sendReply(btn.getAttribute("data-id"), btn));
  });
}

async function sendReply(id, btn) {
  const token = $("token").value.trim();
  if (!token) { setStatus("请先输入管理口令", "err"); return; }
  const ta = btn.parentElement.querySelector("textarea");
  const message = ta.value.trim();
  if (!message) { setStatus("回复内容不能为空", "err"); return; }
  btn.disabled = true;
  try {
    const r = await fetch("/admin/feedback/" + id + "/reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, message, by: "PO" }),
    });
    if (r.ok) {
      setStatus("已回复 " + id, "ok");
      await load();
    } else {
      const err = await r.json().catch(() => ({}));
      setStatus("回复失败: " + (err.detail || r.status), "err");
      btn.disabled = false;
    }
  } catch (e) {
    setStatus("网络错误: " + e.message, "err");
    btn.disabled = false;
  }
}

async function load() {
  try {
    const r = await fetch("/api/v1/feedback");
    if (!r.ok) { setStatus("加载失败: " + r.status, "err"); return; }
    const data = await r.json();
    render(data.items || []);
  } catch (e) {
    setStatus("加载失败: " + e.message, "err");
  }
}

window.addEventListener("DOMContentLoaded", () => {
  const saved = localStorage.getItem(TOKEN_KEY);
  if (saved) $("token").value = saved;
  $("saveToken").addEventListener("click", () => {
    localStorage.setItem(TOKEN_KEY, $("token").value.trim());
    setStatus("已记住口令（仅存于本机浏览器）", "ok");
  });
  load();
});
</script>
</body>
</html>
"""
