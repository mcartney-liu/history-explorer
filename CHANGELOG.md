# Changelog

All notable changes to this project will be documented in this file.

---

## [vM11-2] - 2026-07-24 (Project Release — M11-2)

> **Non-runtime release.** This is a Project Release, not a Runtime Version bump. `frontend/package.json` remains `0.13.0`; only backend `ai_gateway/` code + tests were added (additive). See `docs/RELEASE_VERSION_POLICY.md`.

Grounded AI Interpretation Layer (**M11-1 / M11-2**). Introduces an *additive* AI explanation layer over the deterministic knowledge graph, governed by **ADR-0003** — the deterministic graph stays the single source of truth and AI only consumes read-only grounding.

### Added

- **AI Gateway foundation (M11-1)** — `backend/app/ai_gateway/`: `provider` (transport adapter, no business logic), `prompt_service`, `fallback_handler`, `config`. The provider returns `None` when disabled / missing credentials, never raises.
- **Grounded Context Engine (M11-2)** — `backend/app/ai_gateway/`: `citation_model` (pure `Citation`), `grounding_builder` (read-only KnowledgeService adapter → `GroundingResult`), `context_serializer` (`GroundingResult` → `[ALLOWED FACTS]`), `response_validator` (validates every AI citation against real graph facts — `global_id` / `kind` / relationship / timeline; illegal citations rejected; all-illegal → `grounded=false`), `answer_service` (orchestration: builder → serialize → provider → validate, with deterministic fallback on provider failure / timeout).
- **AI endpoints** — `POST /ai/explain` + `POST /ai/chat`, dual-mounted (`/api/v1` + legacy). `/ai/chat` is **strictly stateless**: context is self-carried via `context_global_ids[]`; no conversation / history / session / memory / DB / Redis.

### Freeze Compliance

- Runtime held at `0.13.0`; no frontend / schema / enum (`ENTITY_TYPES=8`, `RELATIONSHIP_TYPES=18`) change.
- AI is **additive** and grounded per ADR-0003; the deterministic graph is never mutated. New dependency scope (`openai` SDK) is confined to `ai_gateway/`; `main.py` is route-mount only (no forbidden bare tokens).
- `scripts/freeze-check.mjs` **EXIT 0**; backend **156 passed** (incl. 12 new in `test_grounded_context.py`); M0–M10 zero regression.

---

## [vM10-2] - 2026-07-24 (Project Release — M10-2)

> **Non-runtime release.** This is a Project Release, not a Runtime Version bump. `frontend/package.json` remains `0.13.0`. See `docs/RELEASE_VERSION_POLICY.md`. (Backfilled for changelog completeness — the `vM10-2` tag was created without a matching CHANGELOG entry.)

Exploration Narrative Integration (**M10-1 / M10-2**), the M10 project-release series.

### Added

- **Exploration state persistence & trail visualization (M10-1)** — exploration state persistence plus an enriched exploration trail visualization.
- **Exploration narrative focus linkage (M10-2)** — links the exploration narrative to the focused entity/topic so trail and narrative stay in sync.

### Freeze Compliance

- No schema / enum (`ENTITY_TYPES=8`, `RELATIONSHIP_TYPES=18`) change. No AI / LLM introduced. No new dependency. Runtime held at `0.13.0`.

---

## [vM9-006] - 2026-07-23 (Project Release — M9-006)

> **Non-runtime release.** This is a Project Release, not a Runtime Version bump. `frontend/package.json` remains `0.13.0`; no code changed. See `docs/RELEASE_VERSION_POLICY.md`.

Release Governance & Documentation Hygiene (M9-006). Establishes the dual-track release-version policy and its automated consistency guard, closing the version-drift that existed before M9-006.

### Added

- **Release Version Policy** (`docs/RELEASE_VERSION_POLICY.md`, new): dual-track versioning model; seven release-version artifacts each with a single responsibility; formal "do not mix" rules; Release authority retained by Product Owner (D8).
- **Release Consistency Checker** (`scripts/release-consistency-check.mjs`, new): CI guard enforcing the policy via R1–R7 (package.json / runtime tag / project tag / README / PROJECT_CONTEXT §5 / CHANGELOG / self-integrity). stdlib-only, strictly read-only.

### Freeze Compliance

- No backend / frontend / schema / enum (`ENTITY_TYPES=8`, `RELATIONSHIP_TYPES=18`) change. No AI / LLM introduced. No new dependency.
- `frontend/package.json` held at `0.13.0`; README / PROJECT_CONTEXT / CHANGELOG synced to reflect the dual-track reality.

---

