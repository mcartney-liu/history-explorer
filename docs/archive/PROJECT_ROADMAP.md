# History Explorer - Project Roadmap

Version: 1.1
Status: Active


# 1. Overview

History Explorer evolves from a deterministic exploration foundation toward the long-term vision (历史版 Google Maps): Graph + Timeline + Map + AI guiding infinite exploration.

Development philosophy:

1. Product clarity before implementation.
2. Small iterations before large expansion.
3. User exploration value before feature quantity.
4. Knowledge quality before data scale.
5. Long-term architecture before short-term optimization.


# 2. Completed Milestones

- **M1** Foundation Validation (PRD / DNA / Constitution / prototype).
- **M2** Exploration MVP (Knowledge Model v2, search, entity pages, navigation shell, exploration loop, data quality).
- **M3** Knowledge Core Foundation (repository / registry / graph / search / timeline / exploration_service; composition root).
- **M3.5** Schema Freeze + Global Graph + Deterministic Exploration Engine + Five-Zone UI. *Established the Current Architecture Freeze Baseline.*
- **M4** Data Scale & Quality + Architecture.
- **M5** AI-Readiness Gating (concluded: AI layer deferred pending data / retrieval / flow / readiness).
- **M6** Temporal Understanding Layer (v0.7.0).
- **M7** (v0.8.0).
- **M8** Multi-Entity Temporal Visualization (v0.9.0).
- **M8.6** Release & Engineering Foundation - CI, Playbook, version single-source, freeze-check (v0.10.0).
- **M9** Exploration Flow Enhancement (deterministic, zero-freeze-touch) - M9-001 Next-Node Recommendation Engine (v0.11.0) · M9-002 RecommendationPanel (v0.12.0) · M9-003 Exploration Journey Panel (v0.13.0).
- **M77** Multi-Domain Ontology Framework Validation (project governance release, vM77, 2026-08-01).
- **M78** Project Governance Closure — DB-B01 CI isolation, M79 ADR acceptance, vM78 docs sync (2026-08-02).
- **M79** Causal Layer Boundary Contract — ADR-M79 Accepted (Option B, 6-field CausalStatement; relationship-kind owned by Graph Layer) (2026-08-02).


# 3. Near-Term (within Current Architecture Freeze Baseline)

Constraints: deterministic, in-memory, no Neo4j / LLM / GIS / new dependencies.
Freeze red line: ENTITY=8 / RELATIONSHIP=18 frozen; AI locked in Trust Boundary (M74) — KG=fact layer, AI=explanation layer, never in ontology.

> **Strategy shift (M80.5 onward):** History Explorer moves from "capability → freeze → implement"
> to "user-value definition → exploration-behavior design → experience validation → capability implementation".
> M80.5 is the dividing line between the engineering phase and the product phase.

## M80 — Governance Closure (Engineering)
- Gate B four Decisions: DB-B01 contract red-light / DB-B04 vocabulary source / DB-B05 ADR drift / PRD spatial gap.
- Tag M78/M79 official releases.
- Wire `domain/causal/acquisition` consumption OR resolve "parallel wing" debt (DB-B02).
- M80-B2 `mapping.py` three-state mapping + provenance.
- Red line: no 8/18 expansion; AI never in Ontology.

## M80.5 — Exploration Experience Definition (Product Gate, NO code)
> Output: `docs/product/M80.5_EXPLORATION_EXPERIENCE_DEFINITION.md` — the product mother document for M81/M82/M83.
> Not a coding milestone; not in `freeze-check`; does not modify `domain/` or `backend/`.
- **① First 5 Minutes** — product North Star (not a KPI). Defines "user's first success".
- **② Exploration Loop** — why the user continues; includes return/retention closure.
- **③ Exploration Object Model** — semantic presentation layer, NOT knowledge ontology. Sub-sections:
  - 3.1 Cognitive Mapping (DB world → user world)
  - 3.2 Presentation Semantics
  - 3.3 Interaction Contract (locks frontend behavior; prevents "graph browser" drift)
- **④ Exploration Shell** — how space carries exploration (result, not input).
- **⑤ AI Role Discovery** — records Loop nodes needing AI (Interpreter/Guide/Analyst/Navigator); **does NOT decide Companion vs Toolbox** (decision deferred to pre-M83).
- Prerequisite: M63-B = **Personal Exploration Trail** (Workspace) already decided.

## M81a — Exploration Prototype (Experience Validation) ✅ GATE PASS (2026-08-05)
- Validate First 5 Minutes + Exploration Loop via React prototype. N=4 (revised from 5, see Session Plan v1.1 Revision Record).
- Result: 4/4 PASS, 三信号 100%, 回访 75%. Gate PASS.
- Gate Report: `docs/product/M81a_GATE_REPORT.md`

## M81b — Experience Repair (Engineering) ✅ Phase 1 Closed (2026-08-04)
- Absorb M71 six findings: wizard cause localization > gid trace > breadcrumb semantics > 4th package real pointers > data localization > copy.
- These hold regardless of Loop final form.

