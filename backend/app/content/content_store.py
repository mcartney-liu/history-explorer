"""Content store — JSON-file persistence for the Content Configuration Layer.

ADR-0021. Stdlib only: no ORM, no database, no new dependency.

Layout on disk::

    data/content/
      site-content.json      # the editable content document
      uploads/               # server-named image files

Both are git-ignored: content is *runtime* data, deliberately decoupled from
the branch you happen to have checked out.

Architecture (ADR-0021 R2, "global card registry")
--------------------------------------------------
Editable surfaces are declared **once** in ``CONTENT_SLOTS`` below. Everything
else — the API contract, validation, the admin console's layout, the
"restore default" affordance — is derived from that registry. Adding a newly
editable card anywhere in the product is therefore a *one-line* change here
plus the matching line in ``frontend/src/data/contentSlots.ts``; no endpoint,
no admin-UI code, and no test needs to be touched.

A slot is addressed as ``<module>.<slot>`` so ids stay globally unique as the
registry grows across modules.
"""

from __future__ import annotations

import base64
import binascii
import hashlib
import json
import os
import tempfile
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

# --------------------------------------------------------------------------
# Paths
# --------------------------------------------------------------------------
# backend/app/content/content_store.py -> parents[3] == repository root
_REPO_ROOT = Path(__file__).resolve().parents[3]


def content_dir() -> Path:
    """Root directory for content data. `CONTENT_DIR` overrides (tests)."""
    override = os.getenv("CONTENT_DIR")
    return Path(override) if override else _REPO_ROOT / "data" / "content"


def content_file() -> Path:
    return content_dir() / "site-content.json"


def uploads_dir() -> Path:
    return content_dir() / "uploads"


# --------------------------------------------------------------------------
# The registry
# --------------------------------------------------------------------------
@dataclass(frozen=True)
class ContentSlot:
    """One editable surface.

    ``title`` / ``desc`` / ``items`` hold the *shipped* copy — the values the
    product renders with no backend at all (fallback tier ②, ADR-0021 D5).
    They are not placeholders, so the registry doubles as the single source of
    truth for "what does factory state look like".
    """

    id: str
    module: str
    module_label: str
    label: str
    title: str
    desc: str
    supports_image: bool = False
    supports_items: bool = False
    #: Exploration packs / topics carry trilingual title+summary in their data
    #: source; the override layer stores only what the operator edits (ADR
    #: extension for the gallery console). Front-end falls back to the source
    #: when the override is absent.
    supports_text_i18n: bool = False
    #: Featured topics carry a short list of guided questions the operator
    #: wants surfaced as exploration starters (admin-configurable, ADR-0021).
    supports_guided_questions: bool = False
    theme: str | None = None
    items: tuple[str, ...] = ()
    items_label: str = "要点"
    #: Where this copy shows up — rendered as a hint in the admin console so an
    #: editor knows what they are about to change without hunting for it.
    where: str = ""

    def defaults(self) -> dict[str, Any]:
        """Factory values for the editable fields only."""
        payload: dict[str, Any] = {"title": self.title, "desc": self.desc}
        if self.supports_image:
            payload["image"] = None
        if self.supports_items:
            payload["items"] = list(self.items)
        if self.supports_text_i18n:
            payload["title_i18n"] = None
            payload["summary_i18n"] = None
        if self.supports_guided_questions:
            payload["guided_questions"] = []
        return payload

    def to_card(self) -> dict[str, Any]:
        """Full card record: metadata + factory values."""
        return {
            "id": self.id,
            "module": self.module,
            "module_label": self.module_label,
            "label": self.label,
            "where": self.where,
            "theme": self.theme,
            "supports_image": self.supports_image,
            "supports_items": self.supports_items,
            "supports_text_i18n": self.supports_text_i18n,
            "supports_guided_questions": self.supports_guided_questions,
            "items_label": self.items_label,
            "image": None,
            "items": list(self.items),
            "title": self.title,
            "desc": self.desc,
            **({"title_i18n": None, "summary_i18n": None} if self.supports_text_i18n else {}),
            **({"guided_questions": []} if self.supports_guided_questions else {}),
        }


