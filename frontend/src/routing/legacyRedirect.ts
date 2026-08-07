// ============================================================
// M90.3 Stage A — legacyRedirect (one-shot URL migration)
//
// Runs ONCE at app startup, before useRouter mounts. Detects
// old hash routes (#/m89, #/causal/:id, #/package/:slug) and
// rewrites them to canonical #/explore/:topic/:mode/:focus.
//
// Uses history.replaceState so no extra history entry is
// created (avoiding the "back button loop" problem where
// location.hash = would produce a history entry that brings
// the user back to the old URL which gets rewritten again).
//
// Migration table:
//   #/m89           → #/explore/french-revolution/understanding
//   #/causal/:id    → #/explore/:topic/explanation/:id
//   #/package/:slug → #/explore/:slug/exploration
//
// #/entity/:gid is NOT migrated (dead link per K-3).
// #/dev/catalog is preserved as-is.
//
// After this runs, no further legacy URL generation is
// permitted. All new navigations must use the Router API.
// ============================================================

// ------------------------------------------------------------------
// causal prefix → backend topic slug mapping.
//
// Derivation: causal_objects.json cause_id prefixes (e.g.
// "china_v1", "roman_empire") map to the backend topic name
// used in GET /explore/{topic}. china_v1 is a special case
// (the backend topic is "china_civilization_v1").
//
// Fallback: `_` for any prefix not in this map (redirect still
// works — the Shell can handle unknown topics gracefully).
// ------------------------------------------------------------------

// ------------------------------------------------------------------
// Legacy redirect functions — each returns the new URL or null
// when the hash doesn't match the legacy pattern.
// ------------------------------------------------------------------

function redirectM89(hash: string): string | null {
  if (hash === '#/m89') {
    return '#/explore/french-revolution/understanding'
  }
  return null
}

function redirectCausal(hash: string): string | null {
  const prefix = '#/causal/'
  if (!hash.startsWith(prefix)) return null

  const objectId = hash.slice(prefix.length)
  if (!objectId) return null

  // Derive topic from the causal object id via the prefix map.
  // co-001 → we need the actual object's cause_id to resolve the
  // topic. Since this is a startup-only redirect and we don't want
  // to import the full causal_objects.json (heavy, 26KB), we use a
  // static lookup built from the same data.
  const topic = CAUSAL_OBJECT_ID_TO_TOPIC[objectId] ?? '_'

  return `#/explore/${topic}/explanation/${objectId}`
}

function redirectPackage(hash: string): string | null {
  const prefix = '#/package/'
  if (!hash.startsWith(prefix)) return null

  const slug = hash.slice(prefix.length)
  if (!slug) return null

  return `#/explore/${slug}/exploration`
}

// ------------------------------------------------------------------
// Static causal object id → topic slug lookup.
//
// Hardcoded from causal_objects.json (12 objects, 2026-08-06).
// This is a startup-only redirect — keeping it static avoids a
// 26KB JSON import. When new causal objects are added, update
// this map (the build step will flag stale entries).
// ------------------------------------------------------------------
const CAUSAL_OBJECT_ID_TO_TOPIC: Record<string, string> = {
  'co-001': 'china_civilization_v1',
  'co-004': 'china_civilization_v1',
  'co-005': 'china_civilization_v1',
  'co-008': 'china_civilization_v1',
  'co-009': 'roman_empire',
  'co-010': 'china_civilization_v1',
  'co-011': 'china_civilization_v1',
  'co-012': 'china_civilization_v1',
  'co-013': 'ancient_india',
  'co-014': 'china_civilization_v1',
  'co-015': 'greek_philosophy',
  'co-016': 'silk_road',
}

/**
 * Attempt to redirect a legacy hash to a canonical route.
 *
 * @returns the canonical URL string if a redirect was performed,
 *          or null if the hash is already canonical / landing.
 *
 * IMPORTANT: This function SIDE-EFFECTS — it calls
 * history.replaceState. Call it ONCE at app startup.
 */
export function runLegacyRedirect(): string | null {
  if (typeof window === 'undefined') return null

  const hash = window.location.hash

  // Already canonical — nothing to do.
  if (!hash || hash === '#/' || hash.startsWith('#/explore/')) {
    return null
  }

  // Dev catalog — preserved, not migrated.
  if (hash === '#/dev/catalog') {
    return null
  }

  // Try each legacy pattern.
  const newUrl =
    redirectM89(hash) ??
    redirectCausal(hash) ??
    redirectPackage(hash) ??
    null

  if (newUrl) {
    history.replaceState(null, '', newUrl)
    return newUrl
  }

  return null
}
