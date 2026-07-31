// ============================================================
// M71 Phase 1 — explorationMetrics
// Deterministic exploration-engagement metrics for the
// Exploration Validation milestone. Consumes the SAME
// UserBehaviorEvent stream (localStorage, anonymous) that powers
// ProductUsageAnalysis / ExplorationGuide — read-only, never
// writes events, never builds a user profile.
//
// Scope (PO-approved 2026-07-31):
//   - Exploration Depth
//   - Package Coverage Rate
//   - Cross Package Expansion
//   - Guide Interaction
// Deferred (no stable product definition yet): Completion Rate.
//
// Zero AI. Zero backend. Zero personalization. Metrics are
// descriptive aggregates only — NOT used for ranking/recommendation.
// ============================================================

import type { UserBehaviorEvent, BehaviorAction } from './UserBehaviorEvent'
import { getPackages, type ExplorationPackage } from './explorationPackages'
import { getExplorationCoverage } from './explorationGuide'

// -----------------------------------------------------------
// Sessionization — time-window approximation (no session ids in
// the anonymous local stream; gap > gapMinutes starts a new session).
// -----------------------------------------------------------

export interface SessionWindow {
  events: UserBehaviorEvent[]
  startedAt: string
  endedAt: string
}

export const DEFAULT_SESSION_GAP_MINUTES = 30

export function sessionize(
  events: UserBehaviorEvent[],
  gapMinutes = DEFAULT_SESSION_GAP_MINUTES,
): SessionWindow[] {
  const sorted = [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  )
  const sessions: SessionWindow[] = []
  let current: UserBehaviorEvent[] = []
  let windowStart = ''
  let windowEnd = ''

  const flush = () => {
    if (current.length === 0) return
    sessions.push({
      events: current,
      startedAt: windowStart,
      endedAt: windowEnd,
    })
    current = []
  }

  for (const e of sorted) {
    const t = e.timestamp
    if (current.length === 0) {
      current = [e]
      windowStart = t
      windowEnd = t
      continue
    }
    const gapMs =
      new Date(t).getTime() - new Date(windowEnd).getTime()
    if (gapMs > gapMinutes * 60_000) {
      flush()
      current = [e]
      windowStart = t
      windowEnd = t
    } else {
      current.push(e)
      windowEnd = t
    }
  }
  flush()
  return sessions
}

function countByAction(events: UserBehaviorEvent[], action: BehaviorAction): number {
  return events.filter((e) => e.action === action).length
}

// -----------------------------------------------------------
// 1. Exploration Depth — how deep a user explores (per session).
// -----------------------------------------------------------

export interface DepthMetric {
  totalSessions: number
  /** Average distinct entities opened per session (open_entity). */
  avgEntitiesPerSession: number
  /** Average relationship clicks per session (click_relationship). */
  avgRelationshipsPerSession: number
  /** Average journey nodes per session (click_journey + click_guide_next). */
  avgJourneyNodesPerSession: number
  totalEntityViews: number
  totalRelationshipClicks: number
  totalJourneyNodes: number
}

export function computeExplorationDepth(events: UserBehaviorEvent[]): DepthMetric {
  const sessions = sessionize(events)
  if (sessions.length === 0) {
    return {
      totalSessions: 0,
      avgEntitiesPerSession: 0,
      avgRelationshipsPerSession: 0,
      avgJourneyNodesPerSession: 0,
      totalEntityViews: 0,
      totalRelationshipClicks: 0,
      totalJourneyNodes: 0,
    }
  }
  const perSession = sessions.map((s) => {
    const entityViews = new Set(
      s.events
        .filter((e) => e.action === 'open_entity' && e.entityGlobalId)
        .map((e) => e.entityGlobalId),
    ).size
    const relClicks = countByAction(s.events, 'click_relationship')
    const journeyNodes =
      countByAction(s.events, 'click_journey') + countByAction(s.events, 'click_guide_next')
    return { entityViews, relClicks, journeyNodes }
  })
  const sum = (f: (x: { entityViews: number; relClicks: number; journeyNodes: number }) => number) =>
    perSession.reduce((acc, x) => acc + f(x), 0)
  const n = sessions.length
  return {
    totalSessions: n,
    avgEntitiesPerSession: sum((x) => x.entityViews) / n,
    avgRelationshipsPerSession: sum((x) => x.relClicks) / n,
    avgJourneyNodesPerSession: sum((x) => x.journeyNodes) / n,
    totalEntityViews: sum((x) => x.entityViews),
    totalRelationshipClicks: sum((x) => x.relClicks),
    totalJourneyNodes: sum((x) => x.journeyNodes),
  }
}

// -----------------------------------------------------------
// 2. Package Coverage Rate — visited entities/relationships vs
//    each package's reference set. Uses the SAME deterministic
//    getExplorationCoverage as the Guide (single source of truth).
//    Attribution: open_entity events occurring inside an
//    open_package(pkg) window (until the next open_package or
//    session end) are attributed to that package. This is an
//    approximation (no explicit session/context ids — see M71 R2).
// -----------------------------------------------------------