_LANDING = "首页 · 能力卡"
_TABS = "实体页 · 标签引导"
_FLOW = "实体页 · 探索路径"
_AI = "AI 历史学家 · 能力说明"
_PACKS = "探索 · 探索包"
_TOPICS = "首页 · 精选主题"
_RESEARCH = "研究 · 维度配图"
_SITE = "站点 · 品牌"


#: Research-dimension artwork slots, derived from the front-end's
#: RESEARCH_TEMPLATES (see frontend/src/components/ResearchPanel.tsx). The
#: per-dimension key is the only stable identifier — artwork is shared across
#: every entity that uses that dimension — so one slot per key, no entity
#: prefix. Mirrors the explore_packs pattern: compiled default first, no
#: external data file to keep in sync. Must stay aligned with RESEARCH_TEMPLATES.
_DEFAULT_RESEARCH_DIM_KEYS: tuple[str, ...] = (
    # Civilization
    "politics", "military", "economy", "culture",
    # Event
    "background", "process", "impact", "significance",
    # Person
    "life", "contribution", "influence", "evaluation",
    # Religion
    "origin", "doctrine", "spread", "civilization",
    # Technology
    "invention", "principle", "application", "tech-impact",
    # Location
    "geography", "strategy", "events", "connection",
    # Idea
    "idea-origin", "meaning", "idea-spread", "modern",
)


