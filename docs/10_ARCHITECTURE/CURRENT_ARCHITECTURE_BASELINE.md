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
- **Orchestration layer** (`ai_gateway/answer_service.py`): the single integration point
  that composes `grounding_builder` → `context_serializer` → `provider` → `response_validator`
  → `fallback_handler` into `grounded_answer(knowledge_service, question, context_global_ids)`.
  The `knowledge_service` is injected via parameter (no global coupling); the orchestrator
  holds no graph state and never mutates the graph.
- **main.py thin-handler invariant**: `main.py` only **route-mounts** `/ai/*` endpoints and
  **delegates** to `ai_gateway` (specifically `grounded_answer`). It MUST NOT:
  (a) import or instantiate `KnowledgeService` / graph state,
  (b) perform any graph mutation / navigation / exploration,
  (c) contain AI business logic, prompt construction, or provider calls.
  This invariant is CI-guarded by `scripts/freeze-check.mjs` (`APPROVED_AI_MAIN` allowlists
  `main.py` for route-mounting tokens only; forbidden AI/graph tokens still fail).
- The AI module lives **inside** `backend/app/` (within `freeze-check` scan scope). The
  reserved root `ai/` placeholder is **outside** scan scope and MUST NOT host runtime AI code.

### Approved Exception — M74 AI Grounding Runtime (PO Freeze Revision, vM74)

M74 activates the M11 exception (ADR-0003) under the **frozen Trust Boundary**
(KG = fact layer, AI = interpretation layer, AI never a fact source — ADR-0011 AI Runtime
Architecture, docs/15_DECISIONS). Approved via M74 Phase0 Approval Package + Phase2
Freeze Gate + AIRequest Freeze Revision Request (PO-approved, 2026-07-31/08-01).

- **Extended allowed scope** (all inside `backend/app/ai_gateway/` + one read-only core
  extension + one additive API field):
  - `grounding_builder.py` — ClaimGraph assembly (lazy), EvidenceSelector, deterministic
    `derive_next_exploration` (+ claim_text / source_title / source_tier additive fields)
  - `citation_model.py` / `response_validator.py` — ClaimEntry / ClaimGraph / SelectionRecord /
    EvidenceSelection / ClaimValidationResult models + EvidenceValidator Trust Gate
  - `exploration_planner.py` — state-aware Exploration Planner (P7 self-exclusion,
    P2 visited-aware, deterministic reason, evidence-aware ranking)
  - `answer_service.py` — deterministic grounded OFF-branch (ClaimGraph → Selection →
    Validation → renderer; engine=deterministic, grounded=true, 4-field contract)
  - `knowledge_service.py` — read-only local-id→global-id mapping + claim/source lazy loaders
  - `main.py` — AIRequest **additive fields only**: `visited: list[str]` +
    `package_context: Optional[str]` (no new endpoint, no route change, no field semantics change)
- **Runtime remains OFF by default**: `AI_GATEWAY_ENABLED=false`; LLM provider unconfigured
  → `grounded_answer` returns the deterministic grounded output (never 500, never guesses).
  Frontend AI touchpoints behind `VITE_AI_SUGGESTIONS_ENABLED` (default OFF = M73 byte-identical).
- **Evaluation baseline** (frozen): golden set 20 (entity 8 / relationship 7 / next 5);
  Grounding 100% / Citation 100% / Hallucination 0 / Helpfulness proxy 100%.
- **Remain forbidden** (unchanged): KG writes by AI, generated facts, free-form chat,
  scoring / ranking / personalization, vector DB / RAG / Neo4j / Redis / GIS / auth,
  new runtime dependencies, agent / multi-agent.
- **Trust Experience frozen** (vM74): recommendation presentation / evidence card /
  reason / trust metadata display — no further changes without a new Freeze Revision Gate.

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
- **M24 (2026-07-26)** added a backend additive Dataset identity layer (`backend/app/core/dataset.py`) and upgraded the freeze-guard scope to allowlist mode. The frozen schema (ENTITY_TYPES=8 / RELATIONSHIP_TYPES=18), the in-memory storage model, the API contract, and all §1–§3 boundaries are **UNCHANGED**. See §7 for the derived Provenance Contract.

## 7. Provenance Contract (M24)

M24 introduces a **derived Dataset identity** for the curated graph. This is provenance
metadata, **not** a schema change — it does not alter the frozen enumerations (§1), the
in-memory storage model, the API contract, or any freeze boundary (§3).

- **Identity** (`backend/app/core/dataset.py`, dataclass `DatasetMetadata`): `dataset_id`
  (`curated-history-graph`, a fixed constant), `name`, `description`, `topics[]`, and
  `content_hash`.
- **Canonical deterministic hash** (`compute_content_hash`): for each topic (sorted
  ascending), the `entities` / `relationships` / `timeline` arrays are each serialized with
  `json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False)`, then the
  resulting per-array string lists are **sorted** before assembly. The per-topic blobs are
  joined by `\n` and hashed with `sha256`; the result is prefixed `sha256:`.
- **Stability guarantees**: (a) independent of JSON key order and array element order;
  (b) identical content → identical hash across runs and machines; (c) any content change
  (entity / relationship / timeline edit, or topic add / remove / rename) changes the hash.
- **Purpose**: a reproducible fingerprint of the curated dataset, enabling change detection,
  cache-busting, and audit without storing a snapshot. Computed on read from the existing
  `TopicRepository` — no new persistence, no mutation.
- **Freeze-safe**: additive only; lives under the M24 allowlist (`backend/app/core/dataset.py`);
  no further Freeze Revision Gate required beyond the one already granted for M24.