## [vM9-004.2] - 2026-07-22 (Project Release — M9-004)

> **Non-runtime release.** This is a Project Release (data milestone), not a Runtime Version bump. `frontend/package.json` remains `0.13.0`; no code changed. See `docs/RELEASE_VERSION_POLICY.md`.

Historical Knowledge Graph Data Expansion (**M9-004.2**). Expands the example dataset coverage across all 8 topics.

### Data (from `validation.py` / `GET /health`)

- **8 topics / 99 entities / 154 relations / 45 cross-topic edges / 15 timelines / 0 warnings** (previously 8 / 69 / 104 / 31 / 15 / 0).

### Freeze Compliance

- No backend / frontend / schema / enum (`ENTITY_TYPES=8`, `RELATIONSHIP_TYPES=18`) change. Pure data expansion.
- No AI / LLM introduced. No new dependency.
- Validation report: **0 warnings / 0 errors**.

---

## [0.13.0] - 2026-07-22

Exploration Journey Panel milestone (**M9-003**). Adds an explainable, retractable exploration journey that annotates each stop with *why it was reached* — frontend-only, no backend or AI.

### Added

- **Exploration Journey Panel (M9-003)**
  - `frontend/src/components/ExplorationJourney.tsx` (new): pure-consumer Journey panel — `buildJourney` (pure fn) / `ExplorationJourneyView` (presentational) / `ExplorationJourney` (container). Renders App navigation history with per-stop "why" annotations; **owns no navigation state**.
  - `frontend/src/App.tsx` (additive): session-scoped `journeyReasons` annotation map + `goHome` reset + `<ExplorationJourney>` sibling mount (Trail → Journey → RecPanel); `onNodeClick` 2-arg capture of recommendation context.
  - `frontend/src/components/RecommendationPanel.tsx` (additive): `RecommendationContext` type + `buildRecommendationContext` pure fn + backward-compatible `onNodeClick(gid, ctx?)`.
  - `frontend/src/App.css` (additive): `.he-journey*` styles (reuse `--he-*` tokens).
  - `frontend/src/components/__tests__/ExplorationJourney.test.tsx` (new): 13 tests.

### Freeze Compliance

- No backend / `navigation.ts` / schema / enum (`ENTITY_TYPES=8`, `RELATIONSHIP_TYPES=18`) change. `journeyReasons` is an annotation map, never enters `navigation.ts`.
- No AI / LLM / Provider / Recommendation-as-ML introduced — deterministic graph sort surfaced read-only.
- No new dependency. Frontend vitest **242 passed** (229 + 13); `tsc --noEmit` 0 errors; `vite build` 0 errors; freeze-check (`FROZEN_SCOPE=frontend`) PASSED.

---

## [0.12.0] - 2026-07-22

RecommendationPanel milestone (**M9-002**). Surfaces the M9-001 recommendation API in the frontend — frontend-only, no backend or AI.

### Added

- **RecommendationPanel (M9-002)**
  - `frontend/src/components/RecommendationPanel.tsx` (new): self-fetching panel consuming `GET /entity/{id}/recommendations`; 3-layer (fetch helper + view + container); `he-recommend` namespace; empty → null; loading → skeleton; error → retry.
  - `frontend/src/App.tsx` (additive): mount `RecommendationPanel` as entity-branch sibling (EntityPage → RecommendationPanel → ContinueExploringPanel), wired with `entityId` / `seenGlobalIds` / `max` / `onNodeClick`.
  - `frontend/src/App.css` (additive): `.he-recommend*` styles.
  - `frontend/src/components/__tests__/RecommendationPanel.test.tsx` (new): 9 tests.

### Freeze Compliance

- No backend / schema / enum change. No AI / LLM. No new dependency. Frontend vitest **229 passed** (220 + 9); `tsc --noEmit` 0 errors; `vite build` 0 errors; freeze-check (`FROZEN_SCOPE=frontend`) PASSED.

---

## [0.11.0] - 2026-07-22

Deterministic Next-Node Recommendation Engine milestone (**M9-001.2**). Adds a backend, explainable "next node" recommendation API reusing the frozen four-dimensional scoring — no AI/LLM, no schema change, no new dependency. All changes additive and freeze-safe.

### Added

