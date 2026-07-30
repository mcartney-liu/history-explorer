# History Explorer - Project Context (Current Reality)

Version: 1.1
Status: Active

> **Team Operating Specification:** `Team Operating Specification v1.2 (Frozen)` is the single team norm. All development follows [`docs/TEAM_OPERATING_SPEC_v1.2.md`](docs/TEAM_OPERATING_SPEC_v1.2.md). Changes via its Section 14 Versioning.

# 1. Project Identity

History Explorer（历史探索）- an AI-powered global history exploration platform.

It combines Knowledge Graph, Timeline, Spatial Exploration, and AI interpretation to help users explore, connect, and understand human history.

# 2. Product Position

History Explorer is NOT:

- A traditional encyclopedia.
- A digital history book.
- A simple search engine.
- A general AI chatbot.

History Explorer IS:

An exploration engine for historical knowledge.

The core experience is:

Explore -> Connect -> Understand -> Discover

# 3. Mission

The mission of History Explorer is:

To transform history learning from passive information searching into active exploration and discovery.

The product helps users understand:

- What happened?
- Why did it happen?
- What happened elsewhere at the same time?
- How are historical events connected?

# 4. Core Principles

- **Explore First** - discover through exploration, not only search.
- **Everything Is Connected** - meaningful relationships among events / people / civilizations / places / periods.
- **Graph-first (presentation)** - relationships shown with priority.
- **AI As Interpretation & Guidance Layer** - does not replace sources or verification.
- **Long-term Scalability** - architecture and docs support continuous growth.

# 5. Current State (Runtime v0.13.0 / Project Release vM66 / M66)

