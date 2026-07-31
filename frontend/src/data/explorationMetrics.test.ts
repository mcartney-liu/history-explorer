import { describe, it, expect } from 'vitest'
import type { UserBehaviorEvent } from './UserBehaviorEvent'
import {
  sessionize,
  computeExplorationDepth,
  computePackageCoverage,
  computeCrossPackageExpansion,
  computeGuideInteraction,
  computeSourceViews,
  computeExplorationMetrics,
} from './explorationMetrics'

// Representative Exploration Event Sequence (NOT real user data — M71 Q5).
// Two sessions:
//   Session 1 (China package): open_package -> 3 entities -> journey click ->
//     guide next -> 2 more entities -> relationship click
//   Session 2 (gap > 30min; cross-package): open_package silk -> open_package
//     roman -> 1 entity -> recommendation click
function fixture(): UserBehaviorEvent[] {
  const t = (iso: string) => ({ timestamp: iso })
  return [
    // --- Session 1 (China) ---
    { action: 'open_package', packageSlug: 'china-civilization-v1', ...t('2026-07-31T10:00:00Z') },
    { action: 'open_entity', entityGlobalId: 'china_v1:idea-keju', ...t('2026-07-31T10:00:10Z') },
    { action: 'open_entity', entityGlobalId: 'china_v1:idea-wenguan', ...t('2026-07-31T10:00:25Z') },
    { action: 'click_relationship', ...t('2026-07-31T10:00:40Z') },
    { action: 'open_entity', entityGlobalId: 'china_v1:idea-neige', ...t('2026-07-31T10:01:00Z') },
    { action: 'click_journey', ...t('2026-07-31T10:01:20Z') },
    { action: 'click_guide_next', entityGlobalId: 'china_v1:tp-ming', ...t('2026-07-31T10:01:30Z') },
    { action: 'open_entity', entityGlobalId: 'china_v1:tp-ming', ...t('2026-07-31T10:01:35Z') },
    { action: 'open_entity', entityGlobalId: 'china_v1:tp-qing', ...t('2026-07-31T10:02:00Z') },
    // --- Session 2 (cross-package, after a >30min gap) ---
    { action: 'open_package', packageSlug: 'silk-road-exploration', ...t('2026-07-31T11:00:00Z') },
    { action: 'open_package', packageSlug: 'roman-empire-exploration', ...t('2026-07-31T11:00:20Z') },
    { action: 'open_entity', entityGlobalId: 'roman_empire:person-augustus', ...t('2026-07-31T11:00:40Z') },
    { action: 'click_recommendation', ...t('2026-07-31T11:01:00Z') },
  ]
}

