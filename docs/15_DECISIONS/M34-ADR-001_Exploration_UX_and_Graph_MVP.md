# M34-ADR-001 — Exploration UX Hardening + Knowledge Graph Visualization MVP

## ADR Number

M34-ADR-001 (filed in the `docs/15_DECISIONS/` register; follows ADR-0001..ADR-0003
and the M29.1 gate records referenced by `scripts/freeze-check.mjs`).

## Title

Frontend-only Exploration UX hardening (A1) + a zero-dependency, self-drawn SVG
Knowledge Graph Visualization MVP (A2), both admitted through the Frontend
Freeze Revision Gate.

## Status

Accepted (PO APPROVED — M34 Implementation Phase 3).

## Context

M34 continues the additive, frontend-only track established by M30-A/M30-B. Two
technical-debt observations from the M34 Proposal/Design phases motivate this ADR:

- **TD-1 (duplicated rendering / monolith):** `frontend/src/App.tsx` is a single
  767-line component that inlines state, routing, fetching AND rendering. The
  navigation-following callbacks
  (`openEntity(gid, gid.includes(':') ? … : gid)` and
  `navigateTo({ type: 'topic', topic, title: prettifyTopic(topic) })`) are
  duplicated verbatim across the topic view and the entity view, and the entity
  page header is inlined inside `EntityPage.tsx`.
- **TD-nav (no navigation shell):** the Breadcrumb + HistoryBar + ExplorationPathTree
  are rendered as loose siblings with no dedicated, semantic navigation container.

Separately, the product has entity + relationship data already available on the
client (`GET /explore/{topic}` returns `entities` + `exploration.main_entity` +
`exploration.related_entities`; `GET /entity/{id}` returns
`exploration.main_entity` + `exploration.related_entities` + `relationships`),
but there is **no graph visualization** of that structure — only list/panel views.

**Freeze-boundary impact:** NONE of the frozen invariants are touched. This ADR
introduces **no** Neo4j / LLM runtime / vector DB / GIS / GraphQL / Redis and
**no new dependency**. The graph is drawn with hand-written SVG (React +
`react-dom` only). `ENTITY_TYPES=8`, `RELATIONSHIP_TYPES=18`, backend, schema,
and `data/*.json` are all unchanged. Runtime version stays `0.13.0`.

## Decision

Admit the following **frontend-only, additive** change set to the
`scripts/freeze-check.mjs` `SCOPE_ALLOWLIST` (Frontend Freeze Revision Gate,
same lightweight-ADR mechanism used for M30-A/M30-B):

### A1 — Exploration UX Hardening
- **New** `frontend/src/components/AppShell.tsx` (+ `AppShell.test.tsx`):
  presentational chrome (hero + `.explorer`) with a dedicated, semantic
  **navigation shell** slot (`<nav class="nav-shell">`). Fixes TD-nav.
- **New** `frontend/src/components/EntityHeader.tsx` (+ `EntityHeader.test.tsx`):
  the entity-page header block extracted out of `EntityPage.tsx`.
- **Modify** `frontend/src/App.tsx`: adopt `AppShell`; hoist the duplicated
  navigation callbacks into single named handlers (`openNode`, `openTopic`)
  reused by both views. Fixes TD-1. **API behavior is preserved verbatim** — the
  same fetch URLs, the same `navigateTo`/`openEntity` semantics, the same DOM the
  existing tests assert on.
- **Modify** `frontend/src/components/EntityPage.tsx` (already allowlisted since
  M30-A): render `<EntityHeader/>` instead of the inline header block.
- **Modify** `frontend/src/App.css`: add `.nav-shell` styling for the shell.

### A2 — Knowledge Graph Visualization MVP
- **New** `frontend/src/lib/graphLayout.ts` (+ `graphLayout.test.ts`): a pure,
  deterministic radial layout function. **Hard MVP caps enforced in code:**
  nodes ≤ 30, edges ≤ 60, scope = current topic's main entity + its DIRECT
  neighbours only.
- **New** `frontend/src/components/GraphViewPanel.tsx` (+ `GraphViewPanel.test.tsx`):
  a **self-drawn SVG** renderer (nodes = `<circle>`+`<text>`, edges = `<line>`).
  Nodes are coloured by the 8 frozen entity types; edges are labelled by the 18
  frozen relationship types. **No external graph/visualization library.** Reuses
  the already-fetched `/explore` + `/entity` relationship data — **no new API
  endpoint, no backend change.** Mounted in both the topic view (`App.tsx`) and
  the entity view (`EntityPage.tsx`).

## Alternatives

1. **Use a graph library (d3 / react-flow / vis / cytoscape).** Rejected —
   violates the zero-new-dependency freeze invariant. Self-drawn SVG keeps the
   dependency set at `react` + `react-dom`.
2. **Add a backend `/graph` endpoint.** Rejected — unnecessary. The exploration
   and entity responses already carry the nodes and edges; a new endpoint would
   be a backend/schema change requiring a heavier gate for zero benefit.
3. **Render the full topic graph (all entities/edges).** Rejected for the MVP —
   uncapped rendering risks a dense, unreadable, slow SVG. The MVP is capped at
   main entity + direct neighbours (≤30 nodes / ≤60 edges); broader expansion is
   deferred to a later, separately-gated milestone.
4. **Leave `App.tsx` untouched.** Rejected — TD-1/TD-nav are structural debt that
   compounds with every added panel; a bounded, test-guarded extraction pays it
   down without behavior change.

## Consequences

- **Easier:** the monolith shrinks and grows a real navigation shell; the graph
  gives users a spatial view of the same data the panels already show; both new
  capabilities are unit-tested (SSR `renderToStaticMarkup`, matching the existing
  `environment: 'node'` test style — no new test dependency).
- **Harder / watch-outs:** `App.tsx` and `App.css` enter the allowlist for the
  first time, so future edits to them remain gated. The SVG renderer must stay
  within the MVP caps; lifting them is a separate decision.
- **Baseline revision:** this does NOT require editing
  `docs/10_ARCHITECTURE/CURRENT_ARCHITECTURE_BASELINE.md` — it introduces no new
  entity/relationship type, no dependency, no runtime component. It is recorded
  here and enforced by the allowlist.

## Related Freeze Revision

- Freeze Revision Gate: **Yes** (Frontend, lightweight — same mechanism as M30-A/M30-B).
- Allowlist additions in `scripts/freeze-check.mjs` (10 paths):
  - `frontend/src/components/AppShell.tsx`
  - `frontend/src/components/AppShell.test.tsx`
  - `frontend/src/components/EntityHeader.tsx`
  - `frontend/src/components/EntityHeader.test.tsx`
  - `frontend/src/components/GraphViewPanel.tsx`
  - `frontend/src/components/GraphViewPanel.test.tsx`
  - `frontend/src/lib/graphLayout.ts`
  - `frontend/src/lib/graphLayout.test.ts`
  - `frontend/src/App.tsx`
  - `frontend/src/App.css`
  - (`frontend/src/components/EntityPage.tsx` already allowlisted since M30-A.)
- Frozen invariants unchanged: `ENTITY_TYPES=8`, `RELATIONSHIP_TYPES=18`,
  dependencies = `react` + `react-dom` (0 new), runtime = `0.13.0`.
- Linked docs: M34 Proposal (Phase 0), M34 Design Freeze (Phase 1), M34
  Implementation Plan (Phase 2); A3 civilization-expansion strategy →
  `docs/product/` (docs-only, this milestone).