CONTENT_SLOTS: tuple[ContentSlot, ...] = (
    # -- 首页能力卡 --------------------------------------------------------
    ContentSlot(
        id="landing.story",
        module="landing",
        module_label=_LANDING,
        label="能力卡 1 · 历史叙事",
        where="首页「我们能带你做什么」第 1 张",
        theme="parchment",
        supports_image=True,
        title="历史叙事",
        desc=(
            "把人、事件、文明串成你能读懂的故事线，看清一件事为何发生、"
            "如何走到今天。叙事由真实史料手写，不靠 AI 编造。"
        ),
    ),
    ContentSlot(
        id="landing.explore",
        module="landing",
        module_label=_LANDING,
        label="能力卡 2 · 关系探索",
        where="首页「我们能带你做什么」第 2 张",
        theme="network",
        supports_image=True,
        title="关系探索",
        desc=(
            "看清人物、文明之间如何相连——谁影响了谁、什么导致了什么。"
            "每一层关系都附上证据，让你理解而非盲信。"
        ),
    ),
    ContentSlot(
        id="landing.research",
        module="landing",
        module_label=_LANDING,
        label="能力卡 3 · 深度研究",
        where="首页「我们能带你做什么」第 3 张",
        theme="ledger",
        supports_image=True,
        title="深度研究",
        desc=(
            "从政治、军事、经济、文化多个角度，把一个疑问拆透；"
            "还能把几个对象放一起比，帮你形成自己的判断。"
        ),
    ),
    ContentSlot(
        id="landing.chat",
        module="landing",
        module_label=_LANDING,
        label="能力卡 4 · AI 历史学家",
        where="首页「我们能带你做什么」第 4 张",
        theme="cosmos",
        supports_image=True,
        title="AI 历史学家",
        desc=(
            "像身边随时有位历史学者：你用大白话说疑问，它用史料与知识图谱作答，"
            "并讲清依据在哪、可信度有几分。"
        ),
    ),
    # -- 实体页标签引导 ----------------------------------------------------
    ContentSlot(
        id="entity_tabs.info",
        module="entity_tabs",
        module_label=_TABS,
        label="信息标签",
        where="实体页切到「信息」时顶部的引导条",
        supports_items=True,
        items_label="推荐动作",
        title="了解基本事实",
        desc="查看实体的基本信息、关系网络、时间线和知识图谱。",
        items=("浏览关系图", "查看时间线", "阅读叙事先导"),
    ),
    ContentSlot(
        id="entity_tabs.explore",
        module="entity_tabs",
        module_label=_TABS,
        label="探索标签",
        where="实体页切到「探索」时顶部的引导条",
        supports_items=True,
        items_label="推荐动作",
        title="探索历史关系",
        desc=(
            "通过人物、事件、文明之间的关联继续发现新的历史路径。"
            "你也可以向 AI 历史学家提问——每个回答都有事实溯源。"
        ),
        items=("查看系统推荐", "开启历史旅程", "与 AI 历史学家对话"),
    ),
    ContentSlot(
        id="entity_tabs.research",
        module="entity_tabs",
        module_label=_TABS,
        label="研究标签",
        where="实体页切到「研究」时顶部的引导条",
        supports_items=True,
        items_label="推荐动作",
        title="深入研究",
        desc="生成结构化研究内容，支持多维度分析和多实体对比，结果可保存回顾。",
        items=("启动 4 维度分析", "添加比较对象", "保存研究结果"),
    ),
    ContentSlot(
        id="entity_tabs.analyze",
        module="entity_tabs",
        module_label=_TABS,
        label="分析标签",
        where="实体页切到「分析」时顶部的引导条",
        supports_items=True,
        items_label="推荐动作",
        title="理解原因与影响",
        desc="使用事件因果链、AI 解释和叙事卡片深入理解历史事件的前因后果。",
        items=("查看因果链", "使用 AI 解释", "阅读事件叙事"),
    ),
    ContentSlot(
        id="entity_tabs.extensions",
        module="entity_tabs",
        module_label=_TABS,
        label="扩展标签",
        where="实体页切到「扩展」时顶部的引导条",
        supports_items=True,
        items_label="推荐动作",
        title="扩展功能",
        desc="更多功能即将推出。包括 AI 内容创作、教育模块和社交探索。",
        items=("敬请期待",),
    ),
    ContentSlot(
        id="entity_tabs.nav_labels",
        module="entity_tabs",
        module_label=_TABS,
        label="板块标签名（顶栏切换）",
        where="实体页顶栏的板块切换标签，按「信息 / 研究 / 扩展」顺序填写",
        supports_items=True,
        items_label="标签名",
        title="板块标签名",
        desc="实体页顶栏切换标签的显示文字，按当前顺序填写。",
        items=("信息", "研究", "扩展"),
    ),
    # -- 探索路径四步 ------------------------------------------------------
    ContentSlot(
        id="exploration_flow.relationship",
        module="exploration_flow",
        module_label=_FLOW,
        label="第 1 步 · Relationship",
        where="实体页「探索路径」条目 1",
        title="Relationship",
        desc="从关系网络找到与当前实体相连的人物、事件与观念。",
    ),
    ContentSlot(
        id="exploration_flow.evidence",
        module="exploration_flow",
        module_label=_FLOW,
        label="第 2 步 · Evidence",
        where="实体页「探索路径」条目 2",
        title="Evidence",
        desc="点开任意关系的“查看依据”，看到支撑该关联的事实溯源记录。",
    ),
    ContentSlot(
        id="exploration_flow.source",
        module="exploration_flow",
        module_label=_FLOW,
        label="第 3 步 · Source",
        where="实体页「探索路径」条目 3",
        title="Source",
        desc="每条溯源都指向其策展来源（Source）与引用（Reference）。",
    ),
    ContentSlot(
        id="exploration_flow.historical_context",
        module="exploration_flow",
        module_label=_FLOW,
        label="第 4 步 · Historical Context",
        where="实体页「探索路径」条目 4",
        title="Historical Context",
        desc="用已溯源的全局 ID 调用 AI 解读，获得有依据的历史语境。",
    ),
    # -- AI 能力说明 -------------------------------------------------------
    ContentSlot(
        id="ai_capabilities.explain_entity",
        module="ai_capabilities",
        module_label=_AI,
        label="解释实体",
        where="AI 面板 · 实体选中时的能力条目与示例问题",
        supports_items=True,
        items_label="示例问题",
        title="解释实体",
        desc="解释这个历史实体的重要性和历史意义",
        items=("谁是这个人物？", "这个文明为什么重要？", "这个事件的历史背景是什么？"),
    ),
    ContentSlot(
        id="ai_capabilities.explain_relation",
        module="ai_capabilities",
        module_label=_AI,
        label="解释关系",
        where="AI 面板 · 关系选中时的能力条目与示例问题",
        supports_items=True,
        items_label="示例问题",
        title="解释关系",
        desc="解释两个历史实体之间关系的历史意义",
        items=("为什么 {entityA} 和 {entityB} 有这样的关系？", "这段关系如何影响了历史进程？"),
    ),
    ContentSlot(
        id="ai_capabilities.explain_timeline",
        module="ai_capabilities",
        module_label=_AI,
        label="解释时间线",
        where="AI 面板 · 时间线视图的能力条目与示例问题",
        supports_items=True,
        items_label="示例问题",
        title="解释时间线",
        desc="解释时间线中关键事件的背景和影响",
        items=("{entity} 的时间线中最关键的事件是什么？", "这段时间内发生了什么转折？"),
    ),
    ContentSlot(
        id="ai_capabilities.compare_entities",
        module="ai_capabilities",
        module_label=_AI,
        label="对比实体",
        where="AI 面板 · 图谱 / 工作台的能力条目与示例问题",
        supports_items=True,
        items_label="示例问题",
        title="对比实体",
        desc="对比两个或多个历史实体，分析异同",
        items=("对比 {entityA} 和 {entityB}", "两者在历史上的影响有何不同？"),
    ),
    ContentSlot(
        id="ai_capabilities.research_topic",
        module="ai_capabilities",
        module_label=_AI,
        label="研究主题",
        where="AI 面板 · 研究模式的能力条目与示例问题",
        supports_items=True,
        items_label="示例问题",
        title="研究主题",
        desc="围绕当前主题生成深度研究问题和方向",
        items=("关于 {entity} 有哪些值得深入研究的方面？", "有什么学术争议需要了解？"),
    ),
    ContentSlot(
        id="ai_capabilities.suggest_exploration",
        module="ai_capabilities",
        module_label=_AI,
        label="推荐探索",
        where="AI 面板 · 实体 / 工作台的能力条目与示例问题",
        supports_items=True,
        items_label="示例问题",
        title="推荐探索",
        desc="推荐下一个值得探索的历史实体或路径",
        items=("探索完 {entity} 后，下一步应该看什么？", "和 {entity} 相关的还有什么？"),
    ),
    ContentSlot(
        id="ai_capabilities.generate_story",
        module="ai_capabilities",
        module_label=_AI,
        label="生成故事",
        where="AI 面板 · 工作台的能力条目与示例问题",
        supports_items=True,
        items_label="示例问题",
        title="生成故事",
        desc="以叙事方式生成一个历史故事",
        items=("讲一个关于 {entity} 的历史故事", "{entity} 最精彩的时刻是什么？"),
    ),
    ContentSlot(
        id="ai_capabilities.summarize_research",
        module="ai_capabilities",
        module_label=_AI,
        label="总结研究",
        where="AI 面板 · 工作台的能力条目与示例问题",
        supports_items=True,
        items_label="示例问题",
        title="总结研究",
        desc="总结当前探索成果，形成研究笔记",
        items=("总结我对 {entity} 的探索收获", "我在这段探索中了解了什么？"),
    ),
    # -- 站点品牌（置于末尾：默认测试依赖 landing.story 为首个槽）--------
    ContentSlot(
        id="site.brand",
        module="site",
        module_label=_SITE,
        label="站点品牌名 + 副标题",
        where="全局顶栏左侧品牌（副标题显示在品牌名下方）",
        title="History Explorer",
        desc="在史料与关系之间，重建你自己的历史认知。",
    ),
)

