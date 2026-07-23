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

**M9.3 — Exploration Flow Enhancement: COMPLETED**

Latest releases (dual-track versioning):

- **Runtime Version: v0.13.0** (2026-07-22)
- **Project Release: vM9-006** (2026-07-23) — release governance & consistency checker (non-runtime release)

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
