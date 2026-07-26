# History Explorer

## Global History Exploration Platform

Explore History. Discover Civilization.


## Overview

History Explorer is a global history exploration platform.

The project aims to transform history learning from passive information searching into active exploration and discovery.

> **M2 note:** The M2 build is **data-driven and deterministic** — no AI runtime is active. AI is a documented future capability (the `InterpretationPanel` is the deterministic interpretation layer; an AI runtime is **not implemented**). The exploration graph (entities + id-based relationships + structured time) is the explicitly reserved input for a future AI / Knowledge-Graph layer.

By connecting historical **events, people, civilizations, locations, and time periods** through typed relationships, History Explorer helps users understand how history is connected.


## Vision

Traditional history products usually provide isolated information.

History Explorer focuses on connections:

- Events
- People
- Civilizations
- Locations
- Time periods

The goal is to help users explore:

- What happened?
- Why did it happen?
- What happened elsewhere at the same time?
- How are historical events connected?


## Product Philosophy

Explore First.

Connect Knowledge.

Understand History.

Discover Civilization.


## Project Status

Current milestone:

**M13 — Multi Entity Reasoning Foundation: COMPLETED**

Latest releases (dual-track versioning):

- **Runtime Version: v0.13.0** (2026-07-22)
- **Project Release: vM25.1** (2026-07-26) — Dataset Provider Layer (M25.1): backend additive layer over M24 — `backend/app/core/dataset_provider.py` adds `DatasetProvider` (composition over `TopicRepository`, read-only facade; `DatasetManifest` frozen 9-field identity descriptor with `provenance_policy="human-curated"`, no lifecycle fields; `SourceLoader` / `EmptySourceLoader.load() → []`, no AI-generated sources) and `backend/app/core/dataset_validator.py` adds `DatasetValidator` (orchestration only, reuses the single frozen `app.validation.build_validation_report`; `DatasetValidationReport` frozen). Tests: `backend/tests/test_dataset_provider.py` (10) + `backend/tests/test_dataset_validator.py` (3). `scripts/freeze-check.mjs` allowlist extended 2 → 6 (M25.1 four new files added; M24 entries retained). `main.py` unchanged — provider is not wired into any runtime path (E1 deferred to M26); no new dependency / AI / LLM / DB. Backend 181 passed (+13), runtime stays `0.13.0` (non-runtime release)
- **Project Release: vM24** (2026-07-26) — Data Foundation (Minimal Dataset Layer) + Freeze Guard allowlist mode (M24): backend additive foundation release approved via the Architecture Freeze Gate. `backend/app/core/dataset.py` adds `DatasetMetadataProvider` — derives a stable curated-dataset identity (`dataset_id = curated-history-graph` + canonical deterministic `content_hash` sha256) from EXISTING topic content via `TopicRepository`; the hash sorts topic / entity / relationship / timeline, so it is JSON-key/array-order independent; no new storage, no `repository.py` / API / runtime change; `backend/tests/test_dataset_metadata.py` (6 tests: hash stability, order independence, content sensitivity, provider compatibility, determinism, zero repo side effects). `scripts/freeze-check.mjs` scope guard upgraded from frontend-only to explicit allowlist mode (DEFAULT — backend / frontend fully frozen; only `backend/app/core/dataset.py` + `backend/tests/test_dataset_metadata.py` allowed; revokes the M11 ADR-0003 scope exception for `ai_gateway/` + `main.py`; TOKEN / DEP governance retained). Frontend unchanged, backend 168 passed (+6), runtime stays `0.13.0` (non-runtime release)
- **Project Release: vM23** (2026-07-25) — Timeline Zoom/Pan + Entity Comparison Table + Insight CSV Export (M23): pure-frontend additive over the M17–M22 insight views — `frontend/src/data/insightExport.ts` adds `serializeInsightReportAsCsv` (deterministic RFC-4180 CSV of the SAME insight view already rendered by the panel: entities / type counts / relationship matrix / timeline band; no timestamps / randomness / network / upload). `RelationshipInsightPanel` adds (A1) an SVG multi-entity timeline with VIEW-ONLY zoom/pan controls (放大/缩小/左移/右移/重置视图) that only transform SVG coordinates — `buildMultiEntityTimelineBand` is never recomputed; (A2) a read-only entity comparison table aggregating M16–M19 metrics per entity (centrality degree / distinct relationship-type count / timeline bounds / overlap count); (A3) local-only "复制 CSV 报告" + "下载 CSV" buttons via `navigator.clipboard` (with execCommand fallback) and a Blob download — no upload, no third-party service. `relationshipUtils` / `App.tsx` / AI pipeline / backend untouched. Backend unchanged, runtime stays `0.13.0` (non-runtime release)
- **Project Release: vM22** (2026-07-26) — Insight Share / Copy Enhancement + RelationshipPathGraph Layout Toggle (M22): pure-frontend additive. `frontend/src/data/insightExport.ts` adds `serializeInsightReportAsMarkdown` (deterministic Markdown of the existing insight view — no timestamps / randomness / privacy / network) and `serializeRelationshipPathsAsText` (plain-text `A — rel → B` chain over EXISTING M20 path edges). `RelationshipInsightPanel` adds local-only "复制 Markdown 报告" + "复制关系路径文本" buttons via `navigator.clipboard` (with a `document.execCommand` fallback and a success / failure status; no upload, no third-party service). `RelationshipPathGraph` adds a layout toggle (Horizontal Chain / Compact Grid) that only changes SVG coordinates — data, `findRelationshipPaths`, and edges are untouched. Backend unchanged, runtime stays `0.13.0` (non-runtime release)
- **Project Release: vM21** (2026-07-25) — Relationship Path Graph Visualization (M21): pure-frontend additive SVG visualization over the M20 Connectivity Explorer — new `frontend/src/components/RelationshipPathGraph.tsx` (PURE VIEW: receives the already-computed `RelationshipPath[]` from M20 `findRelationshipPaths`, renders node + edge SVG chains over EXISTING edges only, hover highlights a single path, empty state "No relationship path available"; no edge creation / reversal / inference / causal reasoning / fetch / AI). `RelationshipInsightPanel` embeds the graph inside the M20 Relationship Connectivity Explorer block (additive; the text path chain is kept). `relationshipUtils` / `App.tsx` / AI pipeline untouched. Backend unchanged, runtime stays `0.13.0` (non-runtime release)
- **Project Release: vM20** (2026-07-25) — Relationship Connectivity Explorer (M20): pure-frontend additive path-exploration over the M17–M19 insight views — `relationshipUtils` adds `findRelationshipPaths` (bounded DFS over EXISTING edges only, `maxHops` default 3, returns `[{ nodes, edges }]`, never invents/infers/implies a relationship, input not mutated). `RelationshipInsightPanel` adds one `<details>` block — Relationship Connectivity Explorer (two view-only `<select>` source/target entity controls + a max-hops control; renders `node —relation→ node` chains over existing edges; shows a clear notice when no path exists among loaded edges; disclaimer states it only visualises already-present edges, no causal words). `App.tsx` already wires `exploreNameByGlobalId` (M19) into the panel, so no change; `grounded_answer` / `/api/v1/ai/explain` / `multiEntityContext()` untouched. Backend unchanged, runtime stays `0.13.0` (non-runtime release)