- **Next-Node Recommendation Engine (M9-001)**
  - `core/exploration_engine.py`: `recommend_next()` — deterministic composite recommendation score reusing the frozen scoring primitives (relationship meaning / temporal coherence / entity importance / path simplicity); returns ranked candidates with `reasons`, `relation_path`, `score_breakdown`.
  - `core/knowledge_service.py`: `recommend_next()` facade over the engine.
  - `main.py`: `GET /entity/{entity_id}/recommendations` (dual-mounted `/api/v1` + legacy) returning `RecommendationResult` (`RecommendationItem[]` + `algorithm_version` + `parameters` + `metadata`). New types `RecommendationItem` / `RecommendationResult` / `REC_W_*`.
  - `tests/test_recommend.py`: 15 new backend tests.

### Freeze Compliance

- No frontend / schema / enum (`ENTITY_TYPES=8`, `RELATIONSHIP_TYPES=18`) change.
- No AI / LLM / Provider / Recommendation-as-ML introduced — this is a deterministic graph sort, PO-authorized (M9-000 / M9-001 Planning Baseline).
- No new dependency. Backend pytest **130 passed** (incl. 15 new); frontend vitest **220 passed** (unchanged); freeze-check (`FROZEN_SCOPE=backend`) PASSED (D=0).

---

## [0.10.0] - 2026-07-20

Engineering Foundation Cleanup milestone (**M8.6**, Phase 1 — Version Source Alignment). Establishes a single source of truth for versioning and reconciles release documentation that had drifted behind the actual Git tags.

### Changed (completed in M8.6 Phase 1)

- **Version Source Alignment**
  - `frontend/package.json`: `version` aligned `0.6.0` → `0.10.0` and adopted as the single source of truth for the frontend; Git tags remain the release-event markers. No dependency, script, or formatting changes.
  - `CHANGELOG.md`: reconciled against real Git history — added the missing `[0.7.0]`, `[0.8.0]`, and `[0.9.0]` entries (previously only `[0.6.0]` was present).
  - `README.md`: Project Status updated from the stale "M2 — Exploration MVP" to reflect M8 completion and the in-progress foundation cleanup.

### Scoped for follow-up M8.6 phases (NOT in v0.10.0)

- **CI pipeline** (`.github/workflows/ci.yml`) — automated test / type-check / build / freeze-guard.
- **Freeze-guard automation** (`scripts/freeze-check`) — enforced M3.5 freeze protection as a CI gate.
- **Engineering Playbook** (`docs/ENGINEERING_PLAYBOOK.md`) — codified milestone lifecycle and release discipline.

### Freeze Compliance

- No backend / API / Knowledge Model / AI / LLM change.
- No UI feature change; only version string and documentation updated.
- Frontend tests: `220 passed` (29 files, unchanged from v0.9.0); `tsc --noEmit` 0 errors; `vite build` 0 errors.

---

## [0.9.0] - 2026-07-20

Multi Entity Temporal Visualization milestone (**M8**). Adds a system-driven, multi-entity temporal view that overlays many entities on a shared year axis and surfaces deterministic overlaps — frontend-only, no backend or AI.

### Added

- **Multi Entity Temporal Axis (`temporalAxis.ts`)**
  - Three pure, deterministic functions: `computeAxisBounds`, `layoutBars`, `detectOverlaps`. No `Date()`, `random()`, `async`, or I/O. Reuses `compareTemporalRanges` as the single source of truth for interval relations.
- **Multi Entity Timeline (`MultiEntityTimeline.tsx`)**
  - Renders N entities as CSS-positioned bands on one shared year axis with fixed time-bucket ticks; overlap facts reuse the M7 comparison-text engine. No canvas/SVG; no sorting (input order + name dedupe only).

### Changed

- `frontend/src/data/compareTemporal.ts`: `numericValue` exported (was private) — behavior unchanged, enables M8 reuse.
- `App.tsx` / `App.css`: panel mounted after `TemporalComparisonPanel`; added `.multi-entity-*` styles reusing `--he-*` tokens.

### Freeze Compliance

- No backend / `exploration_engine.py` / `validation.py` / `navigation.ts` / Knowledge Model change.
- No AI / LLM / ranking / similarity / confidence / era inference. Forbidden-token business-logic hits: 0.
- Frontend tests: `220 passed` (29 files, +26 vs M7); `tsc --noEmit` 0 errors; `vite build` 0 errors (74 modules).

---

## [0.8.0] - 2026-07-20

Temporal Comparison Layer milestone (**M7**). Lets a user compare two entities' lifespans/periods on a shared axis and read a deterministic natural-language relation — frontend-only, no backend or AI.

### Added

- **Temporal Comparison Engine (`compareTemporal.ts`)**
  - Pure functions for comparing two temporal entities: `compareTemporalRanges`, `buildTemporalComparisonText`, `numericValue`. Fixed templates, no scoring/ranking/similarity.
