// ============================================================
// M90.3 Stage A — parseRoute (pure, framework-agnostic)
//
// Single entry point that turns a raw hash string into a
// RouteState. The Router (useRouter) is the only caller; no
// component reads window.location.hash directly (K-1.2).
//
// Pure function rules:
//   - NO React import
//   - NO window / document access (hash passed in as argument)
//   - deterministic, never throws on arbitrary input
//
// Legacy URLs (#/m89, #/causal/:id, #/package/:slug) are NOT
// parsed here. They are rewritten once at startup by
// legacyRedirect.ts BEFORE this function ever sees them.
// ============================================================

import {
  type ExperienceMode,
  type RouteState,
  EXPLORE_PREFIX,
  isExperienceMode,
} from './routeSchema'

/**
 * The default route when no / unparseable hash is present.
 * Landing is the responsibility of the App root (see K-1.5):
 * an empty route means "show landing", not "force a topic".
 */
export const DEFAULT_MODE: ExperienceMode = 'exploration'

/**
 * Parse a hash string into a RouteState.
 *
 * @param hash  raw value, e.g. "#/explore/roman-empire/explanation/co-004"
 *              or "#/" or "" (landing).
 * @returns     RouteState when the hash is a valid explore route,
 *              or null when the hash is landing / unrecognized
 *              (caller shows Landing).
 */
export function parseRoute(hash: string): RouteState | null {
  // Normalize: strip leading "#", tolerate missing it defensively.
  const raw = (hash ?? '').startsWith('#') ? hash.slice(1) : hash
  if (!raw || raw === '/' || raw === '/explore') {
    return null // landing
  }

  // M90.3 — #/package/:slug is managed by usePackageContext, not the Router.
  // Returning null means "landing", which lets the package detail render
  // via the App's packageSlug state without triggering a mode switch.
  if (raw.startsWith('/package/')) {
    return null
  }

  if (!raw.startsWith('/explore/')) {
    return null // not an experience route → landing (legacy handled elsewhere)
  }

  const rest = raw.slice('/explore/'.length) // "topic/mode/focus"
  const segments = rest.split('/').filter((s) => s.length > 0)

  if (segments.length < 2) {
    return null // need at least topic + mode
  }

  const [topicRaw, modeRaw, focusRaw] = segments
  const topic = decodeURIComponent(topicRaw)
  const mode = modeRaw
  const focus = focusRaw ? decodeURIComponent(focusRaw) : null

  if (!isExperienceMode(mode)) {
    return null // unknown mode → landing rather than silently defaulting
  }

  if (!topic) {
    return null
  }

  return { topic, mode, focus }
}
