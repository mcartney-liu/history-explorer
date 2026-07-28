import { describe, it, expect } from 'vitest'
import { analyzeExplorationDepth } from './ExplorationDepth'
import type { UserBehaviorEvent } from './UserBehaviorEvent'

describe('ExplorationDepth', () => {
  it('empty events → maxDepth 0', () => {
    const result = analyzeExplorationDepth([])
    expect(result.maxDepth).toBe(0)
    expect(result.depthDistribution.level0).toBe(1)
  })

  it('open_entity only → maxDepth 1 (surface)', () => {
    const events: UserBehaviorEvent[] = [
      { action: 'open_entity', timestamp: '2026-01-01T00:00:00Z' },
    ]
    const result = analyzeExplorationDepth(events)
    expect(result.maxDepth).toBe(1)
    expect(result.depthDistribution.level1).toBe(1)
  })

  it('open_entity + switch_tab → maxDepth 2 (browse)', () => {
    const events: UserBehaviorEvent[] = [
      { action: 'open_entity', timestamp: '2026-01-01T00:00:00Z' },
      { action: 'switch_tab', tab: 'explore', timestamp: '2026-01-01T00:01:00Z' },
    ]
    const result = analyzeExplorationDepth(events)
    expect(result.maxDepth).toBe(2)
    expect(result.depthDistribution.level2).toBe(1)
  })

  it('click_journey → maxDepth 3 (explore)', () => {
    const events: UserBehaviorEvent[] = [
      { action: 'open_entity', timestamp: '2026-01-01T00:00:00Z' },
      { action: 'switch_tab', tab: 'explore', timestamp: '2026-01-01T00:01:00Z' },
      { action: 'click_journey', timestamp: '2026-01-01T00:02:00Z' },
    ]
    const result = analyzeExplorationDepth(events)
    expect(result.maxDepth).toBe(3)
    expect(result.depthDistribution.level3).toBe(1)
  })

  it('start_research + save_research → maxDepth 5 (deep)', () => {
    const events: UserBehaviorEvent[] = [
      { action: 'start_research', timestamp: '2026-01-01T00:00:00Z' },
      { action: 'save_research', timestamp: '2026-01-01T00:01:00Z' },
    ]
    const result = analyzeExplorationDepth(events)
    expect(result.maxDepth).toBe(5)
    expect(result.depthDistribution.level5).toBe(1)
  })

  it('start_comparison alone → maxDepth 5 (deep)', () => {
    const events: UserBehaviorEvent[] = [
      { action: 'start_comparison', timestamp: '2026-01-01T00:00:00Z' },
    ]
    const result = analyzeExplorationDepth(events)
    expect(result.maxDepth).toBe(5)
    expect(result.insights.some((s) => s.includes('深度'))).toBe(true)
  })

  it('mixed events → highest depth wins', () => {
    const events: UserBehaviorEvent[] = [
      { action: 'open_discover', timestamp: '2026-01-01T00:00:00Z' },
      { action: 'open_entity', timestamp: '2026-01-01T00:01:00Z' },
      { action: 'switch_tab', tab: 'info', timestamp: '2026-01-01T00:02:00Z' },
      { action: 'start_chat', timestamp: '2026-01-01T00:03:00Z' },
      { action: 'start_research', timestamp: '2026-01-01T00:04:00Z' },
    ]
    const result = analyzeExplorationDepth(events)
    // start_research alone → level 4; start_chat → level 3; switch_tab → level 2
    // Highest: level 4
    expect(result.maxDepth).toBe(4)
    expect(result.depthDistribution.level4).toBe(1)
  })

  it('deterministic — same events twice, same result', () => {
    const events: UserBehaviorEvent[] = [
      { action: 'open_entity', timestamp: '2026-01-01T00:00:00Z' },
      { action: 'click_journey', timestamp: '2026-01-01T00:01:00Z' },
    ]
    const r1 = analyzeExplorationDepth(events)
    const r2 = analyzeExplorationDepth(events)
    expect(r1.maxDepth).toBe(r2.maxDepth)
    expect(r1.depthDistribution).toEqual(r2.depthDistribution)
  })

  it('uses neutral language — no "failed" or "lost"', () => {
    const events: UserBehaviorEvent[] = [
      { action: 'open_entity', timestamp: '2026-01-01T00:00:00Z' },
    ]
    const result = analyzeExplorationDepth(events)
    for (const insight of result.insights) {
      expect(insight).not.toMatch(/失败|丢失|放弃/i)
    }
  })
})
