from pathlib import Path
import os

from fastapi import APIRouter, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# M3-002: configuration is externalized to environment variables (config.py).
# No hardcoded API base / CORS / version / data dir remain in this file.
from .config import LOGGER_NAME, configure_logging, get_settings
from .core.repository import TOPIC_PATTERN, JsonTopicRepository
from .core.knowledge_service import KnowledgeService
# M29.1-A/B: provenance runtime projection (read model, ADR-006). Wired into the
# composition root in M29.1-B under the approved Freeze Revision Gate (ADR-005).
from .core.dataset_provider import build_dataset_provider
from .core.provenance_index import ProvenanceIndex
from .core.exploration import build_exploration_response as _exploration_from_data, build_generic_exploration

# M2-005: data-quality validation is a pure library kept separate from the
# app wiring (single responsibility, no import cycle, easy to unit-test).
from .validation import (
    build_global_validation_report,
    format_developer_report,
)

# M11-2 (ADR-0003): grounded AI interpretation endpoints. All AI orchestration
# lives inside the approved ai_gateway module; this file only mounts the routes
# (no AI logic / graph mutation / business logic — freeze boundary §5).
from typing import Optional

from pydantic import BaseModel, Field

from .ai_gateway import grounded_answer

# ADR-0018 (PO-approved lift of red line C6): research persistence. The router
# and its sqlite3 store live entirely inside the approved ai_gateway module;
# this file only mounts it (no storage logic here — freeze boundary §5).
from .ai_gateway.research_router import router as research_router

# M90.x: entity insight store — 历史见解固化存储（sqlite3, ai_gateway 内）.
# 生成逻辑在下方 handler 内，存储完全委托给 insight_store（freeze boundary）。
from .ai_gateway import insight_store

# ADR-0021: Content Configuration Layer. Display copy / artwork for the landing
# page becomes runtime-editable data. All storage logic lives inside the
# `content` module; this file only mounts the router (freeze boundary §5).
from .content import router as content_router
from .content import site_config_router

# --- Configuration (env-driven, M3-002) -----------------------------------
settings = get_settings()
logger = configure_logging(settings.log_level)

# ADR-0017: load backend/.env (AI key / base_url / model / enable flag) for
# deployment. Guarded so pytest never auto-loads .env — that keeps the AI-off
# contract verifiable and prevents tests from constructing a real provider.
if "PYTEST_CURRENT_TEST" not in os.environ:
    from .ai_gateway.config import _load_dotenv

    _load_dotenv()

