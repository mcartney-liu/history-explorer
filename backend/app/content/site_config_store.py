"""Site Configuration Layer — runtime-tunable product switches.

ADR-0021 sibling, same discipline: stdlib only (no ORM, no database, no new
dependency), file-backed JSON, registry-driven, atomic writes, safe defaults.

While ``content_store`` externalises *display copy* (card titles, artwork),
this module externalises *product switches* — things an operator may want to
flip without a rebuild:

  - ``feature_flags``     on/off toggles for non-AI UI surfaces
  - ``topic_ordering``    which curated topics are "featured" on the landing
                          page, and in what order
  - ``entity_sections``   visibility + order of the panels on the entity page
  - ``exploration_starters`` suggested starting points on the explore entry

Hard boundaries (Article 0 expression layer only)
-------------------------------------------------
  - Feature flags here gate **UI surfaces**, never AI capabilities. Those stay
    under the freeze baseline's ``AI_SUGGESTIONS_ENABLED`` build flag.
  - No knowledge data (entities / relationships / evidence / sources).
  - No database, no ORM, no auth system. Writes gated by ADMIN_ENABLED.
  - No new dependency — json / os / tempfile from the stdlib.

A registry declares what is editable; the API, validation, and admin console
derive from it. Adding a switch is a one-line registry change, not a new
endpoint.
"""

from __future__ import annotations

import json
import os
import tempfile
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .content_store import admin_enabled

# --------------------------------------------------------------------------
# Paths
# --------------------------------------------------------------------------
# backend/app/content/site_config_store.py -> parents[3] == repository root
_REPO_ROOT = Path(__file__).resolve().parents[3]


def config_dir() -> Path:
    """Root directory for site-config data. `CONTENT_DIR` overrides (tests)."""
    override = os.getenv("CONTENT_DIR")
    return Path(override) if override else _REPO_ROOT / "data" / "content"


def config_file() -> Path:
    return config_dir() / "site-config.json"


# --------------------------------------------------------------------------
# The registry
# --------------------------------------------------------------------------
@dataclass(frozen=True)
class FeatureFlag:
    """One on/off product switch (UI surface only — never an AI capability)."""

    id: str
    label: str
    desc: str
    default: bool
    where: str


@dataclass(frozen=True)
class EntitySection:
    """One panel on the entity page, with its factory visibility + order."""

    id: str
    label: str
    desc: str
    default_visible: bool
    where: str


# --- feature flags ---------------------------------------------------------
# Default ON because both surfaces already ship in the product; the switch
# exists so an operator can hide them without a code change.
_FEATURE_FLAGS: tuple[FeatureFlag, ...] = (
    FeatureFlag(
        id="related_entities",
        label="相关实体",
        desc="实体页「研究」标签内，由图谱引擎驱动的真实相关实体列表。纯图，不碰 AI。",
        default=True,
        where="实体页 · 研究标签",
    ),
    FeatureFlag(
        id="journey_trail",
        label="探索足迹",
        desc="基于既有用户行为事件的探索路径可视化（无新采集、无画像）。",
        default=True,
        where="实体页 · 全局",
    ),
)

# --- entity sections -------------------------------------------------------
# Factory visibility mirrors the current main-column panels. Component-level
# wiring of the `visible` flag is scheduled (see ADR notes); the registry and
# runtime land now so the switch is ready to consume.
_ENTITY_SECTIONS: tuple[EntitySection, ...] = (
    EntitySection(
        id="why_important",
        label="了解核心",
        desc="实体身份 + 叙事导览。",
        default_visible=True,
        where="实体页 · 主栏顶部",
    ),
    EntitySection(
        id="relationship_insight",
        label="关系洞察",
        desc="证据绑定的 AI 探索触点（增强层，由 AI_SUGGESTIONS_ENABLED 同层开关控制）。",
        default_visible=True,
        where="实体页 · 主栏",
    ),
    EntitySection(
        id="journey_trail",
        label="探索足迹",
        desc="探索路径可视化，受 feature_flags.journey_trail 联动。",
        default_visible=True,
        where="实体页 · 主栏",
    ),
    EntitySection(
        id="related_entities",
        label="相关实体",
        desc="图谱驱动的相关实体列表，受 feature_flags.related_entities 联动。",
        default_visible=True,
        where="实体页 · 研究标签",
    ),
    EntitySection(
        id="research_library",
        label="研究库",
        desc="已保存研究的回顾列表。",
        default_visible=True,
        where="实体页 · 研究标签",
    ),
)

FEATURE_FLAG_IDS: tuple[str, ...] = tuple(flag.id for flag in _FEATURE_FLAGS)
ENTITY_SECTION_IDS: tuple[str, ...] = tuple(section.id for section in _ENTITY_SECTIONS)

FLAG_BY_ID: dict[str, FeatureFlag] = {flag.id: flag for flag in _FEATURE_FLAGS}
SECTION_BY_ID: dict[str, EntitySection] = {section.id: section for section in _ENTITY_SECTIONS}

SITE_CONFIG_VERSION = 1

# Field limits — guards against absurd payloads, mirrored by the admin console.
SLUG_LIMIT = 64
STARTER_LIMIT = 60
MAX_TOPICS = 12
MAX_STARTERS = 8

# Factory "featured" topics — MUST stay in sync with the frontend's compiled
# FEATURED_SLUGS (App.tsx). Real slugs only, matching the backend topic registry.
DEFAULT_TOPIC_ORDERING: tuple[str, ...] = (
    "roman_empire",
    "greek_philosophy",
    "persian_empire",
    "ancient_india",
)

DEFAULT_STARTERS: tuple[str, ...] = (
    "罗马帝国的兴衰",
    "希腊哲学的源头",
    "波斯帝国的扩张",
    "古印度的文明脉络",
)