# --------------------------------------------------------------------------
# Dynamic modules — explore_packs & explore_topics
# --------------------------------------------------------------------------
# These two modules have a variable number of slots that track *other* data
# in the product (the curated exploration packages and the featured landing
# topics). Their slot set is derived at import time by reading those data
# sources directly from disk — NOT by importing the modules that own them.
#
# Why file-read instead of import: `site_config_store` already imports this
# module (`from .content_store import admin_enabled`). Having `content_store`
# import `site_config_store` back would create a circular import and crash
# the backend on startup. Reading the site-config JSON file (the persisted
# `topic_ordering`) is a pure data read with no import edge, so it is safe.
# (ADR-0021 R-topic — keep the dependency edge one-directional.)
_DEFAULT_TOPIC_SLUGS: tuple[str, ...] = (
    "roman_empire",
    "greek_philosophy",
    "persian_empire",
    "ancient_india",
)


def _pack_slugs() -> list[str]:
    """Exploration-package slugs from ``data/exploration_packages.json``."""
    path = _REPO_ROOT / "data" / "exploration_packages.json"
    if not path.is_file():
        return []
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return []
    if not isinstance(raw, dict):
        return []
    packages = raw.get("packages")
    if not isinstance(packages, list):
        return []
    slugs = [p.get("slug") for p in packages if isinstance(p, dict)]
    return [s for s in slugs if isinstance(s, str) and s]


