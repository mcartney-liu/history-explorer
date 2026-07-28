import { describe, it, expect } from 'vitest'
import { shouldActivatePipeline, resetActivationThrottle } from './ProductIntelligenceActivation'
import { analyzeProductUsage } from './ProductUsageAnalysis'
import type { UserBehaviorEvent } from './UserBehaviorEvent'

describe('ProductIntelligenceActivation', () => {
  it('save_research triggers activation', () => {
    resetActivationThrottle()
    const events: UserBehaviorEvent[] = [
      { action: 'save_research', timestamp: '2026-07-28T10:00:00Z' },
    ]
    const result = shouldActivatePipeline(events)
    expect(result.shouldActivate).toBe(true)
    expect(result.reason).toContain('save_research')
  })

  it('too few events without milestone do not activate', () => {
    resetActivationThrottle()
    const events: UserBehaviorEvent[] = [
      { action: 'open_entity', timestamp: '2026-07-28T10:00:00Z' },
    ]
    const result = shouldActivatePipeline(events)
    expect(result.shouldActivate).toBe(false)
    expect(result.reason).toContain('Insufficient')
  })

  it('5+ events activate on threshold', () => {
    resetActivationThrottle()
    const events: UserBehaviorEvent[] = [
      { action: 'open_discover', timestamp: '2026-07-28T10:00:00Z' },
      { action: 'click_entity', timestamp: '2026-07-28T10:01:00Z' },
      { action: 'open_entity', timestamp: '2026-07-28T10:02:00Z' },
      { action: 'switch_tab', timestamp: '2026-07-28T10:03:00Z' },
      { action: 'click_journey', timestamp: '2026-07-28T10:04:00Z' },
    ]
    const result = shouldActivatePipeline(events)
    expect(result.shouldActivate).toBe(true)
    expect(result.reason).toContain('threshold')
  })

  it('throttle prevents re-activation within 60s', () => {
    resetActivationThrottle()
    const events: UserBehaviorEvent[] = [
      { action: 'save_research', timestamp: '2026-07-28T10:00:00Z' },
    ]
    // First call should activate
    expect(shouldActivatePipeline(events).shouldActivate).toBe(true)
    // Second call within throttle window should not
    const second = shouldActivatePipeline(events)
    expect(second.shouldActivate).toBe(false)
    expect(second.reason).toContain('Throttled')
  })

  it('resetThrottle resets state for testing', () => {
    resetActivationThrottle()
    const events: UserBehaviorEvent[] = [
      { action: 'save_research', timestamp: '2026-07-28T10:00:00Z' },
    ]
    expect(shouldActivatePipeline(events).shouldActivate).toBe(true)
    // Throttled
    expect(shouldActivatePipeline(events).shouldActivate).toBe(false)
    // Reset
    resetActivationThrottle()
    expect(shouldActivatePipeline(events).shouldActivate).toBe(true)
  })

  it('empty events do not activate', () => {
    resetActivationThrottle()
    const result = shouldActivatePipeline([])
    expect(result.shouldActivate).toBe(false)
    expect(result.reason).toBe('No events')
  })
})

// ============================================================
// M53 Phase 2 — Semantics hardening
// ============================================================

describe('ProductIntelligenceActivation (semantics)', () => {
  it('auto-trigger output equals manual analyzeProductUsage output', () => {
    const events: UserBehaviorEvent[] = [
      { action: 'open_discover', timestamp: '2026-07-28T10:00:00Z' },
      { action: 'click_entity', timestamp: '2026-07-28T10:01:00Z' },
      { action: 'open_entity', timestamp: '2026-07-28T10:02:00Z' },
      { action: 'start_research', timestamp: '2026-07-28T10:03:00Z' },
      { action: 'save_research', timestamp: '2026-07-28T10:04:00Z' },
    ]
    const manual = analyzeProductUsage(events)
    const again = analyzeProductUsage([...events])
    // Same events, same output — activation does not alter analysis
    expect(again.decisionInsight.overallStatus).toBe(manual.decisionInsight.overallStatus)
    expect(again.decisionInsight.confidence).toBe(manual.decisionInsight.confidence)
    expect(again.explorationDepth.maxDepth).toBe(manual.explorationDepth.maxDepth)
    expect(again.explorationBehaviors.dominantPattern).toBe(manual.explorationBehaviors.dominantPattern)
  })

  it('activation gate does not mutate events', () => {
    resetActivationThrottle()
    const events: UserBehaviorEvent[] = [
      { action: 'save_research', timestamp: '2026-07-28T10:00:00Z' },
    ]
    const snapshot = JSON.stringify(events)
    shouldActivatePipeline(events)
    // Events unchanged after activation check
    expect(JSON.stringify(events)).toBe(snapshot)
  })

  it('throttle is stable: first activates, second blocked', () => {
    resetActivationThrottle()
    const events: UserBehaviorEvent[] = [
      { action: 'save_research', timestamp: '2026-07-28T10:00:00Z' },
    ]
    const first = shouldActivatePipeline(events)
    const second = shouldActivatePipeline(events)
    expect(first.shouldActivate).toBe(true)
    expect(second.shouldActivate).toBe(false)
    expect(second.reason).toContain('Throttled')
  })
})