app = FastAPI(
    title=settings.app_name,
    description="Backend API service foundation for History Explorer.",
    version=settings.app_version,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Ops middleware: unified error logging + response hardening (M3-002) --
@app.middleware("http")
async def ops_middleware(request, call_next):
    """Log unhandled exceptions once (with traceback) and stamp every response
    with hardening headers. The body is never altered, so frozen API contracts
    stay intact.
    """
    try:
        response = await call_next(request)
    except Exception:
        logger.exception(
            "Unhandled error on %s %s", request.method, request.url.path
        )
        raise
    response.headers.setdefault("X-API-Version", settings.api_version_tag)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    return response


@app.get("/")
def root():
    return {
        "project": "History Explorer",
        "status": "running",
        "service": "backend",
    }


# --- Knowledge Core wiring (composition root) ------------------------------
# Exploration content is loaded from a local JSON directory (no DB / ORM /
# external API / pipeline — simple file reading only). The path is config;
# the Repository Layer decides how to read it.
EXPLORATION_DATA_DIR = Path(settings.data_dir)

_repository = JsonTopicRepository(EXPLORATION_DATA_DIR)
knowledge_service = KnowledgeService(_repository)

# --- M29.1-B: Provenance Runtime Projection (composition root) ------------
# ADR-005 Freeze Revision Gate approved. Pure additive wiring: a module-level
# singleton `provenance_index` derived from the curated DatasetProvider. No
# lifespan / startup hook added; KnowledgeService / repository / schema untouched.
# `ProvenanceIndex` is a read model (ADR-006) — it never mutates examples, the
# graph, or any data file. Gated by PROVENANCE_PROJECTION (default on); when
# disabled the runtime falls back to vM27.1 behavior with no projection built.
PROVENANCE_PROJECTION = (
    os.environ.get("PROVENANCE_PROJECTION", "true").strip().lower() != "false"
)

provenance_index: "ProvenanceIndex | None" = None
if PROVENANCE_PROJECTION:
    _provenance_provider = build_dataset_provider(EXPLORATION_DATA_DIR)
    provenance_index = ProvenanceIndex().build(_provenance_provider)


# M4-005: legacy compatibility shims removed; all topic/entity lookups now
# route through KnowledgeService.

# --- Handlers (single source of truth, mounted under /api/v1 AND legacy) ---
# Each handler is defined once; the v1 router and the legacy router both point
# at the same function with distinct operation_ids, so there is no behavior
# fork and the OpenAPI document stays clean.
def _connections_explained_for(body: dict) -> list:
    """M3.5-003 (additive): explainable connections from the centered entity.

    Surfaces the Exploration Engine's ranked, explainable reachable nodes for
    the response's main entity (resolved via its `global_id`). Empty list when
    there is no centered entity / no global_id (e.g. the generic fallback).
    Kept as a pure projection so the frozen body shape is only ever *extended*.
    """
    main = (body.get("exploration") or {}).get("main_entity") or {}
    global_id = main.get("global_id")
    if not global_id:
        return []
    return knowledge_service.explore_from(global_id)


def explore(topic: str):
    """Return historical exploration results for a given topic.

    Data is sourced from the Knowledge Core (repository -> registry), otherwise
    a generic fallback is returned. M3.5-003 additively enriches the response
    with a `connections_explained` block (explainable connections from the
    centered entity) — no existing field is changed.
    """
    if not TOPIC_PATTERN.match(topic):
        raise HTTPException(
            status_code=400,
            detail="Invalid topic. Use only lowercase letters, digits, "
            "underscores and hyphens (e.g. roman_empire).",
        )

    data = knowledge_service.get_topic_data(topic)
    if data is not None:
        body = _exploration_from_data(topic, data)
    else:
        body = build_generic_exploration(topic)
    body["connections_explained"] = _connections_explained_for(body)
    # M4-002 (additive): expose direct cross-topic neighbors of the centered
    # entity + per-topic connection statistics. Pure projections over the
    # GlobalGraph; existing fields (related_entities / connections_explained /
    # relationships[].other) are unchanged. No new endpoint; v1==legacy holds.
    _main = (body.get("exploration") or {}).get("main_entity") or {}
    _main_gid = _main.get("global_id")
    body["exploration"]["cross_topic_related"] = (
        knowledge_service.cross_topic_related(_main_gid) if _main_gid else []
    )
    body["related_topics"] = knowledge_service.related_topics_for_topic(topic)
    return body


def search(q: str = "", topic: str = None):
    """Search entities AND topics across all topics using the in-memory
    Knowledge Core (M4-004 Search v2).

    Exact id/name match, alias match, then substring (contains) match, ranked
    best-first — for both entities and topics. The optional `topic` param
    scopes the whole result set to a single topic. No AI, no DB — the index is
    built once at startup and reused for every request. Same handler is mounted
    under /api/v1 and the legacy path (v1 == legacy); no new endpoint.
    """
    query = (q or "").strip()
    if not query:
        return {"query": q, "results": [], "count": 0}

    results = knowledge_service.search(query, topic)
    return {"query": q, "results": results, "count": len(results)}


def topics():
    """List every available topic for the catalog / directory surfaces.

    Pure projection over the Knowledge Core's topic registry — reuses
    `KnowledgeService.list_topics()` + `get_topic_meta()` (no new storage, no
    engine call, no new dependency). Returns exactly {topic, title, summary};
    the `summary` is already truncated to 160 chars by the registry. Additive
    only: no existing endpoint or field is changed. Mounted under /api/v1 AND
    the frozen legacy path so v1 == legacy holds.
    """
    result = []
    for topic in knowledge_service.list_topics():
        meta = knowledge_service.get_topic_meta(topic)
        if meta is None:
            # Registry guarantees meta for every listed topic; skip defensively
            # rather than raise on a partial dataset.
            continue
        result.append(
            {
                "topic": meta.get("topic", topic),
                "title": meta.get("title", topic),
                "summary": meta.get("summary", ""),
                "category": meta.get("category", ""),
            }
        )
    return {"topics": result}


def entity(entity_id: str):
    """Return one entity's summary, timeline, relationships and an
    entity-centered exploration view.

    The id may be a LOCAL id (e.g. `person-augustus`) or a GLOBAL id
    (e.g. `roman_empire:person-augustus`) — both resolve to the same local
    entity via the Knowledge Core registry. 404 when no entity carries that id.

    M3.5-003 (additive): every `relationships[].other` now carries `global_id`
    and `topic` (resolved cross-topic), and a `connections_explained` block
    surfaces the Exploration Engine's ranked, explainable connections from this
    entity. No existing field is removed or renamed.
    """
    ref = knowledge_service.resolve_entity(entity_id)
    if ref is None:
        raise HTTPException(status_code=404, detail=f"Entity '{entity_id}' not found.")

    target = knowledge_service.find_by_id(ref.topic, ref.local_id)
    if target is None:
        raise HTTPException(status_code=404, detail=f"Entity '{entity_id}' not found.")

    global_id = target.get("global_id")
    # Prefer Chinese label when available
    display_name = (
        (target.get("labels") or {}).get("zh")
        or target.get("name", "")
    )
    return {
        "id": target.get("id"),
        "type": target.get("type", ""),
        "name": display_name,
        "summary": target,
        "timeline": knowledge_service.get_timeline_index(ref.topic),
        "relationships": knowledge_service.get_entity_relationships(ref.topic, ref.local_id),
        "exploration": knowledge_service.get_exploration_view(ref.topic, ref.local_id),
        "connections_explained": (
            knowledge_service.explore_from(global_id) if global_id else []
        ),
        # M4-002 (additive): topic-level cross-topic connection stats for this
        # entity. Existing `relationships[].other` is unchanged.
        "related_topics": (
            knowledge_service.related_topics_for_entity(global_id) if global_id else []
        ),
    }


def explore_starters(topic: str):
    """Topic-level exploration entry points (M9-001 family).

    Deterministic, explainable starting entities for a topic, computed from
    the Knowledge Graph (centrality + type diversity). No AI, no DB. Returns
    {"topic", "entry_points": [...]}. Frontend uses these as the first nudges
    on a topic's Explore page, falling back to its static table on empty/error.
    """
    if not TOPIC_PATTERN.match(topic):
        raise HTTPException(
            status_code=400,
            detail="Invalid topic. Use only lowercase letters, digits, "
            "underscores and hyphens (e.g. roman_empire).",
        )
    return knowledge_service.topic_entry_points(topic, max_results=3)


def related_entities(gid: str = ""):
    """Entity-level related entities (M9-001 family).

    Deterministic, explainable "next stops" from one entity, computed by the
    frozen graph engine `generate_candidates` (centrality + type diversity +
    temporal/theme coherence). No AI, no DB, no wall-clock in ranking — same
    (gid) -> identical output. Used by the entity-page Research tab to surface
    "what else can I study" so research has a logical thread (Article 0).

    `gid` carries a topic prefix + colon (e.g. "roman_empire:civ-roman"), so it
    is passed as a query parameter (not a path segment) to avoid colon parsing
    pitfalls. Returns RecommendationResult.to_dict():
      {"current_entity", "recommendations": [{target_entity, reasons, ...}], ...}
    """
    if not gid or len(gid) > 256:
        raise HTTPException(
            status_code=400,
            detail="Invalid entity global_id. Expected a non-empty graph node id.",
        )
    result = knowledge_service.generate_candidates(gid, seen_global_ids=None, max_results=6)
    return result.to_dict()


# A3 (ADR-0015 D1): public /entity/{id}/recommendations endpoint retired.
# The "next step" capability is now produced by the frontend ExplorationPolicy
# (see frontend/src/components/NextStepPanel.tsx); no backend endpoint participates.


# --- M29.1-C: Runtime Provenance Projection exposure (ADR-006 read model) --
# New OPTIONAL endpoint gated by PROVENANCE_PROJECTION (default on). It exposes
# the subject_id -> ProvenanceRecord projection that M29.1-A/‑B wired into the
# composition root. It does NOT mutate examples, the graph, or any schema, and
# it never merges into the /entity response (M29.0 Option B: dedicated endpoint).
# When the projection is disabled the endpoint returns 404 — preserving the
# vM27.1 contract where this endpoint does not exist — so /entity, /search and
# /explore behavior is fully unchanged. add_api_route on both v1_router and
# legacy_router keeps the v1 == legacy invariant without a new router file.
def provenance(entity_id: str):
    """Return the provenance records (source references) for a historical entity.

    `entity_id` mirrors the identifier accepted by /entity/{entity_id} (local or
    global id) and is used verbatim as the provenance subject_id key. Provenance
    is a derived read model: 200 with an (possibly empty) `provenance` list in
    every case — absence of records is a valid, empty answer, never a 404. The
    endpoint returns 404 ONLY when PROVENANCE_PROJECTION is disabled, preserving
    the vM27.1 fallback where this capability does not exist.
    """
    if not PROVENANCE_PROJECTION or provenance_index is None:
        raise HTTPException(
            status_code=404,
            detail="Provenance projection is disabled (PROVENANCE_PROJECTION=false).",
        )
    records = provenance_index.resolve(entity_id)
    return {
        "entity_id": entity_id,
        "provenance": [r.to_dict() for r in records],
    }


_VALIDATION_REPORT = None


def health():
    """Readiness check: surfaces the startup validation report.

    Returns detailed data-quality counts and the warning/error tally. 200 in
    every case — validation never crashes the service; problems are reported,
    not raised. Response shape is frozen (M2-005 contract).
    """
    if _VALIDATION_REPORT is None:
        return {"status": "unknown", "health": {}}
    return _VALIDATION_REPORT.to_dict()


def healthz():
    """Liveness probe: cheap, dependency-free "is the process up?" check.

    Distinct from /health (readiness) so orchestrators can restart a hung
    process without waiting on data-quality checks. No heavy work here.
    """
    return {
        "status": "ok",
        "service": settings.app_name,
        "version": settings.app_version,
    }


# --- M11-2 (ADR-0003): Grounded AI interpretation endpoints ---------------
# Both endpoints are STRICTLY STATELESS (Acceptance Review Required Change #2):
# every request carries its own context via `context_global_ids`; the server
# holds no conversation / session / user-memory state. The handler is a thin
# delegate to `grounded_answer` in ai_gateway — all AI logic stays there.
class AIRequest(BaseModel):
    question: str
    context_global_ids: list[str] = []
    # M36.0 (additive): scenario mode. Pure pass-through to ai_gateway — no
    # prompt text or AI logic lives in main.py (freeze boundary §5). Unknown
    # modes fall back to 'explain' inside prompt_service.
    mode: str = "explain"
    # M74-004-002 (PO-approved Freeze Revision): additive exploration-state
    # fields for the backend Exploration Planner. Purely declarative — no
    # route / logic change. The frontend only supplies id lists, never facts.
    visited: list[str] = Field(default_factory=list)
    package_context: Optional[str] = None


def ai_explain(body: AIRequest):
    """Single-shot, grounded explanation of the current exploration context.

    The answer is built strictly from the deterministic knowledge graph
    (ADR-0003). Returns the deterministic fallback when AI is disabled or the
    provided context is empty. HTTP 200 in every case (M0-M10 unaffected).
    """
    return grounded_answer(
        knowledge_service,
        body.question,
        body.context_global_ids,
        mode=body.mode or "explain",
        visited=body.visited,
        package_context=body.package_context,
    )


def ai_chat(body: AIRequest):
    """Stateless conversational question over the current exploration context.

    Identical engine to /ai/explain; the distinguishing contract is that this
    endpoint stores NO conversation state between requests — context is released
    when the handler returns. It is a pure function of (question,
    context_global_ids), never of past requests.
    """
    return grounded_answer(
        knowledge_service,
        body.question,
        body.context_global_ids,
        mode=body.mode or "explain",
        visited=body.visited,
        package_context=body.package_context,
    )


# --- M90.x: 历史见解（固化内容，后台管理刷新） ------------------------------
# 历史见解 = 后台触发 AI 基于证据生成一次并固化；前端只读固化内容，
# 不再每次实时 AI 生成（PO 2026-08-10 判定）。


class InsightUpdate(BaseModel):
    """PUT /api/v1/insights/{global_id} — 后台人工编辑历史见解。"""

    insight: str
    evidence: Optional[list] = None


def _generate_entity_insight(global_id: str) -> dict:
    """AI 基于实体证据生成历史见解并固化。无证据 / 无 AI → 明确 HTTP 错误。

    Prompt 明确要求"仅基于以下证据"，AI 不新增证据之外的事实（真值层纪律）。

    证据扩展（PO 2026-08-11）：时间段等区间实体自身无证据声明时，
    build_claim_graph_expanded 自动收集其图邻居（区间内事件/人物）的
    证据声明作为证据池——时间段的意义由区间内事件承载，证据仍全部
    来自知识库真实声明，不新增任何编造内容。
    """
    from .ai_gateway.grounding_builder import GroundingBuilder
    from .ai_gateway.provider import AIUnavailableError, get_provider

    graph = GroundingBuilder(knowledge_service).build_claim_graph_expanded(global_id)
    claims = list(graph.claims or [])
    if not claims:
        raise HTTPException(
            status_code=422,
            detail="该实体在知识库中没有可用的证据声明，无法生成历史见解。",
        )

    evidence_lines: list[str] = []
    evidence_out: list[dict] = []
    for c in claims:
        text = (c.claim_text or "").strip()
        if not text:
            continue
        source_title = ""
        source_creator = ""
        source_publisher = ""
        source_type = ""
        sid = c.source_id or None
        if sid:
            src = knowledge_service.get_source(sid)
            if src:
                source_title = src.get("title", "") or ""
                source_creator = src.get("creator", "") or ""
                source_publisher = src.get("publisher_or_archive", "") or ""
                source_type = src.get("type", "") or ""
        evidence_lines.append(f"- {text}" + (f"（来源：{source_title}）" if source_title else ""))
        evidence_out.append(
            {
                "global_id": global_id,
                "kind": "claim",
                "label": text,
                "status": "verified",
                "source_id": sid,
                "source_title": source_title,
                # 2026-08-11 (PO)：来源完整书目信息（作者/出版社/类型），
                # 供前端证据区展示增强可信度；additive，向后兼容。
                "source_creator": source_creator,
                "source_publisher": source_publisher,
                "source_type": source_type,
                # 证据来源实体（自身或扩展的邻居实体），additive。
                "subject": c.subject or "",
            }
        )

    if not evidence_out:
        raise HTTPException(status_code=422, detail="该实体没有可用的证据文本。")

    try:
        provider = get_provider()
    except AIUnavailableError as e:
        raise HTTPException(status_code=503, detail=f"AI 服务未启用：{e}")

    system_prompt = (
        "你是严谨的历史研究助手。请仅依据下方提供的证据生成该实体的历史见解。"
        "严格限定在证据范围内，不得添加证据之外的事实或推测。使用简体中文。"
    )
    user_prompt = (
        "证据：\n" + "\n".join(evidence_lines)
        + "\n\n请基于以上证据，用一段话阐述该实体在历史上的意义与影响（历史见解）。"
    )
    try:
        insight_text = provider.complete(system_prompt, user_prompt, max_tokens=500).strip()
    except Exception as e:  # noqa: BLE001 — network/model errors surface as 502
        raise HTTPException(status_code=502, detail=f"AI 生成失败：{e}")

    if not insight_text:
        raise HTTPException(status_code=502, detail="AI 未返回内容。")

    return insight_store.save_insight(global_id, insight_text, evidence_out, engine="ai")


def get_entity_insight(global_id: str):
    """GET — 前端读取固化历史见解（无则 404，前端显占位）。"""
    rec = insight_store.get_insight(global_id)
    if rec is None:
        raise HTTPException(status_code=404, detail="该实体暂无固化历史见解，请在后台生成。")
    return rec


def generate_entity_insight(global_id: str):
    """POST /generate — 后台触发：AI 基于证据生成 + 固化。"""
    return _generate_entity_insight(global_id)


def update_entity_insight(global_id: str, body: InsightUpdate):
    """PUT — 后台人工编辑历史见解（engine=curated）。"""
    insight = (body.insight or "").strip()
    if not insight:
        raise HTTPException(status_code=422, detail="历史见解内容不能为空。")
    evidence = body.evidence if body.evidence is not None else []
    return insight_store.save_insight(global_id, insight, evidence, engine="curated")


# --- Router wiring: canonical /api/v1 + frozen legacy compat -------------
v1_router = APIRouter()
v1_router.add_api_route(
    "/explore/{topic}", explore, methods=["GET"], operation_id="v1_explore"
)
v1_router.add_api_route(
    "/entity/{entity_id}", entity, methods=["GET"], operation_id="v1_entity"
)
    # A3 (ADR-0015 D1): v1 /entity/{id}/recommendations route retired.
v1_router.add_api_route(
    "/search", search, methods=["GET"], operation_id="v1_search"
)
v1_router.add_api_route(
    "/topics", topics, methods=["GET"], operation_id="v1_topics"
)
v1_router.add_api_route(
    "/health", health, methods=["GET"], operation_id="v1_health"
)
v1_router.add_api_route(
    "/healthz", healthz, methods=["GET"], operation_id="v1_healthz"
)
v1_router.add_api_route(
    "/ai/explain", ai_explain, methods=["POST"], operation_id="v1_ai_explain"
)
v1_router.add_api_route(
    "/ai/chat", ai_chat, methods=["POST"], operation_id="v1_ai_chat"
)
# M90.x: 历史见解固化内容（后台生成/编辑，前端只读）
v1_router.add_api_route(
    "/insights/{global_id}", get_entity_insight, methods=["GET"], operation_id="v1_insight_get"
)
v1_router.add_api_route(
    "/insights/{global_id}/generate", generate_entity_insight, methods=["POST"], operation_id="v1_insight_generate"
)
v1_router.add_api_route(
    "/insights/{global_id}", update_entity_insight, methods=["PUT"], operation_id="v1_insight_update"
)
v1_router.add_api_route(
    "/provenance/{entity_id}",
    provenance,
    methods=["GET"],
    operation_id="v1_provenance",
)
v1_router.add_api_route(
    "/topics/{topic}/explore-starters",
    explore_starters,
    methods=["GET"],
    operation_id="v1_topic_explore_starters",
)
v1_router.add_api_route(
    "/related-entities",
    related_entities,
    methods=["GET"],
    operation_id="v1_related_entities",
)

legacy_router = APIRouter()
legacy_router.add_api_route(
    "/explore/{topic}", explore, methods=["GET"], operation_id="explore"
)
legacy_router.add_api_route(
    "/entity/{entity_id}", entity, methods=["GET"], operation_id="entity"
)
    # A3 (ADR-0015 D1): legacy /entity/{id}/recommendations route retired.
legacy_router.add_api_route(
    "/search", search, methods=["GET"], operation_id="search"
)
legacy_router.add_api_route(
    "/topics", topics, methods=["GET"], operation_id="topics"
)
legacy_router.add_api_route(
    "/health", health, methods=["GET"], operation_id="health"
)
legacy_router.add_api_route(
    "/healthz", healthz, methods=["GET"], operation_id="healthz"
)
legacy_router.add_api_route(
    "/ai/explain", ai_explain, methods=["POST"], operation_id="ai_explain"
)
legacy_router.add_api_route(
    "/ai/chat", ai_chat, methods=["POST"], operation_id="ai_chat"
)
legacy_router.add_api_route(
    "/provenance/{entity_id}",
    provenance,
    methods=["GET"],
    operation_id="provenance",
)
legacy_router.add_api_route(
    "/topics/{topic}/explore-starters",
    explore_starters,
    methods=["GET"],
    operation_id="topic_explore_starters",
)
legacy_router.add_api_route(
    "/related-entities",
    related_entities,
    methods=["GET"],
    operation_id="related_entities",
)

app.include_router(v1_router, prefix=settings.api_v1_prefix)
app.include_router(legacy_router)
# ADR-0018: research persistence is v1-only (no legacy compat surface needed —
# the endpoint did not exist before this gate).
app.include_router(research_router, prefix=settings.api_v1_prefix)
# ADR-0021: content configuration is v1-only (new surface, no legacy compat).
app.include_router(content_router, prefix=settings.api_v1_prefix)
# ADR-0021 sibling: site configuration (feature flags / topic ordering / …).
app.include_router(site_config_router, prefix=settings.api_v1_prefix)


# --- Startup: build the in-memory Knowledge Core once ---------------------
# All example datasets are read a single time here (via the repository),
# populating the registries, graph, search index and timeline indexes. Every
# subsequent request runs purely from memory — no per-request JSON loading or
# filesystem scan. The validation report (per-topic + cross-topic) is built
# from the same core and emitted through the unified logger.
_VALIDATION_REPORT = build_global_validation_report(knowledge_service)
logger.info(format_developer_report(_VALIDATION_REPORT))
logger.info(
    "History Explorer API ready | version=%s | env=%s | v1_prefix=%s | topics=%d",
    settings.app_version,
    settings.environment,
    settings.api_v1_prefix,
    _VALIDATION_REPORT.topic_count,
)