def _topic_slugs() -> list[str]:
    """Featured topic slugs.

    Prefers the persisted ``topic_ordering`` in site-config.json (so the
    image-config slots track whatever the operator featured); falls back to
    the compiled default when that file is absent or unreadable. Must stay in
    sync with ``site_config_store.DEFAULT_TOPIC_ORDERING``.
    """
    path = _REPO_ROOT / "data" / "content" / "site-config.json"
    if path.is_file():
        try:
            raw = json.loads(path.read_text(encoding="utf-8"))
            if isinstance(raw, dict) and isinstance(raw.get("topic_ordering"), list):
                slugs = [s for s in raw["topic_ordering"] if isinstance(s, str) and s]
                if slugs:
                    return slugs[:12]
        except (OSError, json.JSONDecodeError):
            pass
    return list(_DEFAULT_TOPIC_SLUGS)


def _dynamic_slots() -> list[ContentSlot]:
    """Slots for explore_packs + explore_topics + research_dims."""
    slots: list[ContentSlot] = []
    for slug in _pack_slugs():
        slots.append(
            ContentSlot(
                id=f"explore_packs.{slug}",
                module="explore_packs",
                module_label=_PACKS,
                label=f"探索包 · {slug}",
            where=f"探索页「官方探索包」卡片封面（{slug}）",
            supports_image=True,
            supports_text_i18n=True,
            title=slug,
            desc="",
        )
        )
    for slug in _topic_slugs():
        slots.append(
            ContentSlot(
                id=f"explore_topics.{slug}",
                module="explore_topics",
                module_label=_TOPICS,
                label=f"主题 · {slug}",
                where=f"首页精选主题卡片封面（{slug}）",
            supports_image=True,
            supports_text_i18n=True,
            supports_guided_questions=True,
            title=slug,
            desc="",
        )
        )
    for key in _DEFAULT_RESEARCH_DIM_KEYS:
        slots.append(
            ContentSlot(
                id=f"research_dims.{key}",
                module="research_dims",
                module_label=_RESEARCH,
                label=f"维度 · {key}",
                where=f"实体研究维度卡片封面（{key}）",
                supports_image=True,
                title=key,
                desc="",
            )
        )
    return slots


#: Static registry + data-derived dynamic slots, merged once at import.
_ALL_SLOTS: tuple[ContentSlot, ...] = tuple(list(CONTENT_SLOTS) + _dynamic_slots())
_SLOT_BY_ID: dict[str, ContentSlot] = {slot.id: slot for slot in _ALL_SLOTS}
ALLOWED_CARD_IDS: tuple[str, ...] = tuple(_SLOT_BY_ID)

