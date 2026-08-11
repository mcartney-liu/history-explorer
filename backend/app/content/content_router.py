"""Content Configuration API (ADR-0021).

Endpoints (mounted under the v1 prefix by `backend/app/main.py`)::

    GET    /api/v1/content                 public  — read display content
    GET    /api/v1/content/status          public  — is editing switched on
    PUT    /api/v1/content                 gated   — replace slot overrides
    POST   /api/v1/content/media           gated   — upload artwork (base64)
    GET    /api/v1/content/media/{name}    public  — serve stored artwork
    POST   /api/v1/content/reset           gated   — back to factory defaults

"Gated" means `ADMIN_ENABLED` must be truthy; otherwise 403. This is an
operator switch, not authentication — see `content_store.admin_enabled`.

`GET /content` returns registry metadata (module, label, capabilities) inline
with the values, so the admin console renders itself from the payload. Adding
an editable surface therefore needs no change here: declare the slot in
`content_store.CONTENT_SLOTS` and it appears in the API and the console.
"""

from __future__ import annotations

import mimetypes
from typing import Any, Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from . import content_store as store

router = APIRouter(tags=["content"])


# --------------------------------------------------------------------------
# Schemas
# --------------------------------------------------------------------------
class ContentCard(BaseModel):
    """A slot's editable values plus the registry metadata describing it."""

    id: str = Field(..., description="Slot id, '<module>.<slot>'")
    module: str
    module_label: str
    label: str
    where: str = ""
    theme: Optional[str] = None
    supports_image: bool = False
    supports_items: bool = False
    supports_text_i18n: bool = False
    items_label: str = "要点"
    title: str
    desc: str
    image: Optional[str] = Field(
        None, description="Stored media filename, or null to use the built-in artwork"
    )
    items: list[str] = Field(default_factory=list)
    title_i18n: Optional[dict[str, str]] = Field(
        None, description="Trilingual title override (zh/en/ja); null = use data source"
    )
    summary_i18n: Optional[dict[str, str]] = Field(
        None, description="Trilingual summary override (zh/en/ja); null = use data source"
    )


class ContentModule(BaseModel):
    module: str
    label: str
    card_ids: list[str]


class ContentDocument(BaseModel):
    version: int
    updated_at: Optional[str]
    modules: list[ContentModule] = Field(default_factory=list)
    cards: list[ContentCard]


class CardUpdate(BaseModel):
    """Write payload — metadata is ignored, the registry owns it."""

    id: str
    title: Optional[str] = Field(None, max_length=store.TITLE_LIMIT)
    desc: Optional[str] = Field(None, max_length=store.DESC_LIMIT)
    image: Optional[str] = Field(None, max_length=255)
    items: Optional[list[str]] = None
    title_i18n: Optional[dict[str, str]] = None
    summary_i18n: Optional[dict[str, str]] = None


class ContentUpdate(BaseModel):
    cards: list[CardUpdate]


class MediaUpload(BaseModel):
    filename: str = Field(
        ...,
        max_length=255,
        description="Original name — used ONLY to determine the extension",
    )
    data: str = Field(
        ...,
        description="Base64 payload; a `data:` URL prefix is accepted and stripped",
    )


class MediaUploadResult(BaseModel):
    filename: str
    size_bytes: int
    url: str


# --------------------------------------------------------------------------
# Guards
# --------------------------------------------------------------------------
def _require_admin() -> None:
    if not store.admin_enabled():
        raise HTTPException(
            status_code=403,
            detail=(
                "Content editing is disabled. Set ADMIN_ENABLED=true on the "
                "backend to enable it (local / single-machine use only)."
            ),
        )


# --------------------------------------------------------------------------
# Routes
# --------------------------------------------------------------------------
@router.get("/content", response_model=ContentDocument)
def get_content() -> dict[str, Any]:
    """Read display content. Always available — the landing page depends on it."""
    return store.load_content()


@router.get("/content/status")
def get_content_status() -> dict[str, Any]:
    """Whether this backend accepts content edits (drives the admin UI banner)."""
    return {
        "admin_enabled": store.admin_enabled(),
        "slot_count": len(store.CONTENT_SLOTS),
        "module_count": len(store.modules()),
    }


@router.get("/content/defaults", response_model=ContentDocument)
def get_content_defaults() -> dict[str, Any]:
    """Factory state, per slot.

    `GET /content` returns values already merged with the defaults, so a client
    cannot tell "this equals the default" from "this was never edited". The
    console needs that distinction to offer a per-card *restore* — hence this
    read-only companion. Registry-derived, so it never goes stale.
    """
    return store.default_document()


@router.put("/content", response_model=ContentDocument)
def put_content(payload: ContentUpdate) -> dict[str, Any]:
    _require_admin()
    try:
        return store.save_content([card.model_dump() for card in payload.cards])
    except store.ContentError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except OSError as exc:  # disk full, permissions, ...
        raise HTTPException(status_code=500, detail=f"could not persist content: {exc}") from exc


@router.post("/content/reset", response_model=ContentDocument)
def reset_content() -> dict[str, Any]:
    """Discard every override and return to the shipped defaults."""
    _require_admin()
    try:
        return store.reset_content()
    except OSError as exc:
        raise HTTPException(status_code=500, detail=f"could not reset content: {exc}") from exc


@router.post("/content/media", response_model=MediaUploadResult)
def upload_media(payload: MediaUpload) -> dict[str, Any]:
    _require_admin()
    try:
        stored = store.save_media(payload.data, payload.filename)
    except store.ContentError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except OSError as exc:
        raise HTTPException(status_code=500, detail=f"could not store image: {exc}") from exc
    return {
        "filename": stored.filename,
        "size_bytes": stored.size_bytes,
        "url": f"/content/media/{stored.filename}",
    }


@router.get("/content/media/{filename}")
def get_media(filename: str) -> FileResponse:
    """Serve stored artwork. Public: the landing page renders these."""
    path = store.resolve_media(filename)
    if path is None:
        raise HTTPException(status_code=404, detail="image not found")
    media_type, _ = mimetypes.guess_type(path.name)
    return FileResponse(
        path,
        media_type=media_type or "application/octet-stream",
        headers={"Cache-Control": "public, max-age=31536000, immutable"},
    )