class SiteConfigError(Exception):
    """Raised for caller-fixable problems (unknown flag, bad payload)."""


# --------------------------------------------------------------------------
# Document helpers
# --------------------------------------------------------------------------
def default_document() -> dict[str, Any]:
    """Factory state, fully derived from the registry."""
    return {
        "version": SITE_CONFIG_VERSION,
        "updated_at": None,
        "feature_flags": {flag.id: flag.default for flag in _FEATURE_FLAGS},
        "topic_ordering": list(DEFAULT_TOPIC_ORDERING),
        "entity_sections": [
            {"id": section.id, "visible": section.default_visible}
            for section in _ENTITY_SECTIONS
        ],
        "exploration_starters": list(DEFAULT_STARTERS),
    }


def _clean_slug(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    slug = value.strip()
    if not slug or len(slug) > SLUG_LIMIT:
        return None
    return slug


def _clean_starter(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    text = value.strip()
    if not text or len(text) > STARTER_LIMIT:
        return None
    return text


def _read_overrides(stored: Any) -> dict[str, Any]:
    """Extract the editable values from a stored (possibly stale) document."""
    if not isinstance(stored, dict):
        return {}
    overrides: dict[str, Any] = {}

    raw_flags = stored.get("feature_flags")
    if isinstance(raw_flags, dict):
        flags: dict[str, bool] = {}
        for flag_id in FEATURE_FLAG_IDS:
            if flag_id in raw_flags and isinstance(raw_flags[flag_id], bool):
                flags[flag_id] = raw_flags[flag_id]
        overrides["feature_flags"] = flags

    raw_topics = stored.get("topic_ordering")
    if isinstance(raw_topics, list):
        topics = [
            slug
            for slug in (_clean_slug(entry) for entry in raw_topics)
            if slug
        ]
        # dedupe while preserving order
        seen: set[str] = set()
        deduped: list[str] = []
        for slug in topics:
            if slug not in seen:
                seen.add(slug)
                deduped.append(slug)
        overrides["topic_ordering"] = deduped[:MAX_TOPICS]

    raw_sections = stored.get("entity_sections")
    if isinstance(raw_sections, list):
        sections: dict[str, bool] = {}
        for entry in raw_sections:
            if not isinstance(entry, dict):
                continue
            section_id = entry.get("id")
            if section_id in SECTION_BY_ID and isinstance(entry.get("visible"), bool):
                sections[section_id] = entry["visible"]
        overrides["entity_sections"] = sections

    raw_starters = stored.get("exploration_starters")
    if isinstance(raw_starters, list):
        starters = [
            text
            for text in (_clean_starter(entry) for entry in raw_starters)
            if text
        ]
        overrides["exploration_starters"] = starters[:MAX_STARTERS]

    return overrides


def _merge_with_defaults(stored: Any) -> dict[str, Any]:
    """Overlay stored values on the registry defaults (defaults win on blanks).

    Keeps the contract stable even if the file is partial, hand-edited, from an
    older schema version, or references retired switches.
    """
    doc = default_document()
    overrides = _read_overrides(stored)

    if "feature_flags" in overrides:
        doc["feature_flags"].update(overrides["feature_flags"])
    if overrides.get("topic_ordering"):
        doc["topic_ordering"] = overrides["topic_ordering"]
    if "entity_sections" in overrides:
        for section in doc["entity_sections"]:
            if section["id"] in overrides["entity_sections"]:
                section["visible"] = overrides["entity_sections"][section["id"]]
    if overrides.get("exploration_starters"):
        doc["exploration_starters"] = overrides["exploration_starters"]

    if isinstance(stored, dict):
        updated_at = stored.get("updated_at")
        if isinstance(updated_at, str):
            doc["updated_at"] = updated_at
    return doc


def load_site_config() -> dict[str, Any]:
    """Read the config, falling back to factory defaults on any problem.

    Reading must never fail: the landing page's featured topics depend on it.
    A corrupt or missing file degrades to defaults rather than a 500.
    """
    path = config_file()
    if not path.is_file():
        return default_document()
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return default_document()
    return _merge_with_defaults(raw)


def save_site_config(payload: dict[str, Any]) -> dict[str, Any]:
    """Persist overrides atomically and return the merged document.

    Only the editable fields are written; metadata (labels, descriptions) lives
    in the registry, so the file never goes stale when the registry changes.
    """
    document = _merge_with_defaults(payload)

    target = config_file()
    target.parent.mkdir(parents=True, exist_ok=True)
    _atomic_write_json(target, document)
    return document


def reset_site_config() -> dict[str, Any]:
    """Drop all overrides — back to factory state."""
    target = config_file()
    if target.is_file():
        target.unlink()
    return default_document()


def _atomic_write_json(target: Path, payload: dict[str, Any]) -> None:
    """Write via temp file + os.replace so readers never see a half-written doc."""
    fd, tmp_name = tempfile.mkstemp(dir=str(target.parent), suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            json.dump(payload, handle, ensure_ascii=False, indent=2)
            handle.write("\n")
        os.replace(tmp_name, target)
    except BaseException:
        try:
            os.unlink(tmp_name)
        except OSError:
            pass
        raise


__all__ = [
    "FeatureFlag",
    "EntitySection",
    "FEATURE_FLAG_IDS",
    "ENTITY_SECTION_IDS",
    "FLAG_BY_ID",
    "SECTION_BY_ID",
    "SITE_CONFIG_VERSION",
    "DEFAULT_TOPIC_ORDERING",
    "DEFAULT_STARTERS",
    "config_file",
    "config_dir",
    "default_document",
    "load_site_config",
    "save_site_config",
    "reset_site_config",
    "admin_enabled",
    "SiteConfigError",
]
