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

# --- Configuration (env-driven, M3-002) -----------------------------------
settings = get_settings()
logger = configure_logging(settings.log_level)

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
v1_router.add_api_route(
    "/provenance/{entity_id}",
    provenance,
    methods=["GET"],
    operation_id="v1_provenance",
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

app.include_router(v1_router, prefix=settings.api_v1_prefix)
app.include_router(legacy_router)


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
