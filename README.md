# History Explorer

## Global History Exploration Platform

Explore History. Discover Civilization.


## Overview

History Explorer is a global history exploration platform.

The project aims to transform history learning from passive information searching into active exploration and discovery.

> **M2 note:** The M2 build is **data-driven and deterministic** — no AI runtime is active. AI is a documented future capability (the `AIGuidePanel` is a placeholder). The exploration graph (entities + id-based relationships + structured time) is the explicitly reserved input for a future AI / Knowledge-Graph layer.

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

Current Phase:

**M2 — Exploration MVP: COMPLETED (Alpha Ready, pending human review)**

Status:

M2 delivered: Knowledge Model v2, cross-dataset search, entity pages, a navigation shell that closes the Exploration Loop, and a startup data-quality validation surfaced via `GET /health`. No AI, no graph database, no search engine, no new dependency.


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


Deferred (explicitly NOT in M2 — recorded as debt for M3+):

- CI / Docker / observability
- API versioning (`/api/v1`) + unified error envelope
- Knowledge Graph database (Neo4j) / GIS Map / AI Historian / Search Engine
- `CHANGELOG.md` / `TECHNICAL_DEBT.md` (M2 status captured in `M2_Planning.md` + the M2 Final Report)


## Documentation

Important documents:

- PROJECT_CONTEXT.md
- PROJECT_CHARTER.md
- Product DNA
- Product Constitution
- PRD
- Architecture Documents
- Team Operating Specification (v1.2 Frozen): docs/TEAM_OPERATING_SPEC_v1.2.md


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
