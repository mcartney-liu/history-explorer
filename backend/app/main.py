from pathlib import Path

from fastapi import APIRouter, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# M3-002: configuration is externalized to environment variables (config.py).
# No hardcoded API base / CORS / version / data dir remain in this file.
from .config import LOGGER_NAME, configure_logging, get_settings
from .core.repository import TOPIC_PATTERN, JsonTopicRepository
from .core.knowledge_service import KnowledgeService
from .core.exploration import build_exploration_response as _exploration_from_data

# M2-005: data-quality validation is a pure library kept separate from the
# app wiring (single responsibility, no import cycle, easy to unit-test).
from .validation import (
    build_global_validation_report,
    format_developer_report,
)

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


# Backward-compatible module-level shims. Existing tests import these names
# from `app.main`; they now delegate to the Knowledge Core instead of holding
# duplicated data-access logic. (Removal is deferred to a dedicated cleanup
# checkpoint — see docs/SUGGESTIONS.md — to avoid touching passing tests.)
_ENTITY_INDEX = knowledge_service.get_search_index()


def _get_entity_index() -> list:
    """Return the shared search index (built once at startup)."""
    return _ENTITY_INDEX


def _load_topic_data(topic: str):
    """Compatibility shim: delegate topic loading to the repository."""
    return _repository.load_topic(topic)


def _generic_exploration(topic: str) -> dict:
    """Fallback for topics without loaded example data (still hardcoded).

    Keeps the same response shape (entities/relationships/timeline/connections)
    so the frontend contract stays stable.
    """
    title = topic.replace("-", " ").replace("_", " ").title()
    return {
        "topic": topic,
        "title": title,
        "summary": "A historical exploration example.",
        "entities": [],
        "relationships": [],
        "timeline": [
            {"period": "Unknown", "event": f"{title} historical period"},
        ],
        "connections": [
            {"type": "person", "name": "Historical figure"},
        ],
        "exploration": {"main_entity": {}, "related_entities": []},
    }


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
        body = _generic_exploration(topic)
    body["connections_explained"] = _connections_explained_for(body)
    return body


def search(q: str = ""):
    """Search entities across all topics using the in-memory Knowledge Core.

    Exact id/name match, alias match, then substring (contains) match, ranked
    best-first. No AI, no DB — the index is built once at startup and reused
    for every request.
    """
    query = (q or "").strip()
    if not query:
        return {"query": q, "results": [], "count": 0}

    results = knowledge_service.search(query)
    return {"query": q, "results": results, "count": len(results)}


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
    return {
        "id": target.get("id"),
        "type": target.get("type", ""),
        "name": target.get("name", ""),
        "summary": target,
        "timeline": knowledge_service.get_timeline_index(ref.topic),
        "relationships": knowledge_service.get_entity_relationships(ref.topic, ref.local_id),
        "exploration": knowledge_service.get_exploration_view(ref.topic, ref.local_id),
        "connections_explained": (
            knowledge_service.explore_from(global_id) if global_id else []
        ),
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


# --- Router wiring: canonical /api/v1 + frozen legacy compat -------------
v1_router = APIRouter()
v1_router.add_api_route(
    "/explore/{topic}", explore, methods=["GET"], operation_id="v1_explore"
)
v1_router.add_api_route(
    "/entity/{entity_id}", entity, methods=["GET"], operation_id="v1_entity"
)
v1_router.add_api_route(
    "/search", search, methods=["GET"], operation_id="v1_search"
)
v1_router.add_api_route(
    "/health", health, methods=["GET"], operation_id="v1_health"
)
v1_router.add_api_route(
    "/healthz", healthz, methods=["GET"], operation_id="v1_healthz"
)

legacy_router = APIRouter()
legacy_router.add_api_route(
    "/explore/{topic}", explore, methods=["GET"], operation_id="explore"
)
legacy_router.add_api_route(
    "/entity/{entity_id}", entity, methods=["GET"], operation_id="entity"
)
legacy_router.add_api_route(
    "/search", search, methods=["GET"], operation_id="search"
)
legacy_router.add_api_route(
    "/health", health, methods=["GET"], operation_id="health"
)
legacy_router.add_api_route(
    "/healthz", healthz, methods=["GET"], operation_id="healthz"
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
