# Changelog

All notable changes to this project will be documented in this file.

---

## [0.2.0] - 2026-07-18

First formal changelog entry. Cumulative changes for milestones **M1 → M4** since `v0.1.0`. All changes are additive or non-breaking; the frozen schema (8 entity types / 18 relationship types) and public API contract are preserved.

### Added

- **Core Platform / Knowledge Layer**
  - Knowledge Core Foundation (M3-001): new `core/` package with `Repository`, `Registry`, `Graph`, `Search`, `Timeline`, `Exploration`, and the `KnowledgeService` facade; centralized composition root in `main.py`. Replaces ad-hoc data access with a single swappable repository seam (Neo4j-ready).
  - GlobalGraph (M3.5-001): unified cross-topic graph built on top of per-topic graphs plus the global registry, enabling cross-topic neighbor discovery and path finding without changing the public API or frontend.
  - Exploration Engine (M3.5-002): deterministic, explainable scoring that ranks related entities across four weighted dimensions — relationship meaning (0.35), temporal coherence (0.25), entity importance (0.20), path simplicity (0.20). No AI, no GIS, no Neo4j, no recommendation system.
  - Knowledge Model v2 (M2): generic entity model and relationship triples over an extensible vocabulary of 8 entity types / 18 relationship types.
  - Interconnected datasets (M3-003): cross-topic edges linking entities across topics via `namespace:id` global ids; validated with zero dangling references.
  - Clickable-entity exploration loop (M1): related entities are clickable and trigger a new exploration, closing the Explore → Connect → Discover cycle.

- **Search**
  - Unified Search v2 (M4-004): rewritten backend search provider (`core/search.py`) and frontend results surface (`SearchResults.tsx`) on a provider-agnostic, structured search architecture; covered by a new `test_search_v2` suite.

- **Cross Topic**
  - Cross-topic API projections (M4-002): additive `related_topics` (topic-level and entity-level) and `exploration.cross_topic_related` fields on `GET /explore` and `GET /entity`. No new endpoints, no contract break (`v1 == legacy`).
  - Cross-topic UI (M4-003): `CrossTopicTopicList` ("Connected Topics") and `CrossTopicConnectionsPanel` (clickable cross-topic neighbor chips) on the Explore and Entity pages, backed by a new pure helper module `crossTopic.ts`.

- **Frontend**
  - Five-zone exploration interface (M3.5-004): Related / Explained / Paths / Timeline / Themes zones rendering real cross-topic data.
  - In-app navigation model (M2/M3): history stack (`navigation.ts`) with breadcrumb and back/forward, driving both the Explore and Entity views.

### Changed

- **Core Platform / API**
  - API routing now serves canonical `/api/v1` endpoints alongside frozen legacy routes (M3-002).
  - Configuration externalized via `config.py` (`CORS_ORIGINS`, `DATA_DIR`, `APP_VERSION`) read from environment variables (M3-002).
  - Logging switched from `print` to the structured `logging` module (M3-002).
  - Topic id hardening (M1): the `topic` path parameter is validated with `^[a-z0-9_-]+$` before file access.

### Improved

- **Data & Quality**
  - Data scale & quality (M4-001): added 4 topics (`persian_empire`, `greek_philosophy`, `early_christianity`, `ancient_india`); the repository now holds **8 topics / 69 entities / 104 relationships / 15 timelines / 31 cross-topic edges**; data validation reports **0 warnings / 0 errors** (healthy).
  - Runtime health surface (M2-005): `GET /health` reports the full validation summary (topics / entities / relationships / timeline + warnings / errors).
  - Separate `GET /healthz` liveness probe (M3-002).

- **Frontend**
  - Hero copy aligned to the non-AI positioning ("A data-driven global history exploration platform") (M2-006).

### Refactored

- **Backend cleanup (M4-005)**
  - Removed the API-layer compatibility shim (`_ENTITY_INDEX` / `_get_entity_index` / `_load_topic_data`) from `main.py`; routing now uses the `KnowledgeService` path directly.
  - Renamed the `AIGuidePanel` placeholder component to `InterpretationPanel` to match the non-AI product positioning; removed the dead placeholder component.
  - Added single-responsibility annotations to `RelationshipView` and `RelatedEntityList`.

### Documentation

- Team Operating Specification v1.2 (frozen).
- History Explorer Documentation Standard v1.0.
- Architecture & report docs: M3-001 / M3-002 / M3-003, M3.5-000 / 001 / 002 / 003 / 004, M4-001 Data Scale & Quality Report, M4-002 Completion Report, M4-003 Architecture.
- Schema Freeze Review (M3.5-000) locking 8 entity types / 18 relationship types as the immutable vocabulary.

### QA

- M4-006 full QA cycle (Planning → Backend → Integration → Frontend → Regression → Final Sign-off): all phases **PASS**; backend **112** / frontend **61** tests passing; production build **0 errors**; TypeScript **0 type errors**; no architectural drift; schema freeze intact.
- Minimum API-contract test layer (M1): `TestClient` contract tests plus frontend smoke tests prevent accidental contract regressions.
- Test baselines grew across milestones (M2: 50 backend / 38 frontend → M4: 112 backend / 61 frontend).