Released (runtime): **v0.13.0** (M9-003, 2026-07-22). Latest project release: **vM66** (M66, 2026-07-31) — Exploration Intelligence Convergence: surfaces the M43–M53 dark-pipeline intelligence as a user-visible, non-AI exploration-context capability. A deterministic local analysis bridge (companion context bridge) narrow-projects `ProductUsageAnalysis` output into `ExplorationContextIntelligence` and renders it via `ExplorationInsightPanel` — delivering intelligence visibility without user profiling, scoring, recommendation, or AI reasoning. Pure frontend — zero backend / schema / AI Gateway / dependency change, backend diff = 0. Invariants: ENTITY_TYPES=8 / RELATIONSHIP_TYPES=18 untouched; runtime stays `0.13.0`; zero new dependencies. freeze-check EXIT 0; visual-check EXIT 0; tsc EXIT 0; consistency 7/7; 967 tests passed (110 files). Prior project release: **vM65** (M65, 2026-07-31) — Companion AI Foundation & Graph Governance: companion-centric AI model decision (ADR-0007), Companion Shell visual baseline within the Exploration Space architecture using Design System tokens only (zero hardcoded color), graph visualization components governance improvement with `entityColors.ts` single source of truth (zero hardcoded hex), real AI call-chain test coverage plus a CompanionContext `SET_ERROR` reducer production fix, and a Workspace Rail overflow + accessibility fix. Pure frontend — zero backend / schema / AI Gateway / dependency change, backend diff = 0. Invariants: ENTITY_TYPES=8 / RELATIONSHIP_TYPES=18 untouched; runtime stays `0.13.0`; zero new dependencies. freeze-check EXIT 0; visual-check EXIT 0; consistency 7/7; 962 tests passed (108 files). Prior project release: **vM35.1.1** (M35.1, 2026-07-27) — Narrative Consistency Patch — User Exploration Experience MVP, a pure-frontend additive release over vM34.1 (Frontend Freeze Revision Gate): static Discover landing page (`pages/DiscoverPage.tsx`), hand-curated narrative layer (`exploration/StorySection.tsx` + `WhyImportantPanel.tsx` over `data/narrative.ts`, NO AI generation), localStorage-only Journey trace (`journey/JourneyPanel.tsx` + `lib/journey.ts`), and a no-op/localStorage `FeedbackWidget.tsx`; `App.tsx` / `EntityPage.tsx` mount points only. Ships with **M35 Release Quality Corrections** (release-quality fixes, not feature scope): CI frontend job `npm ci` → `npm install` (`.github/workflows/ci.yml`), duplicated `Byzantium` alias removed from `civ-byzantine` (`data/examples/roman_empire_example.json`), and `backend/tests/test_search_index.py` assertion synced to the enriched `person-augustus.location == "Roman Italy"` (PO-approved single-file Freeze Revision Gate). Invariants: no new feature, no `backend/app` change, no schema change, ENTITY_TYPES=8 / RELATIONSHIP_TYPES=18 untouched, zero new dependency, runtime stays `0.13.0`. Backend **219 passed**; frontend **569 passed** (+29); freeze-check EXIT 0; governance tests **9/9**. Prior project release: **vM34.1** (M34, 2026-07-27) — Exploration UX Hardening + Knowledge Graph Visualization MVP (M34), a pure-frontend additive release over M33 A-1.5 (full details in CHANGELOG.md / README.md). **M33 A-1.5** backfills a frozen `tier` field on 12 previously missing-tier sources in `data/sources.json` (distribution primary 18 / academic 13 / reference 8 / missing 0; `src-rosenberg-1999` also adds a non-vocabulary `verification_status: pending` field) and corrects 3 source references in `data/evidence_claims.json` (`ec-002` herodotus→arthashastra with injected `source_ids: [arthashastra, strabo]`; `ec-023`→thapar-early-india; `ec-rom-027`→iranica-rome, the latter two retaining `silk-road` inside `source_ids[]`). Gold Gate (G1 Source / G2 Wikipedia / G3 Registry / G4 Vocabulary) + Greek Checklist (C1–C5) all pass; 39 sources, 64 claims, missing-tier count 0. No backend / frontend / schema / validation / registry / runtime change; runtime stays `0.13.0`; no AI / LLM / new dependency. Prior project release **vM33.1** (M31 + M33, 2026-07-27) — Knowledge Production Pipeline data checkpoints released as two independent commits/tags on one feature branch: **M31 Knowledge Model Expansion (vM31.1)** enriched `data/examples/ancient_india_example.json` (geo / language / external_refs) and added 4 India curated sources + 14 legacy claims; **M33 A-1 Roman Gold Dataset (vM33.1)** added `data/examples/roman_empire_example.json` + 40 Roman claims + 27 Roman curated sources, upgrading the pipeline from "structural Gold" toward "Governance Complete Gold". Both data-only: no backend / frontend / schema / validation / registry / runtime change; runtime stays `0.13.0`; no AI / LLM / new dependency. Added `frontend/src/components/RelationshipEvidence.tsx` (5-state container+view that reuses `ProvenancePanelView` to render provenance by LOCAL id; no new API) + `RelationshipEvidence.test.tsx` (5-state + local-id contract) + `frontend/src/components/ExplorationFlowGuide.tsx` (static 4-step guide, no state) + `ExplorationFlowGuide.test.tsx`. `RelationshipView.tsx` adds a lazy "查看依据" button (`rel-evidence-btn`) that mounts `RelationshipEvidence` only on click — it never fetches evidence for every relationship by default. `EntityPage.tsx` mounts `<ExplorationFlowGuide />` additive (the existing `EntityExplorationGuide` is untouched). `ProvenancePanel.tsx` groups records by `source_id` on the frontend (no new field, no `claim_text` / `confidence`, `subject_id` still hidden). Provenance contract unchanged (local id preserved, ADR-006); AI remains a read-only interpretation layer — no backend projection change, no new API. Release commit: **9ea2d13**.

**Architecture state (M30-B):** Relationship evidence exploration layer added — the Entity Page now also renders an `ExplorationFlowGuide` (static 4-step flow) and each relationship row exposes a lazy "查看依据" button mounting `RelationshipEvidence`, which reuses the M30-A `ProvenancePanelView` to render the existing M29.1 `GET /provenance/{entity_id}` read model by LOCAL id. Provenance records are grouped by `source_id` on the frontend. `ProvenancePanel` stays defensive (404 → friendly disabled state); provenance remains a derived read model surfaced read-only. The `PROVENANCE_PROJECTION` flag (M29.1) still gates the backend projection; no backend change.

