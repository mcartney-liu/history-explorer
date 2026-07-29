# ADR-0005 — M62 UX Convergence: Frontend Composition & Freeze-Scope Confirmation

## ADR Number

ADR-0005

## Title

M62 UX Convergence — Frontend Composition & Freeze-Scope Confirmation

## Status

Accepted (2026-07-29, PO-approved as part of the vM-series harvest route)

## Context

M62 (UX Convergence · museum-grade product polish) is a **pure-frontend
composition** milestone. Its goal is to reorganize the existing topic-result
surface into a three-tier narrative structure, add relationship/timeline
folding toggles, redesign the Discover landing page to lead with exploration,
introduce a grounding badge, and add permanent guardrail tests + CI gates.

Freeze boundary impact: **NONE**. The backend is untouched; no new dependency,
no new API endpoint, no schema/enum change (ENTITY_TYPES stays 8,
RELATIONSHIP_TYPES stays 18), and the runtime version stays 0.13.0. Every
changed file already falls inside an existing SCOPE_ALLOWLIST entry, so no new
Freeze Revision Gate entry is required beyond this documentation.

## Decision

1. **Canonical Icon registry** (`frontend/src/components/ui/Icon.tsx`) —
   a name→inline-SVG map (21 names; 1.5px stroke, `currentColor`, sizes
   16/20/24). Replaces all emoji-as-functional-icon usage with a single
   consistent, dependency-free icon language. Unknown keys render `null`
   (self-enforcing — never an emoji).
2. **Three-tier result structure** — `App.tsx` topic result block wrapped in
   `<section data-tier="narrative|interpretation|supporting">`. No panel is
   removed; DOM order is narrative → interpretation → supporting.
3. **Folding toggles** — existing `relView` (`list`/`spatial`) and `timeView`
   (`single`/`multi`) state hooks drive inline segmented toggles that switch
   RelationshipView↔GraphViewPanel and TimelinePanel↔MultiEntityTimeline.
   Both panels remain in the tree (toggled, not deleted).
4. **Grounding badge** (`frontend/src/components/ui/GroundingBadge.tsx`) —
   verified/unverified pill with WCAG-AA contrast, wired into
   `AIExplanationPanel`. A `check` icon was added to the registry.
5. **Discover redesign** — exploration entry made the dominant CTA; AI-assist
   copy demoted to secondary. All capabilities retained.
6. **W6 guardrail tests** (`frontend/src/__tests__/`) — emoji registry scan,
   icon-registry integrity, entity-label mapping, M62 structure, grounding
   badge contrast. `vitest.config.ts` gains `testTimeout` + `forceExit`.
7. **CI expanded to 7 gates** (`.github/workflows/ci.yml`): the original
   `frontend` / `backend` / `freeze-check` jobs plus `visual-check` (now a
   real gate on M62-critical CSS classes), `emoji-scan`, `structure-check`,
   and an advisory `release-consistency` (push-only, continue-on-error).
8. **visual-check.mjs upgraded** to exit non-zero when an M62-introduced CSS
   class is undefined. The broad "classes used but not defined" report is kept
   as a WARNING only, because it is dominated by pre-existing false positives
   (the scanner does not cover every CSS context / CSS-module / dynamic
   class); failing on it would break CI for unrelated reasons.

## Alternatives

- **Third-party icon library** (e.g. lucide / heroicons) — rejected: violates
  the no-new-dependency freeze.
- **Keep emoji as icons** — rejected: violates the project P0 anti-slop rule
  and cannot be regex-guarded against regression.
- **Gate visual-check on its full `missing` list** — rejected: 600+ entries
  are pre-existing scanner blind spots, not real breakages.

## Consequences

- Emoji regressions are permanently prevented (emoji-scan + structure-check +
  self-enforcing `<Icon>` registry).
- Visual / structure regressions are caught in CI (visual-check critical-class
  gate + structure-check).
- No change to `docs/10_ARCHITECTURE/CURRENT_ARCHITECTURE_BASELINE.md` is
  required — the freeze scope is unchanged, only confirmed.

## Related Freeze Revision

- Freeze Revision Gate: **No** (all M62 file paths are pre-allowlisted).
- Confirmed allowlisted paths used by M62:
  `frontend/src/App.tsx`, `frontend/src/App.css`, `frontend/src/pages/`,
  `frontend/src/components/ui/`, `frontend/src/components/entity/`,
  `frontend/src/components/ai/`, `frontend/src/components/workspace/`,
  `frontend/src/data/entity/`, `frontend/src/data/ai/`,
  `frontend/src/__tests__/`.
- Linked docs: `PROJECT_ROADMAP.md` (M62 UX Convergence),
  `scripts/freeze-check.mjs` (SCOPE_ALLOWLIST).