## M80.5 Revision — Exploration Experience Definition Revision (Product, NO code) ✅ COMPLETE (2026-08-05)
> **Trigger**: M81a Gate PASS. Revision absorbs 4-session validation feedback.
> **Result**: PO ACCEPTED — 9 Proposals (5 Themes), 8 Design Principles. Acceptance Record: `docs/product/M80.5_REVISION_ACCEPTANCE_RECORD.md`
> **Naming**: "Revision" (not "v2") — this is a feedback-absorption revision of the existing M80.5 definition, not a new milestone or a second version of M80.5 development. Aligns with existing governance term `FREEZE_REVISION_REQUEST`.
> Output: `docs/product/M80.5_EXPLORATION_EXPERIENCE_DEFINITION.md` (pending formal merge).
> Key revision areas: First 5 Minutes entry visibility, Loop §Interpreter AI fallback, Loop §Guide narrative upgrade, Object Model Signal/CausalStatement UI distinction, Shell Trail completeness.
> Does not modify `domain/` or `backend/`.

## M82 — Causal Semantics Visible (Engineering) ← IMPLEMENTATION READY
- Surface `CausalStatement` (mechanism/consequence/confidence/evidence) into relationship/source-chain UI.
- Define "which Loop step tells the causal story"; explanation layer only, never Graph vocabulary; via Freeze Gate.
- Entry Gate: `docs/product/M82_ENTRY_ACCEPTANCE_RECORD.md` (2026-08-05, PO APPROVED)
- Constraint Lock: `docs/product/M82_IMPLEMENTATION_CONSTRAINT_RECORD.md` (8 constraints, ALL ACCEPTED)
- Implementation Plan: `docs/product/M82_IMPLEMENTATION_PLAN_v3.md` (3 Phase, 16 tasks)
- Depends on: M80.5 Revision §3.2 Presentation Semantics revision (P03/P04/P06/P07).

## M83 — Trail & Shell Landing (Engineering)
- Land **Personal Exploration Trail** (M63-B): persists path / context / unresolved questions / next directions — NOT a bookmark.
  - Two-level clarification: (L1) personal asset — revisitable / exportable within M83; (L2) platform-reusable resource — shareable / forkable / official "featured exploration" pickup, deferred to post-Gate community layer.
- Land Exploration Shell from M80.5.
- Pre-M83 gate: formally decide M63-A (Companion vs Toolbox) using M80.5 AI Role Discovery inputs.

## M83.5 — AI Intervention Implementation (Engineering, post M83 gate)
- Implement AI insertion into Loop per M80.5 AI Role Discovery + M83 Companion/Toolbox decision:
  - Interpreter (why this relation holds), Guide (what to explore next), Analyst (cross-civ comparison), Navigator (path to target node).
- Strictly within M74 Trust Boundary: KG = fact layer, AI = explanation layer, never in ontology; no LLM runtime in frozen baseline (explainability required).
- This is the first milestone where AI actively participates in exploration, not just static explanation.

## M84 — Exploration Package Library Expansion
- 4th–6th official packages; fill M81b-D cross-package pointers; more civilizations/themes.
- Note: packages here are official-authored; user-generated packages handled post-Gate (see M86.5).

## M85 — Exploration Trust Enhancement
- `view_source` provenance access + completion telemetry; answers "exploration logic trust" demand.

## M86 — Pilot Preparation
- M71 POC acceptance: 20–50 testers, 2–4 weeks, school / museum / culture-tourism scenarios. Still no accounts / cloud.
- Pilot doubles as **UGC data-shape warm-up**: validate that Personal Exploration Trail (M83) naturally precipitates into structured paths, preparing data morphology for M86.5 user-generated exploration packages.

## M86.5 — UGC Exploration Package Gate (Freeze Revision Gate, pre-community)
- Unlocks the chat-record core ask: "users form their own exploration packages through exploration; outstanding ones get official pin."
- Mandatory prerequisites (all require Freeze Revision Gate + PO approval):
  - User accounts / persistent identity.
  - Content moderation & governance flow (UGC cannot ship bare).
  - Platform-grade storage (current Trail lives in localStorage, not cloud).
- Defines: package-generation-from-Trail mechanism + official pin / featured curation logic.
- Only after this Gate does History Explorer become a resource-generating platform, not just a personal exploration tool.

# 4. Future (post Freeze Revision Gate)

Requires ADR + freeze-baseline revision (Product Owner approval). Examples from PRD v1.0:

- **AI Guidance Layer:** History Guide / Next Node / Graph Builder / Explanation Engine / Path Navigator.
- **Knowledge Graph upgrade:** Neo4j (graph) + PostgreSQL (relational) + Elasticsearch (search).
- **Spatial dimension:** GIS historical map (territory / war routes / city markers).
- **User persistence & accounts; community / creator features.**
- **Clients:** Flutter mobile + Web.


# 5. Long-Term Vision

History Explorer should become:

A global exploration engine for understanding human civilization.

The platform helps people discover:

- What happened.
- Why it happened.
- How civilizations interacted.
- How history connects across time and space.


# 6. Related Documents

- `PROJECT_CONTEXT.md` (current state) - `PRD.md` (vision mirror) - `docs/INDEX.md`
- Freeze Baseline: `docs/M3.5-000_Schema_Freeze_Review.md`