**Deferred (M30-B):** AI ingestion pipeline (still gated by the Freeze Revision Gate — requires backend / schema / data extension).

Prior project release **vM29.1** (M29.1, 2026-07-26) — Runtime Provenance Projection Activation: activated the runtime provenance projection (ADR-006 Read Model). `backend/app/core/provenance_index.py` (new) builds a `ProvenanceIndex` read model from the DatasetProvider (Source Registry + Evidence Claim layers); wired into `main.py` composition root behind the `PROVENANCE_PROJECTION` feature flag (default true; `false` → fallback to the vM27.1 runtime, no provenance endpoint). Added `GET /provenance/{entity_id}` (dual-mounted v1 + legacy) returning provenance records for an entity (empty array when none); 404 when the flag is off. No merge into the `/entity` response; runtime stays `0.13.0`; no data / schema / validation / registry / frontend change. Release commit: **f58759f**.

Prior project release **vM26.1** (M26.1, 2026-07-26) — Dataset Source Registry + Evidence Claim Boundary: a backend additive provenance layer over M25.1 (approved via the Architecture Freeze Gate). Added `backend/app/core/source_registry.py` `SourceRegistry` (human-curated provenance sources referenced by `source_id`; `SourceRecordV1` extends `SourceRecord` with `publisher_or_archive`; `FileSourceLoader` reads `data/sources.json`, returns `[]` when absent; independent curated layer, NOT graph nodes, no AI-generated sources) and `backend/app/core/evidence_claim.py` `EvidenceClaim` (typed record linking a subject entity/relationship to a curated source via `source_id`; `FileEvidenceClaimLoader` reads `data/evidence_claims.json`; independent curated layer, does NOT modify `data/examples`). `dataset_provider.py` adds `load_evidence_claims()` + wires `FileSourceLoader` (graceful `[]` when files absent); `dataset_validator.py` adds `validate_source_registry()` + `validate_evidence_claims()` (orchestration only, reuses the single frozen `app.validation.build_validation_report`). Tests: `backend/tests/test_source_registry.py` (12) + `backend/tests/test_evidence_claim.py` (12). `scripts/freeze-check.mjs` allowlist extended 6 → 12 (M26.1 six new files added; M24/M25.1 entries retained). `main.py` unchanged — provider still not wired into any runtime path (E1/E2 deferred); no new dependency / AI / LLM / DB. Prior project release **vM25.1** (M25.1, 2026-07-26) — Dataset Provider Layer: a backend additive layer over M24 (approved via the Architecture Freeze Gate). Added `backend/app/core/dataset_provider.py` `DatasetProvider` (composition over `TopicRepository`, read-only facade; `DatasetManifest` frozen 9-field identity descriptor with `provenance_policy="human-curated"`, no lifecycle fields; `SourceLoader` / `EmptySourceLoader.load() → []`, no AI-generated sources) and `backend/app/core/dataset_validator.py` `DatasetValidator` (orchestration only, reuses the single frozen `app.validation.build_validation_report`; `DatasetValidationReport` frozen). Tests: `backend/tests/test_dataset_provider.py` (10) + `backend/tests/test_dataset_validator.py` (3). `scripts/freeze-check.mjs` allowlist extended 2 → 6 (M25.1 four new files added; M24 entries retained). `main.py` unchanged — provider is not wired into any runtime path (E1 deferred to M26); no new dependency / AI / LLM / DB. Prior project release **vM24** (M24, 2026-07-26) — Data Foundation (Minimal Dataset Layer) + Freeze Guard allowlist mode: a backend additive foundation release approved via the Architecture Freeze Gate (see `backend/app/core/dataset.py` `DatasetMetadataProvider` and `scripts/freeze-check.mjs` allowlist mode). Prior project release **vM23** (M23, 2026-07-25) — Timeline Zoom/Pan + Entity Comparison Table + Insight CSV Export: a pure-frontend additive release over the M17–M22 insight views. Added `frontend/src/data/insightExport.ts` `serializeInsightReportAsCsv` (deterministic RFC-4180 CSV of the SAME insight view already rendered by the panel — entities / type counts / relationship matrix / timeline band; no timestamps/randomness/network/upload). `RelationshipInsightPanel` adds (A1) an SVG multi-entity timeline with VIEW-ONLY zoom/pan controls (放大/缩小/左移/右移/重置视图) that only transform SVG coordinates — `buildMultiEntityTimelineBand` is never recomputed; (A2) a read-only entity comparison table aggregating M16–M19 metrics per entity (centrality degree / distinct relationship-type count / timeline bounds / overlap count); (A3) local-only "复制 CSV 报告" + "下载 CSV" buttons via `navigator.clipboard` (with execCommand fallback) and a Blob download — no upload, no third-party service. `relationshipUtils` / `App.tsx` / AI pipeline / backend untouched. Backend unchanged, runtime stays `0.13.0`, no new dependency, no AI memory / session / proactive / causal drift.

