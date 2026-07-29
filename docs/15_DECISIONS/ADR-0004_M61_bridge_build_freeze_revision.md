# ADR-M61: Bridge Build TypeScript Cleanup (Freeze Revision Gate)

## ADR Number
ADR-0004

## Title
M61-bridge-build — TypeScript Cleanup Freeze Revision (ConnectionsExplainedPanel allowlist)

## Status
Accepted

## Context
vM60-003 introduced a Landing Page + i18n + Design System V1.0 productization. After
M60-003 the production build (`tsc && vite build`) broke with 55 latent TypeScript
errors that had accumulated from refactors. These errors blocked `npm run build` and
violated the build-exit-0 gate established in the Development Playbook V1.0.

One of the 55 errors was in `frontend/src/components/ConnectionsExplainedPanel.tsx`
(an unused-destructure TS6133 on `centerEntityName`). The M61 working-tree change to
this file (labeled `M61` in-code) does two things: (1) removes the unused
`centerEntityName` destructure (the TS6133 fix), and (2) merges `ExplorationPathsPanel`'s
path-chain rendering into this component — adding an `onNodeClick?` prop and a
`PathStep` type, rendering a clickable node chain below each explanation row when path
data is present. The path rendering is defensive (`Array.isArray` guards; returns null
when a connection has no `path`), so it is runtime-safe and inert when no caller passes
`onNodeClick`. However, this file sits directly under `frontend/src/components/` and was
never registered in `scripts/freeze-check.mjs` SCOPE_ALLOWLIST during its originating
milestone (M36/M37), so any edit to it trips the M3.5 Freeze Guard D-class scope
violation.

This touches the Current Architecture Freeze Baseline (frontend scope boundary) and
therefore requires the Freeze Revision Gate (ADR + PO approval). PO approved the vM60
harvest route (including the TS cleanup) on 2026-07-29.

## Decision
- Add `frontend/src/components/ConnectionsExplainedPanel.tsx` to SCOPE_ALLOWLIST in
  `scripts/freeze-check.mjs` (M61-bridge-build entry).
- Accept the M61 working-tree change to `ConnectionsExplainedPanel.tsx`: the minimal
  TS6133 dead-code fix (remove unused `centerEntityName` destructure) plus the merged
  `ExplorationPathsPanel` path-chain rendering (`onNodeClick?` + `PathStep` type,
  defensive). Both compile (`tsc --noEmit` 0 errors) and are runtime-safe.
- The remaining 54 TS errors are fixed in files already covered by prior allowlist
  entries (App.tsx, EntityPage.tsx, HistorianChat.tsx, JourneyCard.tsx, DevCatalog.tsx,
  EventImpactPanel.tsx, EventNarrativeCard.tsx, ResearchDiscoveryPanel.tsx,
  ResearchLibrary.tsx, ResearchPanel.tsx, ExplorationHistoryModel.ts, EntityInsightModel.ts,
  UserBehaviorEvent.ts, KnowledgeCoverage.ts, OptimizationPriority.ts,
  ProductDecisionInsight.ts, ProductIntelligence.ts, ProductUsageAnalysis.ts,
  ResearchPlanner.ts, ExplorationFunnelAnalysis.ts, entityLabels.ts, ExplorationCard.tsx,
  AISidebar.tsx, DiscoverPage.tsx, tokens.css, typography.css, and the entity/workspace/ai
  directory entries).
- No backend / schema / enum / runtime-version / dependency change.
  `frontend/package.json` stays `0.13.0`.

## Alternatives
- **Leave the 55 errors and skip the vM60 production build**: rejected — build-exit-0 is
  a hard release gate; shipping a broken build is not acceptable.
- **Bump runtime to 0.13.1 and treat as a runtime release**: rejected — the changes are
  type-level/cleanup only, no functional runtime change; the dual-track policy keeps
  package.json at 0.13.0 and tags the milestone as a `vM*` project release.
- **Disable `noUnusedLocals` / `noUnusedParameters` to silence the 35 unused-declaration
  errors**: rejected — that hides real dead code and weakens the type-safety contract;
  the project intentionally runs strict tsc.

## Consequences
- Production `tsc --noEmit` + `vite build` now exit 0 (was 55 TS errors).
- `scripts/freeze-check.mjs` continues to PASS (ConnectionsExplainedPanel now allowlisted).
- `release-consistency-check.mjs` reaches 7/7 after the version docs are synced to vM60.
- No revision needed to `CURRENT_ARCHITECTURE_BASELINE.md` — only the allowlist
  enumeration changed, not the baseline invariants (ENTITY_TYPES=8 / RELATIONSHIP_TYPES=18
  / no new dependency / no AI runtime outside ai_gateway).

## Related Freeze Revision
- Freeze Revision Gate: Yes
- Product Owner approval: vM60 harvest route approved 2026-07-29 (PO: 翔哥)
- Linked docs: `docs/DEVELOPMENT_PLAYBOOK.md` (build-exit-0 gate),
  `scripts/freeze-check.mjs` (SCOPE_ALLOWLIST), `scripts/release-consistency-check.mjs`
