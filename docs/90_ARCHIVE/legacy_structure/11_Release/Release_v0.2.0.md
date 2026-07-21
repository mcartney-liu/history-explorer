# History Explorer v0.2.0

**Release Date:** 2026-07-18
**Version:** 0.2.0
**Tag:** v0.2.0
**Scope:** Milestones M1 → M4 (cumulative since v0.1.0)

## Overview

History Explorer is a data-driven global-history exploration platform. v0.2.0 is the first
formally versioned release, consolidating the work of milestones M1 (Foundation) through M4
(Feature Completion) and the full M4-006 QA cycle. All changes in this release are additive or
non-breaking: the frozen schema (8 entity types / 18 relationship types) and the public REST API
contract are preserved.

This release introduces a Cross-Topic exploration experience, a rewritten Unified Search (v2),
and the Knowledge Layer foundation (GlobalGraph + deterministic Exploration Engine), on top of the
M1–M3 platform.

## Highlights

- **Cross-topic exploration:** discover and navigate entities that connect topics.
- **Unified Search v2:** a provider-agnostic, structured search architecture with dedicated test coverage.
- **Knowledge Layer:** GlobalGraph over per-topic graphs plus a deterministic, explainable
  Exploration Engine (no AI / no GIS / no Neo4j / no recommendation system).
- **Five-zone exploration UI:** Related / Explained / Paths / Timeline / Themes.
- **Expanded dataset:** 8 topics, 69 entities, 104 relationships, 15 timelines, 31 cross-topic edges
  (0 validation warnings / 0 errors).
- **Full M4-006 QA:** backend 112 / frontend 61 tests passing, production build 0 errors,
  TypeScript 0 type errors.

## Major Features

### Architecture

- **Knowledge Core Foundation (M3-001):** new `core/` package (`Repository`, `Registry`, `Graph`,
  `Search`, `Timeline`, `Exploration`, `KnowledgeService` facade). A single swappable repository
  seam centralizes data access, keeping the public API stable and enabling a future Neo4j migration
  without breaking callers.
- **Stable composition root (M3-001):** `main.py` wires the repository and services once; API routes
  consume the `KnowledgeService` directly (the legacy API-layer shim was removed in M4-005).
- **API hardening (M3-002):** canonical `/api/v1` routes served alongside frozen legacy routes;
  configuration externalized via `config.py` (`CORS_ORIGINS`, `DATA_DIR`, `APP_VERSION`); logging
  migrated from `print` to the `logging` module; separate `/healthz` liveness probe.

### Search v2 (M4-004)

- Rewritten backend search provider (`core/search.py`) and frontend results surface
  (`SearchResults.tsx`) on a provider-agnostic, structured search architecture.
- Covered by a new `test_search_v2` test suite. No breaking change to the search contract.

### Cross Topic Exploration

- **API projections (M4-002):** additive `related_topics` (topic-level and entity-level) and
  `exploration.cross_topic_related` fields on `GET /explore` and `GET /entity`. No new endpoints;
  `v1` responses are backward compatible with legacy.
- **UI (M4-003):** `CrossTopicTopicList` ("Connected Topics") and `CrossTopicConnectionsPanel`
  (clickable cross-topic neighbor chips) on the Explore and Entity pages, backed by the pure helper
  module `crossTopic.ts`.

### Knowledge Layer

- **GlobalGraph (M3.5-001):** a unified cross-topic graph built on per-topic graphs plus the global
  registry, enabling cross-topic neighbor discovery and path finding without changing the public API
  or frontend.
- **Interconnected datasets (M3-003):** cross-topic edges link entities across topics via
  `namespace:id` global ids; validated with zero dangling references.

### Exploration Engine (M3.5-002)

- Deterministic, explainable scoring that ranks related entities across four weighted dimensions:
  - Relationship meaning — weight 0.35
  - Temporal coherence — weight 0.25
  - Entity importance — weight 0.20
  - Path simplicity — weight 0.20
- No AI, no GIS, no Neo4j, no recommendation system. Fully reproducible given the same dataset.

### Frontend

- **Five-zone exploration interface (M3.5-004):** Related / Explained / Paths / Timeline / Themes
  zones render real cross-topic data.
- **In-app navigation (M2/M3):** history stack (`navigation.ts`) with breadcrumb and back/forward
  controls driving both Explore and Entity views.
- **Clickable-entity loop (M1):** related entities are clickable and trigger a new exploration,
  closing the Explore → Connect → Discover cycle.

### Backend

- **Data scale & quality (M4-001):** added 4 topics (`persian_empire`, `greek_philosophy`,
  `early_christianity`, `ancient_india`); repository now holds 8 topics / 69 entities /
  104 relationships / 15 timelines / 31 cross-topic edges; data validation reports 0 warnings /
  0 errors (healthy).
- **Runtime health (M2-005 / M3-002):** `GET /health` reports the full validation summary;
  `GET /healthz` is a liveness probe.
- **Cleanup (M4-005):** removed the API-layer compatibility shim; renamed the `AIGuidePanel`
  placeholder to `InterpretationPanel` to match the non-AI positioning; added single-responsibility
  annotations to `RelationshipView` and `RelatedEntityList`.

## Documentation

- Team Operating Specification v1.2 (frozen).
- History Explorer Documentation Standard v1.0.
- Architecture & report docs: M3-001 / M3-002 / M3-003, M3.5-000 / 001 / 002 / 003 / 004,
  M4-001 Data Scale & Quality Report, M4-002 Completion Report, M4-003 Architecture,
  M4-007-002 CHANGELOG.
- Schema Freeze Review (M3.5-000) locks 8 entity types / 18 relationship types as the immutable
  vocabulary.

## QA Summary

- **M4-006 full QA cycle:** Planning → Backend → Integration → Frontend → Regression → Final
  Sign-off; all phases **PASS**.
- **Test baselines:** backend **112** tests passing (11 files); frontend **61** tests passing
  (10 files).
- **Build & types:** production build **0 errors** (57 modules); TypeScript **0 type errors**.
- **Data health:** 0 validation warnings / 0 errors; 31 cross-topic edges with zero dangling
  references.
- **Architecture:** no drift detected across milestones; schema freeze (8 entities / 18
  relationships) intact; AI boundary (no AI / LLM / Neo4j / GIS runtime) intact.
- **Regression:** M1–M4 regression matrix green; no functional or architectural regression
  introduced.

## Known Limitations

The following are known, non-blocking characteristics of the current release (no item blocks
adoption):

- **Deterministic by design:** the Exploration Engine performs no AI / ML inference. Relevance is
  computed from a fixed weighting scheme over the dataset; results are fully reproducible.
- **File-based data layer:** topics are loaded from JSON files into an in-memory graph at startup.
  The repository seam is designed for a future graph database (e.g., Neo4j), but no such backend
  ships in v0.2.0.
- **Manual release verification:** there is no automated CI / CD pipeline; releases are verified
  manually via the pytest / vitest / vite-build / tsc checks described above.
- **Cross-topic UI scope:** the cross-topic panels expose a curated subset of the global graph
  (neighbor chips and connected-topics list); deeper path and theme traversal is incrementally
  surfaced through the existing zones.