Prior project release vM21 (M21, 2026-07-25) — Relationship Path Graph Visualization: a pure-frontend additive SVG visualization over the M20 Connectivity Explorer. Added `frontend/src/components/RelationshipPathGraph.tsx` (PURE VIEW: receives the already-computed `RelationshipPath[]` from M20 `findRelationshipPaths`; renders node + edge SVG chains over EXISTING edges only; hover highlights a single path; empty state "No relationship path available"; no edge creation / reversal / inference / causal reasoning / fetch / AI). `RelationshipInsightPanel` embeds the graph inside the M20 Relationship Connectivity Explorer block (additive; the text path chain is kept). `relationshipUtils` / `App.tsx` / `grounded_answer` / `/api/v1/ai/explain` / `multiEntityContext()` untouched. Backend unchanged, runtime stays `0.13.0`, no new dependency, no AI memory / session / proactive / causal drift.

Prior project release vM19 (M19, 2026-07-25) — Relationship Centrality & Pair Explorer: a pure-frontend additive visualization over the M17/M18 insight views. Extended `frontend/src/data/relationshipUtils.ts` with `calculateRelationshipCentrality` (undirected degree count per global_id over the EXISTING relationship matrix; never invents edges) and `filterEdgesBetweenPair` (returns only existing edges whose endpoints are exactly A and B, either direction; no inference). `RelationshipInsightPanel` adds two new `<details>` sections — Relationship Centrality (entity / global_id / relationship count, labelled via an injected `nameByGlobalId`) and Pair Relationship Explorer (two view-only selects showing only existing edges between the selected pair, no causal words). `App.tsx` derives `exploreNameByGlobalId` from already-fetched metadata and passes it to the panel. `grounded_answer` / `/api/v1/ai/explain` / `multiEntityContext()` untouched. Backend unchanged, runtime stays `0.13.0`, no new dependency, no AI memory / session / proactive / causal drift.

Prior project release vM18 (M18, 2026-07-25) — Relationship Insight Controls & Local Export: a pure-frontend deterministic interaction + export layer over the M17 insight views. Extended `frontend/src/data/relationshipUtils.ts` with five pure functions — `normalizeRelationshipFilter` (validates against the frozen 18-type mirror; blank/`all` → ALL sentinel, out-of-vocabulary → `unknown`), `filterRelationshipMatrixByType`, `sortRelationshipMatrixByCount` (count-based sort with stable original-order tie-break), `sortTimelineBands` (by start or name; null bounds always last, never fabricated), and `normalizeTimelineRange` (swaps inverted bounds only). `RelationshipInsightPanel` adds matrix filter/sort and timeline-band sort controls (component-local view state only, no persistence) plus local-only export: new `frontend/src/data/insightExport.ts` (`serializeInsightReport` — deterministic JSON, schema `history-explorer/insight-report@1`; `buildPrintableInsight` — self-contained escaped HTML, no scripts/external links, metadata-only disclaimer) wired to a client-side Blob JSON download and a print view. Nothing is uploaded; no account binding. `grounded_answer` / `/api/v1/ai/explain` / `multiEntityContext()` untouched. Backend unchanged, runtime stays `0.13.0`, no new dependency, no AI memory / session / proactive / causal drift.

