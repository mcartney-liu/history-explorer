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

# 5. Current State (Runtime v0.13.0 / Project Release vM11-2 / M11-2)

Released (runtime): **v0.13.0** (M9-003, 2026-07-22). Latest project release: **vM11-2** (M11-2, 2026-07-24) — Grounded AI Interpretation Layer (Grounded Context Engine).

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