Engineering status:

**Stable.** Deterministic exploration foundation established; CI, Engineering Playbook, version single-source, and freeze-check guard active.


Completed (M1 Foundation Validation):

- Product Foundation (PRD, Product DNA, Product Constitution)
- Architecture Foundation (Technical Architecture, frozen)
- Knowledge Model Prototype (generic entity / relationship / timeline)
- Exploration UI Prototype (React 18 + TypeScript + Vite)
- API Prototype (FastAPI)
- Test Baseline (pytest + vitest)


Completed (M2 Exploration MVP):

- **Knowledge Model v2** — 7 active entity types, structured time, `global_id`, relationship metadata `citation` (`data/schemas/exploration_schema.md`).
- **Cross-dataset Search** — `GET /search` (ranked: exact → alias → contains; in-memory index, no engine).
- **Entity Pages** — `GET /entity/{id}` (local id or `global_id`; 404 otherwise).
- **Navigation Shell** — breadcrumb, back/forward history, recent explorations (localStorage), loading/empty/error states.
- **Exploration Loop closed** — relationships and timeline events are clickable; Topic → Entity → Relationship → Timeline → Back → Recent → Search Again all work.
- **Data Quality & Validation** — startup schema / cross-reference / duplicate / relationship-consistency / health checks via `GET /health` (`backend/app/validation.py`); warnings only, never crashes.
- **Tests** — backend pytest **50 passed**, frontend vitest **38 passed**, `npm run build` **51 modules, 0 errors**.