Prior project release vM17 (M17, 2026-07-25) — Relationship Insight Enhancement (Theme A + Theme B): a pure-frontend enhancement of the M16 Relationship Insight Layer that adds aggregated analytics over EXISTING relationship metadata. Extended `frontend/src/data/relationshipUtils.ts` with `aggregateRelationshipTypes` (frozen 18-type vocabulary, unknowns bucketed as `unknown`), `buildRelationshipTypeMatrix` (source → relation_type → target rows), and `buildMultiEntityTimelineBand` (per-entity time bounds + overlap-only comparison, no causal narrative); `RelationshipInsightPanel` adds three native `<details>` sections — Relationship Type Summary (counts only), Relationship Type Matrix, and Multi Entity Timeline Band. `grounded_answer` / `/api/v1/ai/explain` / `multiEntityContext()` untouched. Backend unchanged, runtime stays `0.13.0`, no new dependency, no AI memory / session / proactive / causal drift.

Prior project release vM16 (M16, 2026-07-25) — Relationship Insight Visualization Layer (Theme B): a pure-frontend visualization of EXISTING relationship metadata across the user's picked candidates. Delivered `frontend/src/data/relationshipUtils.ts` (pure `pairEntities` / `findExistingRelationships` / `timelineOverlap` / `geoComparison`, no fetch, no AI, no causal inference) and `frontend/src/components/RelationshipInsightPanel.tsx` (relationship cards / timeline overlap / geographic comparison / collapsible `<details>`, native fold state only). Backend unchanged, runtime stays `0.13.0`.

Prior project release vM15 (M15, 2026-07-25) — Multi Entity Reasoning Enhancement (Theme A): a pure-frontend UX thickening of the M14 Cross Topic Picker via new `pickerUtils` helpers (`filterByTopic` / `distinctTopics` / `sortCandidates` / `reorderCandidates` / `clearCandidates`) and `EntityPickerPanel` topic-filter chips, a sort control, selected reordering, clear-all, and results overflow handling; `MultiEntityContextPanel` shows the resolved-context count and a collapsible preview of the exact `global_id`s sent to the AI. Backend unchanged, runtime stays `0.13.0`.

Prior project release vM13 (M13, 2026-07-25) — Multi Entity Reasoning Foundation: the user explicitly selects N real entity global_ids and asks ONE grounded question across them via the M12-1 Grounded AI `/explain` primitive. Delivered `MultiEntityContextPanel` (component-local `selectedGids`, UI-only `MAX_N` cap) + `multiEntityContext` N-id builder; resolved the M12-2 Multi-Entity scope drift; no new AI, backend unchanged.

Governance Hardening (M11-3, project release vM11-3): orchestrator (`answer_service`) boundary documented in M11-2 Planning §2 + Architecture Baseline §3; added ADR-0003 grounding validation tests (malformed-JSON / validator-bypass / wrong-kind / timeline / stateless / thin-handler); tracked M11-2 governance debt cleared. Runtime stays `0.13.0`.

Implemented (deterministic, no AI runtime):