#: v1 addressed the four landing cards by bare id. Documents written then are
#: migrated on read so an existing install keeps its edits (ADR-0021 D3).
_LEGACY_IDS = {
    "story": "landing.story",
    "explore": "landing.explore",
    "research": "landing.research",
    "chat": "landing.chat",
}

CONTENT_VERSION = 2

#: Field limits, mirrored by the admin console for a faster error message.
TITLE_LIMIT = 80
DESC_LIMIT = 600
ITEM_LIMIT = 120
MAX_ITEMS = 12


def modules() -> list[dict[str, Any]]:
    """Registry grouped by module — drives the admin console's sections."""
    grouped: dict[str, dict[str, Any]] = {}
    for slot in _ALL_SLOTS:
        bucket = grouped.setdefault(
            slot.module,
            {"module": slot.module, "label": slot.module_label, "card_ids": []},
        )
        bucket["card_ids"].append(slot.id)
    return list(grouped.values())


# --------------------------------------------------------------------------
# Media constraints
# --------------------------------------------------------------------------
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_IMAGE_BYTES = 4 * 1024 * 1024  # 4 MB decoded

#: Magic-number prefixes, so a caller cannot smuggle arbitrary bytes in with a
#: friendly extension. WEBP is checked as "RIFF....WEBP" (see _sniff_format).
_MAGIC = {
    "jpeg": (b"\xff\xd8\xff",),
    "png": (b"\x89PNG\r\n\x1a\n",),
}

_EXT_ALIASES = {".jpg": "jpeg", ".jpeg": "jpeg", ".png": "png", ".webp": "webp"}


class ContentError(Exception):
    """Raised for caller-fixable problems (bad payload, oversized image)."""


@dataclass(frozen=True)
class StoredMedia:
    filename: str
    size_bytes: int


@dataclass
class _Override:
    title: str | None = None
    desc: str | None = None
    image: str | None = None
    items: list[str] | None = field(default=None)
    title_i18n: dict[str, str] | None = None
    summary_i18n: dict[str, str] | None = None
    guided_questions: list[str] | None = None


# --------------------------------------------------------------------------
# Document helpers
# --------------------------------------------------------------------------
def default_document() -> dict[str, Any]:
    return {
        "version": CONTENT_VERSION,
        "updated_at": None,
        "modules": modules(),
        "cards": [slot.to_card() for slot in _ALL_SLOTS],
    }


def _canonical_id(raw: Any) -> str | None:
    if not isinstance(raw, str):
        return None
    candidate = _LEGACY_IDS.get(raw, raw)
    return candidate if candidate in _SLOT_BY_ID else None


def _clean_text(value: Any, limit: int) -> str | None:
    if not isinstance(value, str):
        return None
    text = value.strip()
    return text[:limit] if text else None


def _clean_items(value: Any) -> list[str] | None:
    if not isinstance(value, list):
        return None
    cleaned = [
        entry.strip()[:ITEM_LIMIT]
        for entry in value
        if isinstance(entry, str) and entry.strip()
    ]
    return cleaned[:MAX_ITEMS]


def _clean_i18n(value: Any, limit: int) -> dict[str, str] | None:
    """Accept {lang: text} for zh/en/ja; drop blank or non-string entries.

    Returns ``None`` when nothing usable remains so an empty override is not
    persisted (keeps the stored document minimal, ADR-0021 OQ-2).
    """
    if not isinstance(value, dict):
        return None
    cleaned: dict[str, str] = {}
    for lang in ("zh", "en", "ja"):
        text = value.get(lang)
        if isinstance(text, str):
            text = text.strip()
            if text:
                cleaned[lang] = text[:limit]
    return cleaned or None


