// ============================================================
// M74 Phase1 — deterministic Topic Resolution
// Maps free-text queries (Chinese questions / aliases / names)
// to graph targets: an official Exploration Package or an entity.
//
// Design (M74 Phase1 Implementation Plan):
//   normalize -> ① QUICK_STARTS explicit mapping -> ② entity exact
//   -> ③ package title exact -> ④ package title contains -> null
//
// Hard constraints (PO Conditions, M74 Phase1 Coding Approval):
//   - ZERO AI / LLM / network: pure static mapping over bundled data.
//   - READ ONLY: never writes KG / entities / claims / sources.
//   - Deterministic: same input always yields the same output.
//   - Data reuse: getPackages() + getEntityByGlobalId() only — no
//     duplicate example-JSON imports.
// ============================================================

import {
  getPackages,
  getEntityByGlobalId,
  type ExplorationPackage,
} from './explorationPackages'

/** Resolution outcome: an official package, an entity, or no match. */
export type ResolvedTopic =
  | { kind: 'package'; slug: string }
  | { kind: 'entity'; globalId: string }
  | null

// LandingPage QUICK_STARTS (frontend/src/components/LandingPage.tsx) —
// explicit question -> package mapping. Keys are NORMALIZED forms.
const QUICK_START_ALIASES: Record<string, string> = {
  '凯撒为什么重要': 'roman-empire-exploration',
  '秦始皇统一六国以后发生了什么': 'china-civilization-v1',
  '罗马为什么灭亡': 'roman-empire-exploration',
  '丝绸之路改变了什么': 'silk-road-exploration',
}

/**
 * Normalize a free-text query: trim, strip full/half-width punctuation,
 * whitespace and quotes, lowercase. Underscores are KEPT (slug chars).
 * Deterministic, no side effects.
 */
export function normalizeQuery(raw: string): string {
  return raw
    .trim()
    .replace(/[？?。，、！!·:：;；'"“”‘’\s\-—]/g, '')
    .toLowerCase()
}

// ------------------------------------------------------------------
// Package / entity alias indexes (built lazily, module-level memo).
// ------------------------------------------------------------------

type EntityIndexEntry = { globalId: string; names: string[] }

let _pkgTitleIndex: Array<{ slug: string; names: string[] }> | null = null
let _entityIndex: EntityIndexEntry[] | null = null

function pkgTitleIndex(): Array<{ slug: string; names: string[] }> {
  if (_pkgTitleIndex) return _pkgTitleIndex
  _pkgTitleIndex = getPackages().map((pkg: ExplorationPackage) => ({
    slug: pkg.slug,
    names: [pkg.title.zh, pkg.title.en].filter(Boolean).map(normalizeQuery),
  }))
  return _pkgTitleIndex
}

function entityIndex(): EntityIndexEntry[] {
  if (_entityIndex) return _entityIndex
  const entries: EntityIndexEntry[] = []
  const seen = new Set<string>()
  for (const pkg of getPackages()) {
    for (const gid of pkg.entity_references) {
      if (seen.has(gid)) continue
      seen.add(gid)
      const e = getEntityByGlobalId(gid)
      if (!e) continue
      const names = [e.name, e.labels?.zh, e.labels?.en]
        .concat(e.aliases ?? [])
        .filter(Boolean)
        .map((n) => normalizeQuery(String(n)))
      if (names.length > 0) entries.push({ globalId: gid, names })
    }
  }
  _entityIndex = entries
  return _entityIndex
}

/**
 * Resolve a free-text query to a package / entity / null.
 * Pure and deterministic; never throws on arbitrary input.
 *
 * Match order (M74 Phase1 design):
 *   ① QUICK_STARTS explicit (question -> package)
 *   ② package title exact     (topic-level -> package)
 *   ③ package title contains  (partial topic -> package)
 *   ④ entity exact            (specific entity -> entity)
 */
export function resolveTopic(rawQuery: string): ResolvedTopic {
  if (typeof rawQuery !== 'string') return null
  const q = normalizeQuery(rawQuery)
  if (!q) return null

  // ① QUICK_STARTS explicit mapping (question -> package).
  const quickSlug = QUICK_START_ALIASES[q]
  if (quickSlug) return { kind: 'package', slug: quickSlug }

  // ② Package title exact match.
  for (const p of pkgTitleIndex()) {
    if (p.names.includes(q)) return { kind: 'package', slug: p.slug }
  }

  // ③ Package title contains (loose fallback for partial queries).
  for (const p of pkgTitleIndex()) {
    if (p.names.some((n) => n.includes(q))) return { kind: 'package', slug: p.slug }
  }

  // ④ Entity exact match (specific entity wins last — package is the
  //    exploration starting point, entity is the deep-dive target).
  for (const entry of entityIndex()) {
    if (entry.names.includes(q)) return { kind: 'entity', globalId: entry.globalId }
  }

  return null
}