export interface PackageCoverageMetric {
  packageSlug: string
  opened: boolean
  visitedEntities: number
  totalEntities: number
  entityPercent: number
  visitedRelationships: number
  totalRelationships: number
  relationshipPercent: number
}

function packageWindowEntities(
  events: UserBehaviorEvent[],
  pkgSlug: string,
): string[] {
  const gids: string[] = []
  let inside = false
  for (const e of events) {
    if (e.action === 'open_package') {
      inside = e.packageSlug === pkgSlug
      continue
    }
    if (inside && e.action === 'open_entity' && e.entityGlobalId) {
      gids.push(e.entityGlobalId)
    }
  }
  return [...new Set(gids)]
}

export function computePackageCoverage(
  events: UserBehaviorEvent[],
  packages: ExplorationPackage[] = getPackages(),
): PackageCoverageMetric[] {
  return packages.map((pkg) => {
    const windowEntities = packageWindowEntities(events, pkg.slug)
    const coverage = getExplorationCoverage(pkg, windowEntities)
    return {
      packageSlug: pkg.slug,
      opened: events.some((e) => e.action === 'open_package' && e.packageSlug === pkg.slug),
      visitedEntities: coverage.visitedEntities,
      totalEntities: coverage.totalEntities,
      entityPercent: coverage.entityPercent,
      visitedRelationships: coverage.visitedRelationships,
      totalRelationships: coverage.totalRelationships,
      relationshipPercent: coverage.relationshipPercent,
    }
  })
}

// -----------------------------------------------------------
// 3. Cross Package Expansion — do users move across packages?
// -----------------------------------------------------------

export interface ExpansionMetric {
  openedPackages: string[]
  distinctPackageCount: number
  /** Sessions where >=2 distinct packages were opened. */
  crossedSessions: number
  totalSessions: number
  /** crossedSessions / totalSessions (0 when no sessions). */
  crossRate: number
  /** click_recommendation total (reusable signal for recommended_next). */
  recommendationClicks: number
}

export function computeCrossPackageExpansion(events: UserBehaviorEvent[]): ExpansionMetric {
  const sessions = sessionize(events)
  const openedPackages = [
    ...new Set(
      events
        .filter((e) => e.action === 'open_package' && e.packageSlug)
        .map((e) => e.packageSlug as string),
    ),
  ]
  const crossedSessions = sessions.filter(
    (s) => new Set(s.events.filter((e) => e.action === 'open_package').map((e) => e.packageSlug)).size >= 2,
  ).length
  return {
    openedPackages,
    distinctPackageCount: openedPackages.length,
    crossedSessions,
    totalSessions: sessions.length,
    crossRate: sessions.length === 0 ? 0 : crossedSessions / sessions.length,
    recommendationClicks: countByAction(events, 'click_recommendation'),
  }
}

// -----------------------------------------------------------
// 4. Guide Interaction — did the deterministic Guide drive depth?
//    DESCRIPTIVE comparison only (PO D3: no A/B statistical test
//    at this scale).
// -----------------------------------------------------------

export interface GuideMetric {
  guideNextClicks: number
  sessionsWithGuideClicks: number
  totalSessions: number
  guideUsageRate: number
  /** Avg entities per session among sessions that used the Guide. */
  avgDepthWithGuide: number
  /** Avg entities per session among sessions that did NOT use the Guide. */
  avgDepthWithoutGuide: number
}

export function computeGuideInteraction(events: UserBehaviorEvent[]): GuideMetric {
  const sessions = sessionize(events)
  const withGuide = sessions.filter((s) =>
    s.events.some((e) => e.action === 'click_guide_next'),
  )
  const withoutGuide = sessions.filter(
    (s) => !s.events.some((e) => e.action === 'click_guide_next'),
  )
  const avgEntities = (list: SessionWindow[]): number =>
    list.length === 0
      ? 0
      : list.reduce(
          (acc, s) =>
            acc +
            new Set(
              s.events
                .filter((e) => e.action === 'open_entity' && e.entityGlobalId)
                .map((e) => e.entityGlobalId),
            ).size,
          0,
        ) / list.length

  return {
    guideNextClicks: countByAction(events, 'click_guide_next'),
    sessionsWithGuideClicks: withGuide.length,
    totalSessions: sessions.length,
    guideUsageRate: sessions.length === 0 ? 0 : withGuide.length / sessions.length,
    avgDepthWithGuide: avgEntities(withGuide),
    avgDepthWithoutGuide: avgEntities(withoutGuide),
  }
}

// -----------------------------------------------------------
// Combined snapshot — one call, all approved metrics.
// -----------------------------------------------------------

export interface ExplorationMetricsSnapshot {
  depth: DepthMetric
  coverage: PackageCoverageMetric[]
  expansion: ExpansionMetric
  guide: GuideMetric
  generatedAt: string
}

export function computeExplorationMetrics(events: UserBehaviorEvent[]): ExplorationMetricsSnapshot {
  return {
    depth: computeExplorationDepth(events),
    coverage: computePackageCoverage(events),
    expansion: computeCrossPackageExpansion(events),
    guide: computeGuideInteraction(events),
    generatedAt: new Date().toISOString(),
  }
}
