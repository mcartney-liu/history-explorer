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
- **Project Release: vM43** (2026-07-28) - Product Validation Layer (M43): validation infrastructure over vM42 — `UIAudit.ts` (page section audit model with userGoal + successMetric per section, 12 sections across 2 pages), `UserJourney.ts` (3 funnel path maps: Discovery/Exploration/Research, 13 nodes with blockers + missing guidance), `UserBehaviorEvent.ts` (localStorage behavior telemetry: 13 domain-neutral action types, analysis helpers: frequency/entities/duration/tabs), and `ExplorationFunnelAnalysis.ts` (3 funnel metrics with conversion rates + bottleneck detection from event data). M43 pivots from "build more features" to "measure what users do" — all modules are data-only, tree-shaken from production. Zero UI changes, zero backend changes. `scripts/freeze-check.mjs` SCOPE_ALLOWLIST extended (+6 M43 entries). Invariants: ENTITY_TYPES=8 / RELATIONSHIP_TYPES=18 untouched; runtime `0.13.0`. Backend **247 passed**; frontend **793 passed** (+36 vs vM42); freeze-check EXIT 0.
- **Project Release: vM42** (2026-07-28) - Product Foundation Upgrade (M42): platform shell refactoring over vM41 — `EntityPageShell.tsx` (5-tab navigation: 了解/探索/研究/分析/扩展, localStorage tab persistence), `EntityPage.tsx` reorganization (12 panels distributed across tabs, scroll-free UI), `DiscoverPage.tsx` activation (recent researches from ResearchHistory, interest profile from UserInterestProfile, 6 entity-type exploration cards), `ResearchInsights.ts` extension (UserInterestProfile: 7 fields — entity type frequency, dimension ranking, themes, recently explored, comparison pairs, active days, bookmark categories), and `KnowledgeCoverage.ts` (internal data quality utility: per-type coverage metrics + warning system, tree-shaken from production). All M36-M41 panels preserved — zero loss. `scripts/freeze-check.mjs` SCOPE_ALLOWLIST extended (+6 M42 entries). Invariants: ENTITY_TYPES=8 / RELATIONSHIP_TYPES=18 untouched; runtime `0.13.0`; zero new dependencies. Backend **247 passed**; frontend **757 passed** (+31 vs vM41); freeze-check EXIT 0.
- **Project Release: vM41** (2026-07-28) - Research Intelligence (M41): additive discovery intelligence over vM40 — `ResearchPlanner.ts` (deterministic recommendation engine with 5 priority rules: causal → history → comparison → related → similar, no AI calls), `ResearchRecommendationCard.tsx` (explainable suggestion card with 5 reason types + suggested dimensions), `ResearchDiscoveryPanel.tsx` (entity context-driven discovery section mounted before ResearchPanel on EntityPage), and `ResearchInsights.ts` (deterministic analytics: entity type frequency, dimension frequency, relationship interests, theme mapping from research history). M41 introduces proactive exploration guidance while preserving Grounding First architecture — zero AI planner, zero memory, zero backend changes. `scripts/freeze-check.mjs` SCOPE_ALLOWLIST extended (+6 M41 entries). Invariants: ENTITY_TYPES=8 / RELATIONSHIP_TYPES=18 untouched; runtime `0.13.0`; zero new dependencies. Backend **247 passed**; frontend **726 passed** (+31 vs vM40); freeze-check EXIT 0.
- **Project Release: vM40** (2026-07-27) - Research Persistence (M40): additive research persistence over vM39 — `ResearchHistory.ts` (localStorage CRUD with versioned schema: save/load/list/delete/update), `ResearchBookmarkButton.tsx` (star toggle + label display), `ResearchLibrary.tsx` (saved research list with entity name/type, dimension/citation counts, relative timestamps, open/delete actions), and `ResearchPanel.tsx` restore workflow (restored mode with badge, restoreResearch pure data mapper — zero AI re-calls). `EntityPage.tsx` mounts ResearchLibrary for all entities. All existing AI via explainAI — zero AI Gateway / backend / schema changes. `scripts/freeze-check.mjs` SCOPE_ALLOWLIST extended (+6 M40 entries). Invariants: ENTITY_TYPES=8 / RELATIONSHIP_TYPES=18 untouched; runtime `0.13.0`; zero new dependencies. Backend **247 passed**; frontend **695 passed** (+23 vs vM39); freeze-check EXIT 0.
- **Project Release: vM39** (2026-07-27) - Research Intelligence (M39): additive research workflow over vM37 — `ResearchPanel.tsx` (frontend research orchestrator with Promise.all parallel explainAI, progress indicator, context badge, 7 entity-type specific research templates), `ResearchDimensionCard.tsx` (per-dimension GroundedAnswer display with grounded badge + citation count), and `ResearchReport.tsx` (structured historical report with executive summary, key findings, unique citation aggregation, and dimension coverage matrix). All AI via existing explainAI — zero AI Gateway / backend / schema changes. `scripts/freeze-check.mjs` SCOPE_ALLOWLIST extended (+6 M38 entries). Invariants: ENTITY_TYPES=8 / RELATIONSHIP_TYPES=18 untouched; runtime `0.13.0`; zero new dependencies; Grounding First maintained. Backend **247 passed**; frontend **658 passed** (+23 vs vM37); freeze-check EXIT 0.
- **Project Release: vM37** (2026-07-27) - AI Historian Interaction Layer (M37): additive conversational exploration over vM36.2 — `HistorianChat.tsx` (Grounding First conversational AI with context badge, suggested questions per entity type, follow-up input, and chat history — all frontend-only state, no backend session) and `JourneyCard.tsx` (relationship-driven exploration recommendations with priority sorting: caused > before > after > influenced > participated_in, capped at 6 cards, pure frontend data from entity.relationships). `EntityPage.tsx` mounts both for all entity types. All AI reused from M36.0 explainAI — zero AI Gateway / backend / schema changes. `scripts/freeze-check.mjs` SCOPE_ALLOWLIST extended (+4 M37 entries). Invariants: ENTITY_TYPES=8 / RELATIONSHIP_TYPES=18 untouched; runtime `0.13.0`; zero new dependencies; no conversation memory. Backend **247 passed**; frontend **635 passed** (+18 vs vM36.2); freeze-check EXIT 0.
- **Project Release: vM36.2** (2026-07-27) - Historical Narrative Layer (M36.2): additive narrative intelligence over vM36.1 — `EventNarrativeCard` (AI-powered history narrative with 3 pre-set modes: historical_impact / why_happened / multi_civilization_view) and `EventNarrativeJourney` (cross-topic event exploration path with causal/temporal ordering, topic badges, and global_id routing), both mounted on `EntityPage.tsx` behind `entity.type === 'Event'` guard. All AI reused from M36.0 — zero AI Gateway / backend / schema changes. `scripts/freeze-check.mjs` SCOPE_ALLOWLIST extended (+4 M36.2 entries). Invariants: ENTITY_TYPES=8 / RELATIONSHIP_TYPES=18 untouched; runtime `0.13.0`; zero new dependencies. Backend **247 passed**; frontend **617 passed** (+18 vs vM36.1); freeze-check EXIT 0.
- **Project Release: vM36.1** (2026-07-27) - Event Intelligence Layer (M36.1): additive Event causal chain enrichment over vM36.0 — `data/examples/roman_empire_example.json` (+3 Events, +7 Event→Event relationships forming Republic→Empire→Pax Romana→Fall chain) and `data/examples/hellenistic_world_example.json` (+2 Events, +6 Event→Event relationships forming Alexander's Conquest→Gaugamela→Alexandria→Diadochi chain). Frontend: `EventCausalChain.tsx` (incoming/outgoing/temporal directed chain view) and `EventImpactPanel.tsx` (long-term impact grouped by entity type), mounted on `EntityPage.tsx` behind `entity.type === 'Event'` guard. `scripts/freeze-check.mjs` SCOPE_ALLOWLIST extended (+7 M36.1 entries). Invariants: no backend core / schema / validation / AI Gateway / enum change; ENTITY_TYPES=8 / RELATIONSHIP_TYPES=18 untouched; runtime stays `0.13.0`; zero new dependencies. Backend **247 passed**; frontend **599 passed** (+15 vs vM36.0); freeze-check EXIT 0.
- **Project Release: vM36.0** (2026-07-27) - AI Interpretation Layer Activation (M36.0): grounded AI interpretation with 2-hop context expansion, 6 prompt modes (explain / why_important / why_happened / historical_impact / multi_civilization_view / timeline_explanation), and an upgraded response contract (perspectives / evidence / confidence). The AI layer is read-only — it never writes to the deterministic graph. Frontend gains mode chips, permanent disclaimer, and a deterministic fallback UI block. `scripts/freeze-check.mjs` SCOPE_ALLOWLIST extended (12 precise file entries). Invariants: no backend core / schema / validation / registry / data change; ENTITY_TYPES=8 / RELATIONSHIP_TYPES=18 untouched; runtime stays `0.13.0`; zero new dependencies. Backend **232 passed** (+13); frontend **584 passed** (+10); freeze-check EXIT 0; consistency 7/7.
- **Project Release: vM35.1.1** (2026-07-27) - Narrative Consistency Patch (M35.1): a pure-frontend additive fix over vM35.1 restoring StorySection/WhyImportantPanel consistency (U1 Topic mount + U2 Search global_id normalization); no backend / data / schema / runtime change., admitted via the Frontend Freeze Revision Gate (same mechanism as M30-A/M30-B/M34). Adds `pages/DiscoverPage.tsx` (static discover landing with curated topic entries, no new API), a static narrative layer `components/exploration/StorySection.tsx` + `WhyImportantPanel.tsx` sourced from hand-curated `data/narrative.ts` (NO AI generation), `components/journey/JourneyPanel.tsx` + `lib/journey.ts` (localStorage-only exploration trace, nothing uploaded), and `components/FeedbackWidget.tsx` (no-op/localStorage feedback capture). `App.tsx` / `EntityPage.tsx` gain mount points only. Includes **M35 Release Quality Corrections** (release-quality fixes, NOT feature scope): `.github/workflows/ci.yml` frontend job switched `npm ci` → `npm install` (lockfile is gitignored) with corrected `cache-dependency-path`; `data/examples/roman_empire_example.json` removes the duplicated `Byzantium` alias from `civ-byzantine` (kept on `loc-constantinople`), eliminating the `DUPLICATE_ALIAS` warning; `backend/tests/test_search_index.py` assertion updated to the legitimately-enriched `person-augustus.location == "Roman Italy"` (PO-approved single-file Freeze Revision Gate, registered in `scripts/freeze-check.mjs` SCOPE_ALLOWLIST). Invariants: no new feature, no `backend/app` change, no schema change, ENTITY_TYPES=8 / RELATIONSHIP_TYPES=18 untouched, zero new dependency, runtime stays `0.13.0`. Backend **219 passed**; frontend **569 passed** (+29); freeze-check EXIT 0; governance tests **9/9**.
- **Project Release: vM34.1** (2026-07-27) - Exploration UX Hardening + Knowledge Graph Visualization MVP (M34): a pure-frontend additive release over M33 A-1.5. A1 extracts `AppShell` (hero + semantic `<nav class="nav-shell">`) and `EntityHeader` out of the `App.tsx` / `EntityPage.tsx` monolith, hoisting duplicated navigation callbacks into single named handlers (`openNode` / `openNodeNamed`) - fixes TD-1 (duplicated rendering) and TD-nav (no navigation shell). A2 adds `lib/graphLayout.ts` (deterministic radial layout; hard MVP caps nodes <=30 / edges <=60) and `components/GraphViewPanel.tsx` (self-drawn SVG, zero new dependency, node colors from the 8 frozen entity types, edge labels from the 18 frozen relationship types), reusing the already-fetched `/explore` + `/entity` relationship data with no new API. A3 adds `docs/product/M34-A3_Civilization_Expansion_Strategy.md` (strategy only). `scripts/freeze-check.mjs` SCOPE_ALLOWLIST extended with the ten M34-A1/A2 frontend paths (`EntityPage.tsx` already allowlisted). No backend / data / schema / validation / registry / runtime change; runtime stays `0.13.0`; no new dependency / AI / LLM. Frontend **540 passed** (+22); freeze-check EXIT 0; governance tests **9/9**.
- **Project Release: vM33.1.1** (2026-07-26) - Source Governance Stabilization Migration (M33 A-1.5): a data-only governance fix over vM33.1 that brings the Knowledge Production Pipeline to "Governance Complete Gold". `data/sources.json` backfills a frozen `tier` field on 12 previously missing-tier sources (distribution primary 18 / academic 13 / reference 8 / missing 0) and `data/evidence_claims.json` corrects 3 source references (`ec-002` herodotus->arthashastra with `source_ids [arthashastra, strabo]`; `ec-023`->thapar-early-india; `ec-rom-027`->iranica-rome). Gold Gate (G1 Source / G2 Wikipedia / G3 Registry / G4 Vocabulary) + Greek Checklist (C1-C5) all pass; 39 sources, 64 claims, missing-tier count 0. No backend / frontend / schema / validation / registry / runtime change; runtime stays `0.13.0`; no AI / LLM / new dependency.
- **Project Release: vM33.1** (2026-07-27) - Knowledge Model Expansion (M31) + Roman Gold Dataset (M33 A-1), released as two independent commits/tags on one feature branch: M31 enriches `data/examples/ancient_india_example.json` (geo / language / external_refs) and adds 4 India curated sources (`src-arthashastra`, `src-tipitaka`, `src-thapar-early-india`, `src-aryabhatiya`) + 14 legacy claims (`ec-011`-`ec-024`), with `scripts/freeze-check.mjs` allowlist extended (M31 Pilot); M33 A-1 adds `data/examples/roman_empire_example.json` + 40 Roman claims (`ec-rom-001`-`ec-rom-040`) + 27 Roman curated sources. Both data-only: no backend / frontend / schema / validation / registry / runtime change; runtime stays `0.13.0`; no AI / LLM / new dependency.
- **Project Release: vM30.2** (2026-07-26) — Frontend Exploration Flow Closure (M30-B): a pure-frontend additive layer that closes the entity-exploration loop — Entity → Relationship → Evidence → Source → Historical Context. Added `frontend/src/components/RelationshipEvidence.tsx` (5-state container+view that reuses `ProvenancePanelView` to render provenance records by LOCAL id; no new API) + `frontend/src/components/RelationshipEvidence.test.tsx` (5-state + local-id contract test) + `frontend/src/components/ExplorationFlowGuide.tsx` (static 4-step guide, no state) + `frontend/src/components/ExplorationFlowGuide.test.tsx`. `RelationshipView.tsx` adds a lazy "查看依据" button (class `rel-evidence-btn`) that mounts `RelationshipEvidence` only on click — it never fetches evidence for every relationship by default. `EntityPage.tsx` mounts `<ExplorationFlowGuide />` (additive; the existing `EntityExplorationGuide` is untouched). `ProvenancePanel.tsx` now groups records by `source_id` on the frontend (no new field, no `claim_text` / `confidence`, `subject_id` still hidden). `scripts/freeze-check.mjs` allowlist extended 21 → 26 (the five M30-B frontend files added). No backend / data / schema / validation / registry change; runtime stays `0.13.0`; no new API; no new fact; no new dependency / AI / LLM. Frontend **518 passed** (+8); freeze-check EXIT 0; governance tests **9/9**.
- **Project Release: vM30.1** (2026-07-26) — Frontend Provenance Exploration Panel (M30-A): a pure-frontend additive layer that surfaces the M29.1 runtime provenance projection (`GET /provenance/{entity_id}`) inside the Entity Page. Added `frontend/src/data/provenanceApi.ts` (HTTP-only client; `ProvenanceDisabledError` raised on 404) + `frontend/src/components/ProvenancePanel.tsx` (5-state container+view — loading / success / empty / disabled / error; a 404 → friendly disabled state, never a hard error; shows Source / Claim / Reference only; `AbortController` aborts the fetch on unmount). `EntityPage.tsx` mounts `<ProvenancePanel entityId={entity.id} />` right after the relationship cluster, passing the **local id** (the backend indexes provenance by local id per ADR-006, NOT the `global_id` — this contract fix is the key correctness change). Tests: `provenanceApi.test.ts` (5) + `ProvenancePanel.test.tsx` (5). `scripts/freeze-check.mjs` allowlist extended 16 → 21 (the five M30-A frontend files added). No backend / data / schema / validation / registry change; runtime stays `0.13.0`; no new dependency / AI / LLM. Frontend **510 passed** (+10); freeze-check EXIT 0; governance tests **9/9**.
- **Project Release: vM29.1** (2026-07-26) — Runtime Provenance Projection Activation (M29.1): activated the runtime provenance projection (ADR-006 Read Model). `backend/app/core/provenance_index.py` (new) builds a `ProvenanceIndex` read model from the DatasetProvider (Source Registry + Evidence Claim layers); wired into `main.py` composition root behind the `PROVENANCE_PROJECTION` feature flag (default true; `false` → no projection, `GET /provenance` returns 404, runtime falls back to the vM27.1 behaviour). Added `GET /provenance/{entity_id}` (dual-mounted `/api/v1` + legacy) returning provenance records for an entity (empty array when none); 404 when the flag is off. No merge into the `/entity` response (Option B); no data / schema / validation / registry / frontend change. Runtime stays `0.13.0`; no new dependency / AI / LLM / DB. Tests: `backend/tests/test_provenance_index.py` (9) + `backend/tests/test_provenance_api.py` (5); `scripts/freeze-check.mjs` allowlist extended 12 → 16.

- **Project Release: vM27.1** (2026-07-26) — Provenance Coverage Expansion (M27.1): a curated provenance-data expansion over M26.1. Source Registry curated sources expanded (3 → 8) and Evidence Claim coverage expanded (2 → 10); added human-curated provenance records for additional historical entities and relationships. No API / frontend / runtime change; runtime stays `0.13.0`; DatasetProvider Runtime Activation (E2) remains deferred.
- **Project Release: vM26.1** (2026-07-26) — Dataset Source Registry + Evidence Claim Boundary (M26.1): backend additive provenance layer over M25.1 — approved via the Architecture Freeze Gate. `backend/app/core/source_registry.py` adds `SourceRegistry` (human-curated provenance sources referenced by `source_id`; `SourceRecordV1` extends `SourceRecord` with `publisher_or_archive`; `FileSourceLoader` reads `data/sources.json`, returns `[]` when absent; sources are an independent curated layer, NOT graph nodes, no AI-generated sources) and `backend/app/core/evidence_claim.py` adds `EvidenceClaim` (typed record linking a subject entity/relationship to a curated source via `source_id`; `FileEvidenceClaimLoader` reads `data/evidence_claims.json`; independent curated layer, does NOT modify `data/examples`). `dataset_provider.py` adds `load_evidence_claims()` + wires `FileSourceLoader` (graceful `[]` when files absent); `dataset_validator.py` adds `validate_source_registry()` + `validate_evidence_claims()` (orchestration only, reuses `app.validation.build_validation_report`). Tests: `backend/tests/test_source_registry.py` (12) + `backend/tests/test_evidence_claim.py` (12). `scripts/freeze-check.mjs` allowlist extended 6 → 12 (M26.1 six new files added; M24/M25.1 entries retained). `main.py` unchanged — provider still not wired into any runtime path (E1/E2 deferred); no new dependency / AI / LLM / DB. Backend 205 passed (+24), runtime stays `0.13.0` (non-runtime release)
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