- **Temporal Comparison Panel (`TemporalComparisonPanel.tsx`)**
  - Two entity selectors + A/B comparison on a shared year axis; renders the deterministic relation text. No re-sort, no recommender.

### Changed

- `App.tsx` / `App.css`: panel mounted; added `.temporal-comparison-*` styles reusing `--he-*` tokens.

### Freeze Compliance

- No backend / API / Knowledge Model change.
- No AI / LLM / ranking / similarity. Frontend-only.
- Regression gate green at release: frontend vitest passed; `tsc --noEmit` 0 errors; `vite build` 0 errors.

---

## [0.7.0] - 2026-07-20

Temporal Understanding Layer milestone (**M6**). Extends the deterministic understanding layer with temporal context and a structured timeline view — frontend-only, no backend or AI.

### Added

- **Temporal Utilities (`temporalUtils.ts`, `timelineUtils.ts`)**
  - Deterministic date/period formatting and timeline arithmetic helpers; pure functions, no `Date()`/`random()`/`async`.
- **Timeline Panel enhancement (`TimelinePanel.tsx`)**
  - Structured timeline rendering with temporal context injected from entity data.
- **Understanding layer temporal injection (`understandingRules.ts`, `InterpretationPanel.tsx`, `EntityPage.tsx`)**
  - Temporal context threaded into the existing deterministic "Historical Meaning" understanding flow.

### Changed

- `App.tsx` / `App.css`: timeline panel wired into entity views; added `.timeline-*` styles.

### Freeze Compliance

- No backend / API / Knowledge Model change.
- No AI / LLM / ranking / similarity. Frontend-only.
- Regression gate green at release: frontend vitest passed; `tsc --noEmit` 0 errors; `vite build` 0 errors.

---

## [0.6.0] - 2026-07-19

Historical Meaning Layer milestone (**M5-D**). Adds a deterministic, rule-based "Historical Meaning" layer that explains *why* a connection exists and *what it meant* — derived purely from existing relationship data (type + direction) via fixed templates, with no AI/LLM, no new dependencies, and no backend change. All changes are additive and freeze-safe; the frozen schema (8 entity types / 18 relationship types) and public API contract are preserved.

### Added

- **Historical Meaning Layer (M5-D)**
  - Understanding rule engine (`understandingRules.ts`): pure `filter`/`map`/`transform` + fixed templates with `{actor}`/`{target}`/`{type}` substitution, covering all 18 `RELATIONSHIP_TYPES` plus a guaranteed fallback. No scoring, ranking, similarity, or recommendation logic. Exposes `buildUnderstanding`, `buildUnderstandingsFromRelationships`, `buildUnderstandingsFromConnectionsExplained`.
  - InterpretationPanel enhancement: optional `understandings?` prop appends a "Historical Meaning" block (meaning + perspective tag) after the existing M5-A interpretation list. When absent/empty, behavior is 100% unchanged. No `navigation.ts` import.
  - EntityPage wiring: derives understandings from `entity.relationships` and passes them to InterpretationPanel.
  - Topic view wiring: derives understandings from `result.connections_explained` + a local `global_id→name` map; no new API endpoint, no backend contract change.

### Changed

- **Frontend**
  - `App.tsx`: additive `understandings` prop on the Topic-view InterpretationPanel, sourced from already-fetched `connections_explained` / `entities`.
  - `App.css`: appended `.he-meaning*` rules reusing existing `--he-*` design tokens; no existing class modified.

### Freeze Compliance

- No backend / `exploration_engine.py` / `validation.py` / `navigation.ts` / Knowledge Model change.
- No AI / LLM / Provider / Recommendation / score / similarity introduced.
- No new dependency (`package.json` / `requirements.txt` unchanged; only `version` / `APP_VERSION` bumped).
- Frontend tests: `127 passed` (22 files); backend: `115 passed`; `vite build` 0 errors; `tsc --noEmit` 0 errors.

---

## [0.5.0] - 2026-07-19

Cross-Topic Comparative Synthesis milestone (**M5-C**). Lets a user compare the current topic against the topics it connects to and jump straight into the bridging entities — using the already-present `cross_topic_related` data, with no ranking, scoring, or AI. All changes are additive and freeze-safe; the frozen schema (8 entity types / 18 relationship types) and public API contract are preserved.

### Added

