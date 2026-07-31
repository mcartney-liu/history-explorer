import { describe, it, expect } from 'vitest'
import type { UserBehaviorEvent } from './UserBehaviorEvent'
import {
  sessionize,
  computeExplorationDepth,
  computePackageCoverage,
  computeCrossPackageExpansion,
  computeGuideInteraction,
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

  it('combined snapshot exposes all four approved metrics', () => {
    const snap = computeExplorationMetrics(fixture())
    expect(snap.depth.totalSessions).toBe(2)
    expect(snap.coverage.length).toBeGreaterThanOrEqual(3)
    expect(snap.expansion.distinctPackageCount).toBe(3)
    expect(snap.guide.guideNextClicks).toBe(1)
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
})