- Knowledge Core (in-memory): entities + typed relationships + structured time.
- Global Graph (cross-topic edges) and Deterministic Exploration Engine (four-dimensional weighted scoring; static, explainable, no ML).
- Multi-entity temporal visualization (M6 / M7 / M8): time understanding, comparison, multi-axis.
- Cross-topic connections (M4); data scale & quality (8 topics / 99 entities / 154 relations / 45 cross-topic edges / 15 timelines / 0 warnings) — expanded in project release vM9-004.2.
- Five-Zone UI (Related / Explained / Paths / Timeline / Themes) rendering real data.
- Basic search (`/search`); deterministic rule-based explanation (`connections_explained`).
- Engineering foundation (M8.6): CI, Engineering Playbook, version-source single truth, freeze-check guard.
- Exploration Flow Enhancement (M9-001 / M9-002 / M9-003, v0.11.0–v0.13.0): deterministic Next-Node Recommendation Engine (backend, `GET /entity/{id}/recommendations`, explainable four-dimensional scoring) + `RecommendationPanel` (frontend, surfaces the recommendation with reasons) + `ExplorationJourney` (frontend, annotates each exploration stop with *why it was reached*). All three milestones are **frontend/backend additive, zero-freeze-touch, no AI runtime** — the frozen deterministic engine is reused, not replaced.
- Grounded AI Interpretation Layer (M11-1 / M11-2, project release vM11-2): an **additive** AI explanation layer governed by **ADR-0003**. `backend/app/ai_gateway/` holds the AI Gateway foundation (provider / prompt / fallback / config, M11-1) and the Grounded Context Engine (citation model / grounding builder / context serializer / response validator / answer orchestration, M11-2), exposed via `POST /ai/explain` + `POST /ai/chat` (dual-mounted `/api/v1` + legacy; `/ai/chat` is strictly stateless). The **deterministic graph remains the single source of truth** — AI consumes read-only grounding, every citation is validated against real graph facts, and nothing mutates the graph. Runtime stays `0.13.0`.

Deferred / Not yet built (per Freeze Baseline):

- Full LLM-powered generative guidance (History Guide / AI Next Node / Graph Builder) — a **grounded** AI interpretation layer is now delivered (M11-1 / M11-2, under the ADR-0003 Freeze Revision Gate) alongside the deterministic Next-Node recommendation (M9-001); the broader LLM-powered generative variants remain gated behind the Freeze Revision Gate.
- GIS Map / spatial visualization.
- Neo4j-level knowledge model; PostgreSQL; Elasticsearch.
- User persistence / accounts.
- Force-directed graph visualization.

# 6. Current Architecture Freeze Baseline

The current architecture is **frozen as a baseline** - *not* a permanent freeze. In code it prohibits the introduction of: Neo4j / PostgreSQL / Elasticsearch / LLM+RAG runtime / GIS / login / permissions / new dependencies. The deterministic in-memory Knowledge Core and Exploration Engine are the agreed foundation.

**Evolution path - Freeze Revision Gate:**

Any change that touches the freeze boundary (e.g., adding AI runtime, Neo4j, GIS) MUST pass the Freeze Revision Gate: an ADR + a revision of the freeze baseline ([`docs/M3.5-000_Schema_Freeze_Review.md`](docs/M3.5-000_Schema_Freeze_Review.md), now elevated to [`docs/10_ARCHITECTURE/CURRENT_ARCHITECTURE_BASELINE.md`](docs/10_ARCHITECTURE/CURRENT_ARCHITECTURE_BASELINE.md)), approved by Product Owner. It is never bypassed silently in implementation.

Code guard: `scripts/freeze-check.mjs` (runs in CI).

# 7. Development Rules

All development follows these principles:

1. Documentation before implementation.
2. Clear task definition before development.
3. Small incremental changes.
4. Every change must be traceable through Git.
5. Avoid unnecessary complexity.
6. Preserve long-term maintainability.

# 8. AI Agent Collaboration Rules

AI Agents working on this project must follow:

1. Read PROJECT_CONTEXT.md before starting work.
2. Follow assigned Task instructions only.
3. Do not change product direction.
4. Do not invent requirements.
5. Do not modify unrelated files.
6. Respect the Current Architecture Freeze Baseline; propose freeze revisions via the Gate, never by silent code change.
7. Commit changes with meaningful messages.
8. Push completed work to GitHub.
9. Report completed changes clearly.

# 9. Related Documents

- Vision (mirror): `PRD.md` (source: `History_Explorer_PRD_完整版_v1.0.docx`)
- `Product_DNA.md` (L2) - `Product_Constitution.md` (L3)
- `PROJECT_ROADMAP.md` (L5) - `docs/INDEX.md` (Documentation Map)
- Freeze Baseline: `docs/M3.5-000_Schema_Freeze_Review.md`
- Team Spec: `docs/TEAM_OPERATING_SPEC_v1.2.md`