describe('explorationMetrics (deterministic, M71)', () => {
  it('sessionizes the stream by time gap (30 min)', () => {
    const sessions = sessionize(fixture())
    expect(sessions.length).toBe(2)
    expect(sessions[0].events.length).toBe(9)
    expect(sessions[1].events.length).toBe(4)
  })

  it('computes Exploration Depth per session (entities / relationships / journey nodes)', () => {
    const d = computeExplorationDepth(fixture())
    expect(d.totalSessions).toBe(2)
    // Session 1: 5 distinct entities (keju, wenguan, neige, tp-ming, tp-qing)
    // Session 2: 1 distinct entity (augustus)
    expect(d.avgEntitiesPerSession).toBe(3)
    expect(d.totalEntityViews).toBe(6)
    // Session 1: 1 relationship click; Session 2: 0
    expect(d.avgRelationshipsPerSession).toBe(0.5)
    // Session 1: click_journey 1 + click_guide_next 1 = 2
    expect(d.totalJourneyNodes).toBe(2)
    expect(d.avgJourneyNodesPerSession).toBe(1)
  })

  it('computes Package Coverage Rate using the Guide coverage semantics', () => {
    const cov = computePackageCoverage(fixture())
    const china = cov.find((c) => c.packageSlug === 'china-civilization-v1')!
    // Entities visited inside the china window: keju, wenguan, neige, tp-ming, tp-qing
    expect(china.opened).toBe(true)
    expect(china.visitedEntities).toBe(5)
    expect(china.totalEntities).toBeGreaterThanOrEqual(5)
    // augustus was visited in the roman window, not china
    const roman = cov.find((c) => c.packageSlug === 'roman-empire-exploration')!
    expect(roman.opened).toBe(true)
    expect(roman.visitedEntities).toBe(1)
    // silk was opened but no entity visited in its window
    const silk = cov.find((c) => c.packageSlug === 'silk-road-exploration')!
    expect(silk.opened).toBe(true)
    expect(silk.visitedEntities).toBe(0)
  })

  it('computes Cross Package Expansion (distinct packages + crossing sessions)', () => {
    const x = computeCrossPackageExpansion(fixture())
    expect(x.distinctPackageCount).toBe(3)
    expect(x.openedPackages).toContain('china-civilization-v1')
    expect(x.openedPackages).toContain('roman-empire-exploration')
    expect(x.totalSessions).toBe(2)
    // Session 2 opened both silk and roman -> crossed
    expect(x.crossedSessions).toBe(1)
    expect(x.crossRate).toBe(0.5)
    expect(x.recommendationClicks).toBe(1)
  })

  it('computes Guide Interaction (descriptive comparison, no A/B stats)', () => {
    const g = computeGuideInteraction(fixture())
    expect(g.guideNextClicks).toBe(1)
    expect(g.sessionsWithGuideClicks).toBe(1)
    expect(g.totalSessions).toBe(2)
    expect(g.guideUsageRate).toBe(0.5)
    // Session with guide: 5 entities; without: 1 entity
    expect(g.avgDepthWithGuide).toBe(5)
    expect(g.avgDepthWithoutGuide).toBe(1)
  })

  it('combined snapshot exposes all five approved metrics', () => {
    const snap = computeExplorationMetrics(fixture())
    expect(snap.depth.totalSessions).toBe(2)
    expect(snap.coverage.length).toBeGreaterThanOrEqual(3)
    expect(snap.expansion.distinctPackageCount).toBe(3)
    expect(snap.guide.guideNextClicks).toBe(1)
    expect(snap.sourceViews.totalViews).toBe(0)
    expect(snap.sourceViews.distinctSources).toBe(0)
    expect(typeof snap.generatedAt).toBe('string')
  })

  it('returns zero-valued metrics for an empty stream (no crash)', () => {
    const d = computeExplorationDepth([])
    expect(d.totalSessions).toBe(0)
    expect(d.avgEntitiesPerSession).toBe(0)
    const g = computeGuideInteraction([])
    expect(g.guideUsageRate).toBe(0)
    const x = computeCrossPackageExpansion([])
    expect(x.distinctPackageCount).toBe(0)
    expect(x.crossRate).toBe(0)
  })

  // M72 Line2 — view_source events must NOT pollute Depth counters, and
  // open_entity with a gid attributes correctly (finding E fix).
  it('view_source events do not inflate Depth (journey-node / entity counts)', () => {
    const t = (iso: string) => ({ timestamp: iso })
    const stream: UserBehaviorEvent[] = [
      { action: 'open_package', packageSlug: 'china-civilization-v1', ...t('2026-07-31T12:00:00Z') },
      { action: 'open_entity', entityGlobalId: 'china_v1:idea-keju', ...t('2026-07-31T12:00:10Z') },
      { action: 'view_source', sourceId: 'src-cn-qianmu', ...t('2026-07-31T12:00:20Z') },
      { action: 'view_source', sourceId: 'src-cn-museum', ...t('2026-07-31T12:00:25Z') },
      { action: 'open_entity', entityGlobalId: 'china_v1:idea-keju', ...t('2026-07-31T12:00:30Z') },
    ]
    const d = computeExplorationDepth(stream)
    // Same entity visited twice -> deduped to 1 distinct entity.
    expect(d.totalEntityViews).toBe(1)
    // view_source is NOT a journey node / relationship click.
    expect(d.totalJourneyNodes).toBe(0)
    expect(d.totalRelationshipClicks).toBe(0)
    const cov = computePackageCoverage(stream)
    const china = cov.find((c) => c.packageSlug === 'china-civilization-v1')!
    expect(china.visitedEntities).toBe(1)
  })

  // M73 Phase3-B Metrics Closure — Source View aggregates the ALREADY
  // emitted view_source stream (no new telemetry).
  it('computes Source View (total / distinct / per-session / top sources)', () => {
    const t = (iso: string) => ({ timestamp: iso })
    const stream: UserBehaviorEvent[] = [
      // Session 1: 3 views across 2 distinct sources (one repeat).
      { action: 'open_package', packageSlug: 'china-civilization-v1', ...t('2026-07-31T13:00:00Z') },
      { action: 'view_source', sourceId: 'src-cn-qianmu', ...t('2026-07-31T13:00:10Z') },
      { action: 'view_source', sourceId: 'src-cn-qianmu', ...t('2026-07-31T13:00:20Z') },
      { action: 'view_source', sourceId: 'src-cn-museum', ...t('2026-07-31T13:00:30Z') },
      // Session 2 (gap > 30min): 1 view of another source.
      { action: 'open_package', packageSlug: 'roman-empire-exploration', ...t('2026-07-31T14:00:00Z') },
      { action: 'view_source', sourceId: 'src-rom-augustus', ...t('2026-07-31T14:00:10Z') },
    ]
    const s = computeSourceViews(stream)
    expect(s.totalViews).toBe(4)
    expect(s.distinctSources).toBe(3)
    expect(s.avgViewsPerSession).toBe(2)
    expect(s.sessionsWithSourceViews).toBe(2)
    expect(s.sourceUsageRate).toBe(1)
    expect(s.topSources).toHaveLength(3)
    expect(s.topSources[0]).toEqual({ sourceId: 'src-cn-qianmu', count: 2 })
  })

  it('Source View ignores view_source events without a sourceId (defensive)', () => {
    const t = (iso: string) => ({ timestamp: iso })
    const stream: UserBehaviorEvent[] = [
      { action: 'view_source', ...t('2026-07-31T15:00:00Z') },
      { action: 'view_source', sourceId: 'src-cn-qianmu', ...t('2026-07-31T15:00:10Z') },
    ]
    const s = computeSourceViews(stream)
    expect(s.totalViews).toBe(1)
    expect(s.distinctSources).toBe(1)
    expect(s.topSources).toEqual([{ sourceId: 'src-cn-qianmu', count: 1 }])
  })

  it('Source View returns zero-valued metrics for an empty stream', () => {
    const s = computeSourceViews([])
    expect(s.totalViews).toBe(0)
    expect(s.distinctSources).toBe(0)
    expect(s.avgViewsPerSession).toBe(0)
    expect(s.sessionsWithSourceViews).toBe(0)
    expect(s.sourceUsageRate).toBe(0)
    expect(s.topSources).toEqual([])
  })
})
