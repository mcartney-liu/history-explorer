import { describe, it, expect } from 'vitest'
import { analyzeExplorationBehaviors } from './ExplorationBehaviors'
import type { UserBehaviorEvent } from './UserBehaviorEvent'

describe('ExplorationBehaviors', () => {
  it('returns unknown for empty events', () => {
    const result = analyzeExplorationBehaviors([])
    expect(result.dominantPattern).toBe('unknown')
    expect(result.confidence).toBe(0)
    expect(result.patterns).toContain('unknown')
  })

  it('detects quick_lookup for open_entity only', () => {
    const events: UserBehaviorEvent[] = [
      { action: 'open_entity', timestamp: '2026-01-01T00:00:00Z' },
    ]
    const result = analyzeExplorationBehaviors(events)
    expect(result.dominantPattern).toBe('quick_lookup')
    expect(result.confidence).toBe(0.4)
    expect(result.insights.some((s) => s.includes('快速查阅'))).toBe(true)
  })

  it('detects research_loop for start + save', () => {
    const events: UserBehaviorEvent[] = [
      { action: 'start_research', timestamp: '2026-01-01T00:00:00Z' },
      { action: 'save_research', timestamp: '2026-01-01T00:01:00Z' },
    ]
    const result = analyzeExplorationBehaviors(events)
    expect(result.dominantPattern).toBe('research_loop')
    expect(result.confidence).toBe(0.85)
    expect(result.patterns).toContain('research_loop')
  })

  it('detects comparison_research', () => {
    const events: UserBehaviorEvent[] = [
      { action: 'start_comparison', timestamp: '2026-01-01T00:00:00Z' },
    ]
    const result = analyzeExplorationBehaviors(events)
    expect(result.dominantPattern).toBe('comparison_research')
    expect(result.confidence).toBe(0.9)
    expect(result.insights[0]).toContain('多实体比较')
  })

  it('detects deep_exploration from journey + tab + chat', () => {
    const events: UserBehaviorEvent[] = [
      { action: 'switch_tab', tab: 'explore', timestamp: '2026-01-01T00:00:00Z' },
      { action: 'click_journey', timestamp: '2026-01-01T00:01:00Z' },
      { action: 'start_chat', timestamp: '2026-01-01T00:02:00Z' },
    ]
    const result = analyzeExplorationBehaviors(events)
    expect(result.dominantPattern).toBe('deep_exploration')
    expect(result.confidence).toBe(0.7)
  })

  it('comparison overrides research in priority conflict', () => {
    const events: UserBehaviorEvent[] = [
      { action: 'open_entity', timestamp: '2026-01-01T00:00:00Z' },
      { action: 'start_research', timestamp: '2026-01-01T00:01:00Z' },
      { action: 'start_comparison', timestamp: '2026-01-01T00:02:00Z' },
    ]
    const result = analyzeExplorationBehaviors(events)
    expect(result.dominantPattern).toBe('comparison_research')
    expect(result.patterns).toContain('comparison_research')
  })

  it('limited_exploration uses neutral language (no "failed")', () => {
    const events: UserBehaviorEvent[] = [
      { action: 'open_entity', timestamp: '2026-01-01T00:00:00Z' },
      { action: 'switch_tab', tab: 'info', timestamp: '2026-01-01T00:01:00Z' },
    ]
    const result = analyzeExplorationBehaviors(events)
    expect(result.dominantPattern).toBe('limited_exploration')
    // Should NOT use "failed" or "abandoned" language
    for (const insight of result.insights) {
      expect(insight).not.toMatch(/失败|废弃|放弃/i)
    }
  })

  it('produces deterministic output across multiple runs', () => {
    const events: UserBehaviorEvent[] = [
      { action: 'open_entity', timestamp: '2026-01-01T00:00:00Z' },
      { action: 'click_journey', timestamp: '2026-01-01T00:01:00Z' },
    ]
    const r1 = analyzeExplorationBehaviors(events)
    const r2 = analyzeExplorationBehaviors(events)
    expect(r1.dominantPattern).toBe(r2.dominantPattern)
    expect(r1.confidence).toBe(r2.confidence)
    expect(r1.patterns).toEqual(r2.patterns)
  })

  it('restore_research alone triggers research_loop', () => {
    const events: UserBehaviorEvent[] = [
      { action: 'restore_research', timestamp: '2026-01-01T00:00:00Z' },
    ]
    const result = analyzeExplorationBehaviors(events)
    expect(result.dominantPattern).toBe('research_loop')
  })
})
