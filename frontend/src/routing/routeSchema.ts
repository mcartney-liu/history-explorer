// ============================================================
// M90.3 Stage A — Route Schema (single source of URL truth)
//
// This module defines the canonical URL contract for History
// Explorer. It is the ONE place that knows:
//   - which modes exist (Mode Registry)
//   - what a valid route looks like
//   - how a route maps to an ExperienceSession target
//
// IMPORTANT (J-1 ruling): Map / Geographic capabilities are
// NOT registered here even as placeholders. The target
// architecture keeps a Map Mode extension slot, but no Map
// capability exists today (no Geographic Exploration, no
// Historical GIS). When real GIS lands, it registers via the
// Experience Capability layer — not by editing this registry.
//
// This file must stay framework-agnostic (NO React import) so
// parseRoute / tests can run under plain Node.
// ============================================================

/**
 * The set of experience modes the Router understands.
 *
 * These map to cognitive layers, NOT pages:
 *   exploration    ← Fact Layer          ("这是什么")
 *   explanation    ← Explanation Layer   ("为什么发生")
 *   relationship   ← Understanding Layer ("为什么值得一起理解")
 *   understanding  ← Experience Runtime  ("我形成了什么理解")
 *
 * Civilization Pattern Mode and Map Mode are intentionally
 * ABSENT — they are Stage D / future-GIS work, not Stage A.
 */
export type ExperienceMode =
  | 'exploration'
  | 'explanation'
  | 'relationship'
  | 'understanding'

/** Canonical mode order used for "switch to next/prev mode" UX. */
export const MODE_REGISTRY: readonly ExperienceMode[] = [
  'exploration',
  'explanation',
  'relationship',
  'understanding',
] as const

const MODE_SET = new Set<string>(MODE_REGISTRY)

export function isExperienceMode(value: string | undefined): value is ExperienceMode {
  return value !== undefined && MODE_SET.has(value)
}

/**
 * Parsed route state. This is the ONLY shape the Router emits
 * and the Shell consumes. It is intentionally free of any
 * component reference (see K-4: Router outputs params + mode,
 * never a component).
 */
export interface RouteState {
  /** The exploration topic slug, e.g. "roman-empire-exploration". */
  topic: string
  /** The active experience mode. */
  mode: ExperienceMode
  /**
   * Optional focus within the topic — an entity global id, a
   * causal object id, or any mode-specific anchor. `null` when
   * the route targets the topic root.
   */
  focus: string | null
}

/** The authoritative URL prefix for all experience routes. */
export const EXPLORE_PREFIX = '#/explore/'

/** Routes that bypass the Explorer Shell (dev-only / legacy). */
export const DEV_CATALOG_ROUTE = '#/dev/catalog'

/**
 * Build a canonical experience URL from structured state.
 * Always emits the `#/explore/:topic/:mode/:focus` shape.
 * The focus segment is omitted (not rendered as "null") when
 * absent so the URL stays human-readable.
 */
export function buildExploreUrl(state: RouteState): string {
  const focusSegment = state.focus ? `/${encodeURIComponent(state.focus)}` : ''
  return `${EXPLORE_PREFIX}${encodeURIComponent(state.topic)}/${state.mode}${focusSegment}`
}