def _read_overrides(stored: Any) -> dict[str, _Override]:
    """Extract the per-slot overrides from a stored (possibly stale) document."""
    if not isinstance(stored, dict):
        return {}
    overrides: dict[str, _Override] = {}
    for entry in stored.get("cards", []):
        if not isinstance(entry, dict):
            continue
        slot_id = _canonical_id(entry.get("id"))
        if slot_id is None:
            continue  # unknown / retired slot — silently dropped
        slot = _SLOT_BY_ID[slot_id]
        override = _Override(
            title=_clean_text(entry.get("title"), TITLE_LIMIT),
            desc=_clean_text(entry.get("desc"), DESC_LIMIT),
        )
        if slot.supports_image:
            override.image = _clean_text(entry.get("image"), 255)
        if slot.supports_items:
            override.items = _clean_items(entry.get("items"))
        if slot.supports_text_i18n:
            override.title_i18n = _clean_i18n(entry.get("title_i18n"), TITLE_LIMIT)
            override.summary_i18n = _clean_i18n(entry.get("summary_i18n"), DESC_LIMIT)
        if slot.supports_guided_questions:
            override.guided_questions = _clean_items(entry.get("guided_questions"))
        overrides[slot_id] = override
    return overrides


def _merge_with_defaults(stored: Any) -> dict[str, Any]:
    """Overlay a stored document on the registry defaults.

    Defaults win for anything missing or blank, which keeps the API's contract
    stable even if the file on disk is partial, hand-edited, from an older
    schema version, or references slots that no longer exist.
    """
    doc = default_document()
    overrides = _read_overrides(stored)

    for card in doc["cards"]:
        override = overrides.get(card["id"])
        if override is None:
            continue
        if override.title:
            card["title"] = override.title
        if override.desc:
            card["desc"] = override.desc
        if override.image:
            card["image"] = override.image
        if override.items is not None:
            card["items"] = override.items
        if override.title_i18n:
            card["title_i18n"] = override.title_i18n
        if override.summary_i18n:
            card["summary_i18n"] = override.summary_i18n
        if override.guided_questions is not None:
            card["guided_questions"] = override.guided_questions

    if isinstance(stored, dict):
        updated_at = stored.get("updated_at")
        if isinstance(updated_at, str):
            doc["updated_at"] = updated_at
    return doc


def load_content() -> dict[str, Any]:
    """Read the content document, falling back to defaults on any problem.

    Reading content must never fail: the landing page depends on it. A corrupt
    or missing file degrades to the shipped defaults rather than a 500.
    """
    path = content_file()
    if not path.is_file():
        return default_document()
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return default_document()
    return _merge_with_defaults(raw)


def save_content(cards: list[dict[str, Any]]) -> dict[str, Any]:
    """Persist slot overrides atomically and return the merged document.

    Only the *editable* fields are written — metadata (module, label, theme…)
    lives in the registry, so the file on disk never goes stale when the
    registry changes.
    """
    cleaned: list[dict[str, Any]] = []
    for card in cards:
        raw_id = card.get("id")
        slot_id = _canonical_id(raw_id)
        if slot_id is None:
            raise ContentError(f"unknown card id: {raw_id!r}")
        slot = _SLOT_BY_ID[slot_id]

        entry: dict[str, Any] = {"id": slot_id}
        title = _clean_text(card.get("title"), TITLE_LIMIT)
        if title:
            entry["title"] = title
        desc = _clean_text(card.get("desc"), DESC_LIMIT)
        if desc:
            entry["desc"] = desc
        if slot.supports_image:
            entry["image"] = _clean_text(card.get("image"), 255)
        if slot.supports_items:
            items = _clean_items(card.get("items"))
            if items is not None:
                entry["items"] = items
        if slot.supports_text_i18n:
            title_i18n = _clean_i18n(card.get("title_i18n"), TITLE_LIMIT)
            if title_i18n:
                entry["title_i18n"] = title_i18n
            summary_i18n = _clean_i18n(card.get("summary_i18n"), DESC_LIMIT)
            if summary_i18n:
                entry["summary_i18n"] = summary_i18n
        if slot.supports_guided_questions:
            guided = _clean_items(card.get("guided_questions"))
            if guided is not None:
                entry["guided_questions"] = guided
        cleaned.append(entry)

    document = {
        "version": CONTENT_VERSION,
        "updated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "cards": cleaned,
    }

    target = content_file()
    target.parent.mkdir(parents=True, exist_ok=True)
    _atomic_write_json(target, document)
    return _merge_with_defaults(document)


