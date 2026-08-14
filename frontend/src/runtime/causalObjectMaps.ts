// P1-② (Engineering Health, 2026-08-14): pure-derived causal-object maps and
// the curated "featured topics" filter, relocated out of App.tsx.
//
// This is a PURE RELOCATION — the computation below is byte-for-byte identical
// to the original `useMemo` / `const` in App.tsx. Only the location moved:
//   * App keeps the `useMemo(..., [])` wrapper so memoization behavior (empty
//     deps) is preserved exactly;
//   * the featured filter keeps its per-render recompute (was a plain const).
// Call sites in App.tsx are unchanged. No logic, behavior, or types altered.

import type { CausalObjectData } from '../data/causalStatement'
import type { TopicSummary } from '../components/LandingPage'
import { featuredSlugs } from '../data/siteConfig'

export interface CausalObjectMaps {
  causalObjectsById: Record<string, CausalObjectData>
  causalObjectTitleMap: Record<string, string>
}

export function buildCausalObjectMaps(
  causalObjects: CausalObjectData[],
): CausalObjectMaps {
  const causalObjectsById = Object.fromEntries(
    causalObjects.map((o) => [o.id, o]),
  )
  const causalObjectTitleMap = Object.fromEntries(
    causalObjects.map((o) => {
      // Derive a human-readable title from cause_id + effect_id
      // TODO M85.8+: resolve Entity GID → display name from KG data
      const causeLabel = o.cause_id.includes(':') ? o.cause_id.split(':').pop() ?? o.cause_id : o.cause_id
      const effectLabel = o.effect_id.includes(':') ? o.effect_id.split(':').pop() ?? o.effect_id : o.effect_id
      return [o.id, `${causeLabel} → ${effectLabel}`]
    }),
  )
  return { causalObjectsById, causalObjectTitleMap }
}

export function buildFeaturedTopics(topics: TopicSummary[]): TopicSummary[] {
  return featuredSlugs()
    .map((slug) => topics.find((t) => t.topic === slug))
    .filter((t): t is TopicSummary => Boolean(t))
}
