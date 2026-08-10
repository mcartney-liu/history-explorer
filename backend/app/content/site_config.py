"""Site Configuration API (ADR-0021 sibling).

Endpoints (mounted under the v1 prefix by `backend/app/main.py`)::

    GET    /api/v1/site-config            public  — read product switches
    GET    /api/v1/site-config/status     public  — is editing switched on
    GET    /api/v1/site-config/defaults   public  — factory state (per switch)
    PUT    /api/v1/site-config            gated   — replace overrides
    POST   /api/v1/site-config/reset      gated   — back to factory defaults

"Gated" means `ADMIN_ENABLED` must be truthy; otherwise 403. This is an
operator switch, not authentication (see `content_store.admin_enabled`).

Unlike the content layer, this payload is *not* registry-heavy: the four
dimensions are fixed by the backend store, so the read returns the merged
document and the admin console renders controls from the registry flags
(`FEATURE_FLAG_IDS` etc.) it already knows about.
"""

from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from . import site_config_store as store

site_config_router = APIRouter(tags=["site-config"])


# --------------------------------------------------------------------------
# Schemas
# --------------------------------------------------------------------------
class FeatureFlagValue(BaseModel):
    id: str = Field(..., description="Flag id from the registry")
    enabled: bool


class EntitySectionValue(BaseModel):
    id: str = Field(..., description="Section id from the registry")
    visible: bool


class SiteConfigUpdate(BaseModel):
    """Write payload — only editable fields; metadata is owned by the registry."""

    feature_flags: Optional[dict[str, bool]] = Field(
        None, description="Partial map of flag id -> on/off"
    )
    topic_ordering: Optional[list[str]] = Field(
        None, description="Ordered, deduplicated topic slugs (max 12)"
    )
    entity_sections: Optional[list[EntitySectionValue]] = Field(
        None, description="Partial visibility overrides by section id"
    )
    exploration_starters: Optional[list[str]] = Field(
        None, description="Suggested starting points (max 8)"
    )


# --------------------------------------------------------------------------
# Guards
# --------------------------------------------------------------------------
def _require_admin() -> None:
    if not store.admin_enabled():
        raise HTTPException(
            status_code=403,
            detail=(
                "Site configuration editing is disabled. Set ADMIN_ENABLED=true "
                "on the backend to enable it (local / single-machine use only)."
            ),
        )


# --------------------------------------------------------------------------
# Routes
# --------------------------------------------------------------------------
@site_config_router.get("/site-config", response_model=dict[str, Any])
def get_site_config() -> dict[str, Any]:
    """Read product switches. Always available — the landing page depends on it."""
    return store.load_site_config()


@site_config_router.get("/site-config/status")
def get_site_config_status() -> dict[str, Any]:
    """Whether this backend accepts config edits (drives the admin UI banner)."""
    return {
        "admin_enabled": store.admin_enabled(),
        "flag_count": len(store.FEATURE_FLAG_IDS),
        "section_count": len(store.ENTITY_SECTION_IDS),
    }


@site_config_router.get("/site-config/defaults", response_model=dict[str, Any])
def get_site_config_defaults() -> dict[str, Any]:
    """Factory state, per switch. Registry-derived, so it never goes stale."""
    return store.default_document()


@site_config_router.put("/site-config", response_model=dict[str, Any])
def put_site_config(payload: SiteConfigUpdate) -> dict[str, Any]:
    _require_admin()
    try:
        overrides: dict[str, Any] = {}
        if payload.feature_flags is not None:
            overrides["feature_flags"] = payload.feature_flags
        if payload.topic_ordering is not None:
            overrides["topic_ordering"] = payload.topic_ordering
        if payload.entity_sections is not None:
            overrides["entity_sections"] = {
                item.id: item.visible for item in payload.entity_sections
            }
        if payload.exploration_starters is not None:
            overrides["exploration_starters"] = payload.exploration_starters

        return store.save_site_config(overrides)
    except OSError as exc:  # disk full, permissions, ...
        raise HTTPException(status_code=500, detail=f"could not persist config: {exc}") from exc


@site_config_router.post("/site-config/reset", response_model=dict[str, Any])
def reset_site_config() -> dict[str, Any]:
    """Discard every override and return to the shipped defaults."""
    _require_admin()
    try:
        return store.reset_site_config()
    except OSError as exc:
        raise HTTPException(status_code=500, detail=f"could not reset config: {exc}") from exc