def reset_content() -> dict[str, Any]:
    """Drop all overrides — back to factory state (ADR-0021 OQ-2)."""
    target = content_file()
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


# --------------------------------------------------------------------------
# Media
# --------------------------------------------------------------------------
def _sniff_format(data: bytes) -> str | None:
    for fmt, prefixes in _MAGIC.items():
        if any(data.startswith(prefix) for prefix in prefixes):
            return fmt
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "webp"
    return None


def save_media(data_url_or_b64: str, filename_hint: str) -> StoredMedia:
    """Decode a base64 image payload and store it under a server-chosen name.

    Multipart upload would pull in `python-multipart`, a new dependency the
    freeze baseline forbids — hence base64 over plain JSON (ADR-0021 D4).

    The client-supplied name is used *only* to pick an extension; the stored
    filename is content-addressed, so path traversal and collisions are both
    structurally impossible.
    """
    payload = data_url_or_b64.strip()
    if payload.startswith("data:"):
        _, _, payload = payload.partition(",")
    if not payload:
        raise ContentError("empty image payload")

    try:
        blob = base64.b64decode(payload, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise ContentError("payload is not valid base64") from exc

    if not blob:
        raise ContentError("empty image payload")
    if len(blob) > MAX_IMAGE_BYTES:
        raise ContentError(
            f"image exceeds {MAX_IMAGE_BYTES // (1024 * 1024)} MB limit"
        )

    extension = Path(filename_hint or "").suffix.lower()
    if extension not in ALLOWED_IMAGE_EXTENSIONS:
        raise ContentError(
            "unsupported file type; allowed: "
            + ", ".join(sorted(ALLOWED_IMAGE_EXTENSIONS))
        )

    sniffed = _sniff_format(blob)
    if sniffed is None or sniffed != _EXT_ALIASES[extension]:
        raise ContentError("file content does not match its extension")

    digest = hashlib.sha256(blob).hexdigest()[:16]
    stored_name = f"{digest}{extension}"

    directory = uploads_dir()
    directory.mkdir(parents=True, exist_ok=True)
    destination = directory / stored_name
    if not destination.exists():
        fd, tmp_name = tempfile.mkstemp(dir=str(directory), suffix=".tmp")
        try:
            with os.fdopen(fd, "wb") as handle:
                handle.write(blob)
            os.replace(tmp_name, destination)
        except BaseException:
            try:
                os.unlink(tmp_name)
            except OSError:
                pass
            raise

    return StoredMedia(filename=stored_name, size_bytes=len(blob))


def resolve_media(filename: str) -> Path | None:
    """Map a stored filename to a path, refusing anything outside uploads/."""
    candidate = Path(filename).name  # strip any directory component
    if candidate != filename or not candidate:
        return None
    if Path(candidate).suffix.lower() not in ALLOWED_IMAGE_EXTENSIONS:
        return None
    path = uploads_dir() / candidate
    try:
        resolved = path.resolve()
        if resolved.parent != uploads_dir().resolve():
            return None
    except OSError:
        return None
    return resolved if resolved.is_file() else None


def admin_enabled() -> bool:
    """Whether write operations are permitted.

    Deliberately NOT an auth system — the freeze baseline forbids login /
    permissions. This is an operator-level switch for local and single-machine
    use. A multi-user production deployment MUST introduce real authentication
    via a new Freeze Revision Gate before enabling this.
    """
    return os.getenv("ADMIN_ENABLED", "").strip().lower() in ("1", "true", "yes", "on")