Completed (M3 – M8.6 — deterministic foundation):

- **M3 Knowledge Core** — repository / registry / graph / search / timeline / exploration_service; composition root in `main.py`.
- **M3.5 Schema Freeze + Global Graph + Exploration Engine + Five-Zone UI** — `core/global_graph.py`, deterministic four-dimensional weighted engine (static, explainable, no ML), cross-topic edges, real-data UI (Related / Explained / Paths / Timeline / Themes). *Established the Current Architecture Freeze Baseline.*
- **M4 Data Scale & Quality + Architecture** — 8 topics / 69 entities / 104 relations / 31 cross-topic edges / 0 warnings.
- **M5 AI-Readiness Gating** — concluded AI layer deferred (data / retrieval / flow / readiness not yet met).
- **M6 Temporal Understanding Layer (v0.7.0)** — time understanding & comparison.
- **M7 (v0.8.0)**.
- **M8 Multi-Entity Temporal Visualization (v0.9.0)**.
- **M8.6 Release & Engineering Foundation (v0.10.0)** — CI, `ENGINEERING_PLAYBOOK.md`, version single-source, `scripts/freeze-check.mjs` (Freeze Baseline guard).

- **M9 Exploration Flow Enhancement (v0.11.0 – v0.13.0)** — deterministic, explainable exploration-flow upgrades; all three milestones are **frontend/backend additive, zero-freeze-touch, no AI runtime** (the frozen deterministic engine is reused):
  - **M9-001 Deterministic Next-Node Recommendation Engine (v0.11.0)** — backend `GET /entity/{id}/recommendations` reusing the frozen four-dimensional scoring; explainable, no AI runtime.
  - **M9-002 RecommendationPanel (v0.12.0)** — frontend panel surfacing the recommendation with its `reasons` (why) and `relation_path`.
  - **M9-003 Exploration Journey Panel (v0.13.0)** — frontend panel annotating each exploration stop with *why it was reached* (captured when following a recommendation); pure consumer of App navigation history, owns no navigation state.


Deferred (explicitly NOT in M2 — recorded as debt for M3+):

**Completed since M2 (no longer deferred):**
- CI — **Completed in M8.6** (`.github/workflows/ci.yml`: frontend + backend + freeze-check jobs).
- API versioning (`/api/v1`) + unified error envelope — **Completed in M3** (`M3-002` dual-mounted `/api/v1` alongside legacy routes).
- `CHANGELOG.md` — **Completed in M8.6** (covers v0.1.0 → v0.13.0).

**Still deferred (within Current Architecture Freeze Baseline):**
- Docker / observability
- Knowledge Graph database (Neo4j) / GIS Map / AI Historian / Search Engine — Future capabilities gated by the Freeze Revision Gate (see `docs/10_ARCHITECTURE/CURRENT_ARCHITECTURE_BASELINE.md`).
- `TECHNICAL_DEBT.md` (M2 status captured in `M2_Planning.md` + the M2 Final Report)


## Documentation

**Documentation Map (start here):** [`docs/INDEX.md`](docs/INDEX.md) — layered doc system, owners, and freshness.

Important documents:

- Product Vision (mirror): `PRD.md` (source: `History_Explorer_PRD_完整版_v1.0.docx`)
- `Product_DNA.md` · `Product_Constitution.md` · `PROJECT_CONTEXT.md` · `PROJECT_ROADMAP.md`
- Architecture Documents · Team Operating Specification (v1.2 Frozen): docs/TEAM_OPERATING_SPEC_v1.2.md


## Team Operating Specification

Current team specification: **v1.2 (Frozen)** — 2026-07-17.

- Specification document: [`docs/TEAM_OPERATING_SPEC_v1.2.md`](docs/TEAM_OPERATING_SPEC_v1.2.md)
- **All subsequent development follows this specification.** It is the single source of truth for team organization, roles, checkpoint workflow, decision authority, and the Project Knowledge Base (Repository Memory).
- Any change to the specification follows its §14 Specification Versioning (Patch / Minor / Major).


## Development Principles

This project follows:

- Documentation before implementation.
- Clear tasks before development.
- Incremental development.
- Git-based traceability.
- Long-term maintainability.


## AI Collaboration

AI Agents are used as development assistants.

All AI Agents must:

- Read PROJECT_CONTEXT.md first.
- Follow assigned tasks.
- Avoid changing product direction.
- Commit and push changes.
- Report completed work clearly.


## License

To be determined.