- **Cross-Topic Comparative Synthesis (M5-C)**
  - Topic Comparison Panel (`TopicComparisonPanel.tsx`): on a Topic view (after *Continue Exploring*), presents the de-duplicated list of comparison-target topics from `cross_topic_related`, and — once a target is selected — the bridge entities that belong to it. Clicking a bridge node routes through the existing `openEntity` → `navigateTo`; clicking a target chip routes through `navigateTo`. Empty `cross_topic_related` renders a graceful empty state. No re-sort, no recommender, no score — engine/backend order preserved verbatim.
  - Comparison helper (`comparison.ts`): three pure filter/map/transform functions — `pickComparisonTargets` (de-dup preserving order), `deriveBridgedEntities` (filter by target topic), `extractTopicFromGlobalId` (parse the `namespace:id` global id). No scoring, ranking, similarity, or recommendation logic.

### Changed

- **Frontend**
  - `App.tsx`: additive mount of `TopicComparisonPanel` in the Topic view block (after `ContinueExploringPanel`); `key={result?.topic ?? current.topic}` forces a clean `selected` reset on topic switch (Phase 4.6 Freeze Hygiene).
  - `App.css`: appended `.he-comparison*` rules reusing existing `--he-*` design tokens; no existing class modified.

### Freeze Compliance

- No backend / `exploration_engine.py` / `navigation.ts` / Knowledge Model change.
- No AI / LLM / Provider / Recommendation / score / similarity introduced.
- No new dependency (`package.json` / `requirements.txt` unchanged; only `version` / `APP_VERSION` bumped).
- Frontend tests: `116 passed` (21 files); backend: `115 passed`; `vite build` 0 errors; `tsc --noEmit` 0 errors.

---

## [0.4.0] - 2026-07-19

Continuous Discovery milestone (**M5-B**). Turns a single exploration session into a continuous, self-directed journey. All changes are additive and freeze-safe; the frozen schema (8 entity types / 18 relationship types) and public API contract are preserved.

### Added

- **Continuous Discovery (M5-B)**
  - Continue Exploring panel (`ContinueExploringPanel.tsx`): re-presents the engine's already-ranked `connections_explained` as top-N next-step actions after a Topic/Entity view. Already-visited nodes are softened via the local `recent` store (no re-sort, no recommender, no score — engine order preserved verbatim).
  - Exploration Trail (`ExplorationTrail.tsx`): renders the full exploration footprint from `history`/`cursor`; clicking a past step reuses the existing `goTo` to jump back and continue. Uses a local `TrailNode` type (no `navigation.ts` import).
  - Dead-end fallback (B-3): when direct connections are sparse, the panel falls back to `cross_topic_related` / `related_topics` so discovery never dead-ends.

### Changed

- **Frontend**
  - `App.tsx`: additive mount of `ContinueExploringPanel` (topic + entity views) and `ExplorationTrail` (after `HistoryBar`); `seenGlobalIds` derived from `recentStore` for seen-aware softening.
  - `App.css`: appended `.he-continue*` / `.he-trail*` rules reusing existing `--he-*` design tokens; no existing class modified.

### Freeze Compliance

- No backend / `exploration_engine.py` / `navigation.ts` / Knowledge Model change.
- No AI / LLM / Provider / Recommendation / score introduced.
- No new dependency (`package.json` / `requirements.txt` unchanged).
- Frontend tests: `107 passed` (19 files); backend: `115 passed`; `vite build` 0 errors; `tsc --noEmit` 0 errors.

---

## [0.3.0] - 2026-07-18

Discovery & Onboarding milestone (**M5-A**). The entry journey a first-time user takes from landing to a connected, interpretable exploration session. All changes are additive and freeze-safe.

### Added

- **A-1 Topic Catalog API** — `GET /topics` returning `{topic,title,summary}`, mounted under both `/api/v1` and the legacy route (`v1 == legacy`).
- **A-2 Landing Catalog** — curated landing page topic grid with loading/empty/error states, single navigation path.
- **A-3 Featured Topics** — editorial "Start here" strip (4 real topic slugs) derived as a filtered view of the catalog.
- **A-4 First Exploration Guide** — presentational nudge on the topic page with 3 real, grounded starters; session-only dismissible.
- **A-5 Entity Exploration Guide** — entity-level exploration starters in a frozen-safe dedicated component.
- **A-6 Interpretation Layer** — rule-based "why these connections are worth exploring" panel rendering the backend's verbatim `explanation`; ordered after Connections Explained (WHAT → WHY → HOW). The old "future AI layer" placeholder was deleted.

### Freeze Compliance

- No change to `exploration_engine.py`, `navigation.ts`, Knowledge Model, or backend core.
- No AI / LLM / Provider / Prompt introduced.
- No new dependency (`package.json` / `requirements.txt` unchanged).
- Frontend tests: `97 passed` (17 files); backend: `115 passed`; `vite build` 0 errors.

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
