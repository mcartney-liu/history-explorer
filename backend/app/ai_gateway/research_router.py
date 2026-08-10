"""Research persistence HTTP routes (ADR-0018, lift of red line C6).

Three routes under ``/api/v1/research``:
  POST   /research        -> persist one research package, returns {"id": ...}
  GET    /research        -> this session's packages, newest first
  DELETE /research/{id}   -> remove one package owned by this session

Session identity comes from the ``X-Session-Id`` request header (the frontend
stores a stable per-browser uuid). It is an OWNERSHIP SCOPE, not an account:
there is no login, no user record, no cross-session read. A missing header
yields a throwaway uuid, so an anonymous POST still succeeds but is simply
unreachable afterwards — never a 4xx that would break the client.

This router is a thin delegate: all storage lives in ``research_store``; no AI
logic, no graph access, no business rules here.
"""

from __future__ import annotations

import uuid
from typing import Any, Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from .research_store import delete_research, list_research, save_research

router = APIRouter(tags=["research"])


def _session(header_value: Optional[str]) -> str:
    """Normalize the X-Session-Id header into a usable scope id."""
    value = (header_value or "").strip()
    return value or uuid.uuid4().hex


class ResearchPayload(BaseModel):
    """Wire contract for a saved research package (snake_case).

    Mirrors ``toRemotePayload`` in the frontend ResearchHistory client. Every
    field is optional with a safe default so a partially-completed research is
    still persistable — losing a half-built cognitive structure would defeat
    the purpose of persisting at all.
    """

    question: str = ""
    context_global_ids: list[str] = Field(default_factory=list)
    visited: list[str] = Field(default_factory=list)
    citations: list[dict] = Field(default_factory=list)
    evidence: list[Any] = Field(default_factory=list)
    confidence: Optional[str] = None
    dimensions: list[dict] = Field(default_factory=list)
    summary: Optional[str] = None
    summary_citations: list[dict] = Field(default_factory=list)
    entity_global_id: str = ""
    entity_name: str = ""


def create_research(
    body: ResearchPayload,
    x_session_id: Optional[str] = Header(default=None, alias="X-Session-Id"),
):
    """Persist one research package for the calling session."""
    record = save_research(_session(x_session_id), body.model_dump())
    return record


def read_research(
    x_session_id: Optional[str] = Header(default=None, alias="X-Session-Id"),
):
    """Return this session's research packages, newest first."""
    return {"items": list_research(_session(x_session_id))}


def remove_research(
    research_id: str,
    x_session_id: Optional[str] = Header(default=None, alias="X-Session-Id"),
):
    """Delete one research package owned by this session."""
    if not delete_research(research_id, _session(x_session_id)):
        raise HTTPException(status_code=404, detail="research not found")
    return {"deleted": research_id}


router.add_api_route(
    "/research", create_research, methods=["POST"], operation_id="v1_research_create"
)
router.add_api_route(
    "/research", read_research, methods=["GET"], operation_id="v1_research_list"
)
router.add_api_route(
    "/research/{research_id}",
    remove_research,
    methods=["DELETE"],
    operation_id="v1_research_delete",
)
