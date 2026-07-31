import {
  getEntityByGlobalId,
  getEntityDisplayName,
  type ExplorationPackage,
  type Locale,
  type RelationshipPathRef,
} from './explorationPackages'
import { RELATIONSHIP_TEMPLATES } from './understandingRules'
import type { UserBehaviorEvent } from './UserBehaviorEvent'

// ============================================================================
// M70 — Exploration Guide（探索向导）: DETERMINISTIC exploration navigation.
//
// This is NOT an AI / chat / assistant. It is a pure-function navigation aid
// computed from three frozen inputs:
//   1. the Knowledge Graph (via the Package contract + cross-dataset entity index)
//   2. the Package's curated relationship_paths (真实边，策展顺序)
//   3. the visitor's visited-entity trail (from behavior events)
//
// Explicit prohibitions (PO, M70):
//   - no LLM runtime, no free-form Q&A, no generated historical facts
//   - no scoring / ranking / personalization — next steps keep the Package's
//     curated declaration order; nothing is re-ordered by user profile.
// Same input → same output, always.
// ============================================================================

export interface GuidePosition {
  entityGlobalId: string
  name: string
  type: string
  /** true when the visitor has not yet entered any entity of this package */
  atEntry: boolean
}

export interface GuideStep {
  edge: RelationshipPathRef
  fromName: string
  toName: string
  toType: string
  reason: string
  perspective: string
}

export interface GuideCoverage {
  totalEntities: number
  visitedEntities: number
  totalRelationships: number
  visitedRelationships: number
  entityPercent: number
  relationshipPercent: number
}

export interface GuideSnapshot {
  position: GuidePosition | null
  nextSteps: GuideStep[]
  coverage: GuideCoverage
}

function visitedSet(visited: string[]): Set<string> {
  return new Set(visited)
}

function entityLabel(gid: string, locale: Locale): string {
  return getEntityDisplayName(gid, locale)
}

function entityType(gid: string): string {
  return getEntityByGlobalId(gid)?.type ?? ''
}

// --- 1. Current position -----------------------------------------------
// The last entity of this package the visitor entered (trail order). When the
// visitor has not entered any package entity yet, returns the package entry
// (first curated entity_reference) with atEntry=true.
export function getCurrentPosition(
  pkg: ExplorationPackage,
  visited: string[],
  locale: Locale = 'zh',
): GuidePosition | null {
  const inPackage = visited.filter((gid) => pkg.entity_references.includes(gid))
  if (inPackage.length === 0) {
    const entry = pkg.entity_references[0]
    if (!entry) return null
    const e = getEntityByGlobalId(entry)
    return e
      ? { entityGlobalId: entry, name: entityLabel(entry, locale), type: e.type, atEntry: true }
      : null
  }
  const last = inPackage[inPackage.length - 1]
  const e = getEntityByGlobalId(last)
  return e
    ? { entityGlobalId: last, name: entityLabel(last, locale), type: e.type, atEntry: false }
    : null
}

// --- 2. Next steps ------------------------------------------------------
// Graph-reachable, unvisited real edges ONLY. A step is suggested when its
// target is not yet visited AND either its source was visited OR the visitor
// is at the package entry (nothing visited yet). Output keeps the Package's
// curated declaration order — NO scoring / ranking / personalization.
export function getNextSteps(
  pkg: ExplorationPackage,
  visited: string[],
  locale: Locale = 'zh',
): GuideStep[] {
  const v = visitedSet(visited)
  const nothingVisited = v.size === 0
  const steps: GuideStep[] = []
  for (const edge of pkg.relationship_paths) {
    if (v.has(edge.to)) continue
    if (!nothingVisited && !v.has(edge.from)) continue
    const fromName = entityLabel(edge.from, locale)
    const toName = entityLabel(edge.to, locale)
    const template = RELATIONSHIP_TEMPLATES[edge.type]
    const explained = template
      ? template.forward({
          relationType: edge.type,
          direction: 'forward',
          actorName: fromName,
          targetName: toName,
          targetType: entityType(edge.to),
        })
      : { meaning: `Related to ${toName}.`, perspective: 'related' }
    steps.push({
      edge,
      fromName,
      toName,
      toType: entityType(edge.to),
      reason: explained.meaning,
      perspective: explained.perspective,
    })
  }
  return steps
}

// --- 3. Coverage --------------------------------------------------------
// Visited entities / completed edges versus the Package's curated reference
// set. Percentages are floor-rounded deterministic integers.
export function getExplorationCoverage(
  pkg: ExplorationPackage,
  visited: string[],
): GuideCoverage {
  const v = visitedSet(visited)
  const totalEntities = pkg.entity_references.length
  const visitedEntities = pkg.entity_references.filter((gid) => v.has(gid)).length
  const totalRelationships = pkg.relationship_paths.length
  const visitedRelationships = pkg.relationship_paths.filter(
    (p) => v.has(p.from) && v.has(p.to),
  ).length
  const pct = (n: number, d: number): number => (d === 0 ? 0 : Math.floor((n / d) * 100))
  return {
    totalEntities,
    visitedEntities,
    totalRelationships,
    visitedRelationships,
    entityPercent: pct(visitedEntities, totalEntities),
    relationshipPercent: pct(visitedRelationships, totalRelationships),
  }
}

// --- Snapshot -----------------------------------------------------------
export function getGuideSnapshot(
  pkg: ExplorationPackage,
  visited: string[],
  locale: Locale = 'zh',
): GuideSnapshot {
  return {
    position: getCurrentPosition(pkg, visited, locale),
    nextSteps: getNextSteps(pkg, visited, locale),
    coverage: getExplorationCoverage(pkg, visited),
  }
}

// --- Event stream → visited trail --------------------------------------
// Extracts the visited-entity trail (deduped, first-visit order) from a
// UserBehaviorEvent stream. The SAME event stream already powers the
// deterministic ProductUsageAnalysis (M43–M49) — this is the consume-only
// reuse proof (Q-B: no module convergence / refactor, only reuse).
export function visitedFromEvents(events: UserBehaviorEvent[]): string[] {
  const seen = new Set<string>()
  const trail: string[] = []
  for (const e of events) {
    const gid = e.entityGlobalId
    if (!gid) continue
    if (!seen.has(gid)) {
      seen.add(gid)
      trail.push(gid)
    }
  }
  return trail
}
