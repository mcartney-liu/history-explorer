# Current Architecture Baseline

> Single entry point for the **Current Architecture Freeze Baseline**.
> This is a **baseline, NOT a permanent freeze**. It evolves via the Freeze Revision Gate.

## 1. Scope of the Baseline

The Current Architecture Baseline is **not limited to schema**. It defines the agreed
foundation across multiple boundaries:

| Boundary | What is fixed |
|---|---|
| **Schema boundary** | Entity / relationship enumerations (ENTITY_TYPES=8, RELATIONSHIP_TYPES=18). Origin: M3.5-000 Schema Freeze (see §2). |
| **Runtime boundary** | Deterministic engine is the source of truth. AI / LLM inference is permitted **only** inside the approved M11 AI Gateway (`backend/app/ai_gateway/`), additive and grounded (ADR-0003). |
| **Dependency boundary** | Minimal stack required. A single **approved LLM provider SDK** (whitelisted in `scripts/freeze-check.mjs`) is permitted for the M11 AI Gateway; all other new dependencies remain forbidden. |
| **API contract** | The `/api/v1` (== legacy) GET surface is the agreed, unchanged contract. |
| **Exclusion boundary** | Neo4j / PostgreSQL / Elasticsearch / Redis / GIS / login-auth are not present and require the Gate to introduce. |

## 2. Freeze Origin (Schema)

- **Source review:** `docs/M3.5-000_Schema_Freeze_Review.md` (M3.5 Schema Freeze Review, approved).
- This document elevates that review to the standing *Current Architecture Freeze Baseline*
  referenced by `docs/INDEX.md`, `PROJECT_CONTEXT.md` §6, and `PROJECT_ROADMAP.md`.

## 3. Current Restrictions (code-level)

The following are **prohibited in the current codebase** without passing the Freeze Revision Gate:

- **Deterministic engine required** — no runtime AI / LLM inference in the request path.
- **In-memory JSON storage** — no external database (Neo4j / PostgreSQL / Elasticsearch / Redis / other).
- **No runtime AI** — no LLM, no RAG, no AI inference at runtime.
- **No Neo4j** — graph is represented in-memory (DirectedGraph / GlobalGraph).
- **No PostgreSQL** — no relational persistence.
- **No Elasticsearch** — no external search/index service.
- **No GIS** — no map rendering / geospatial libraries at runtime.
- **No new dependencies** beyond the current minimal stack (FastAPI+uvicorn backend; React+ReactDOM frontend).
- **No login / permissions / auth** layer.

### Approved Exception — M11 Grounded AI Interpretation Layer (ADR-0003, Gate Passed)

The following is an **approved, controlled exception** to the restrictions above. It does
not weaken the deterministic core; the in-memory graph remains the single source of truth.

- **AI runtime permitted only in** `backend/app/ai_gateway/` (additive backend module),
  behind an approved provider abstraction, with grounding required
  (every response cites existing entity / relationship / timeline ids).
- **A single approved LLM provider SDK** is permitted as a backend dependency
  (whitelisted in `scripts/freeze-check.mjs`; currently `openai`). All other new
  dependencies remain forbidden.
- **Remain forbidden** under this exception: vector database, RAG infrastructure,
  Neo4j, Redis, GIS, login / auth, and autonomous agents.
- The AI module lives **inside** `backend/app/` (within `freeze-check` scan scope). The
  reserved root `ai/` placeholder is **outside** scan scope and MUST NOT host runtime AI code.

## 4. Revision Mechanism — Freeze Revision Gate

Any proposal that touches the freeze boundary (AI runtime, Neo4j, GIS, new datastore,
new dependency, …) MUST pass:

1. **ADR** — an Architecture Decision Record (`docs/15_DECISIONS/ADR_TEMPLATE.md`)
   documenting context, decision, alternatives, consequences, and the related freeze revision.
2. **Architecture Review** — conducted by Lead + Product Architect under the Team Operating Spec.
3. **Product Owner Approval** — explicit sign-off. The gate is never bypassed silently.

## 5. Code Guard

`scripts/freeze-check.mjs` runs in CI (GitHub Actions) and enforces the freeze
(enumerations ENTITY_TYPES=8 / RELATIONSHIP_TYPES=18, no forbidden runtime signals).

## 6. Status

- **Not permanent.** The baseline is the agreed foundation for M1–M8.6 and the Near-Term roadmap.
- Future capabilities (Neo4j/PG/ES, GIS, user system, Flutter) are described in
  `PROJECT_ROADMAP.md` §4 (Future) and require the Gate above.
- **AI interpretation runtime** has passed the Gate via **ADR-0003** (M11 Grounded AI
  Interpretation Layer) and is now an approved exception — see §3.
