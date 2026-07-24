# ADR-M11: Grounded AI Interpretation Layer

## ADR Number
ADR-0003

## Title
Grounded AI Interpretation Layer (M11)

## Status
Accepted

## Context
History Explorer has completed M0–M10 deterministic exploration capabilities. The
current system provides a deterministic exploration engine, an entity / relationship
graph, a timeline system, narrative panels, and a rule-based explanation system.

**Current limitation:** the system can *navigate* knowledge, but cannot *converse* with
knowledge. Users can browse entities, relationships, and timelines, but cannot ask
natural-language questions about their current exploration context or receive a
synthesized narrative grounded in the graph.

**M11 introduces an AI interpretation layer — NOT an AI replacement.** It augments the
deterministic engine; it never becomes the source of truth. This ADR touches the Current
Architecture Freeze Baseline (Runtime boundary + Dependency boundary) and therefore
required the Freeze Revision Gate (ADR + Architecture Review + Product Owner Approval),
which is now passed.

## Decision
AI is an **additive interpretation layer**. The deterministic graph (in-memory
`GlobalGraph` / `DirectedGraph`) remains the **single source of truth**.

**AI MAY:**
- explain existing entities
- synthesize existing timelines
- answer grounded questions about the current exploration context
- generate narrative over existing knowledge

**AI MAY NOT:**
- modify the graph
- create facts
- replace `exploration_engine`
- override the recommendation engine
- perform autonomous research

## Architecture Boundary
New backend capability authorized: **`backend/app/ai_gateway/`**.

**Allowed responsibilities:**
- provider abstraction (single approved LLM provider SDK behind an interface)
- prompt management (templates; no free-form system-behavior drift)
- grounding context generation (pull current entity / relationships / timeline / journey
  from the in-memory graph)
- AI response formatting (citation decoration)

**Explicitly prohibited (remain forbidden even inside the module):**
- vector database
- RAG infrastructure
- Neo4j
- Redis
- external knowledge ingestion
- autonomous agents

## Grounding Policy
Every AI response MUST contain references to existing:
- entity ids
- relationship ids
- timeline context

If grounding is unavailable for a query, the AI MUST **refuse** or **explicitly state
uncertainty** rather than invent. RAG infrastructure and vector databases are explicitly
NOT used; retrieval is performed against the existing in-memory graph only.

## Rollback
A backend config flag **`AI_GATEWAY_ENABLED=false`** disables the AI layer.

When disabled:
- the AI Gateway short-circuits to a deterministic fallback message
- the frontend Ask Historian panel hides or shows "AI unavailable"
- M0–M10 behavior is fully unchanged (no data migration; no persistent AI state introduced)

## Alternatives
- **A. Full RAG + vector database** — rejected: violates the Freeze (Vector DB forbidden in
  M11); over-scoped for an interpretation-only need.
- **B. Client-side / browser LLM inference** — rejected: no viable small model; evades
  backend guard and cost control.
- **C. Autonomous exploration agent** — rejected: contradicts "AI MAY NOT perform autonomous
  research"; breaks "graph is source of truth".
- **D. Defer again (status quo)** — rejected by Product direction (M11 initiated).
- **Chosen:** Grounded additive interpretation layer with provider abstraction, inside
  `backend/app/ai_gateway/`.

## Consequences
**Positive:**
- conversational exploration over the user's context
- richer, synthesized narratives
- scalable interpretation without changing the deterministic core

**Negative:**
- API cost (per-request LLM call)
- latency (network + inference)
- provider dependency (mitigated by provider abstraction)
- residual hallucination risk (mitigated by the Grounding Policy + M11-4 evaluation tests)

## Related Freeze Revision
- Freeze Revision Gate: **Yes (passed)**
- Revised baseline: `docs/10_ARCHITECTURE/CURRENT_ARCHITECTURE_BASELINE.md` §1 (Runtime /
  Dependency rows) + §3 (Approved Exception) + §6 (status note).
- Companion guard revision: `scripts/freeze-check.mjs` — added `APPROVED_AI_MODULE`
  (`backend/app/ai_gateway/`) and `APPROVED_AI_DEPS` whitelist (`openai`); unknown AI
  dependencies and vector / Neo4j / Redis / RAG remain forbidden.
- Product Owner approval: **Granted** ("Approve Freeze Revision Gate", 2026-07-24).
- Linked docs: `PROJECT_ROADMAP.md` §4 (Future: AI Guidance Layer).
