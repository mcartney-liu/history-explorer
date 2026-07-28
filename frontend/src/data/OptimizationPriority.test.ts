import { describe, it, expect } from 'vitest'
import {
  generateOptimizationPriority,
  calculateCapabilityHealth,
  generateDecisionIntelligence,
} from './OptimizationPriority'
import { generateProductIntelligence } from './ProductIntelligence'
import { allFunnelMetrics } from './ExplorationFunnelAnalysis'
import type { UserBehaviorEvent } from './UserBehaviorEvent'

describe('OptimizationPriority', () => {
  it('ranks Research Save Flow as top when high research start with no saves', () => {
    const events: UserBehaviorEvent[] = [
      { action: 'open_entity', timestamp: '2026-01-01T00:00:00Z' },
      { action: 'open_entity', timestamp: '2026-01-01T00:01:00Z' },
      { action: 'switch_tab', tab: 'explore', timestamp: '2026-01-01T00:02:00Z' },
      { action: 'start_research', timestamp: '2026-01-01T00:02:00Z' },
      { action: 'start_research', timestamp: '2026-01-01T00:03:00Z' },
      { action: 'start_research', timestamp: '2026-01-01T00:04:00Z' },
    ]
    const pi = generateProductIntelligence(events)
    const funnels = allFunnelMetrics()
    const priority = generateOptimizationPriority(pi, funnels)

    expect(priority.ranking.length).toBeGreaterThan(0)
    expect(priority.topRecommendation.capability).toBe('Research 保存流程')
    expect(priority.topRecommendation.severity).toBe('critical')
  })

  it('no critical candidates when all funnels are healthy', () => {
    const events: UserBehaviorEvent[] = [
      { action: 'open_discover', timestamp: '2026-01-01T00:00:00Z' },
      { action: 'click_entity', timestamp: '2026-01-01T00:01:00Z' },
      { action: 'open_entity', timestamp: '2026-01-01T00:02:00Z' },
      { action: 'start_chat', timestamp: '2026-01-01T00:03:00Z' },
      { action: 'start_research', timestamp: '2026-01-01T00:04:00Z' },
      { action: 'save_research', timestamp: '2026-01-01T00:05:00Z' },
    ]
    const pi = generateProductIntelligence(events)
    const funnels = allFunnelMetrics()
    const priority = generateOptimizationPriority(pi, funnels)

    // All paths are relatively healthy — no critical
    const criticals = priority.ranking.filter((c) => c.severity === 'critical')
    expect(criticals).toHaveLength(0)
  })

  it('flags AI Chat as critical when never used', () => {
    const events: UserBehaviorEvent[] = [
      { action: 'open_entity', timestamp: '2026-01-01T00:00:00Z' },
    ]
    const pi = generateProductIntelligence(events)
    const funnels = allFunnelMetrics()
    const priority = generateOptimizationPriority(pi, funnels)

    expect(priority.ranking.some((c) => c.capability.includes('AI'))).toBe(true)
  })

  it('produces consistent results across multiple runs', () => {
    const events: UserBehaviorEvent[] = [
      { action: 'open_discover', timestamp: '2026-01-01T00:00:00Z' },
      { action: 'start_research', timestamp: '2026-01-01T00:01:00Z' },
    ]
    const pi = generateProductIntelligence(events)
    const funnels = allFunnelMetrics()

    const r1 = generateOptimizationPriority(pi, funnels)
    const r2 = generateOptimizationPriority(pi, funnels)

    expect(r1.topRecommendation.capability).toBe(r2.topRecommendation.capability)
    expect(r1.ranking.length).toBe(r2.ranking.length)
  })

  it('returns safe defaults for empty events', () => {
    const pi = generateProductIntelligence([])
    const funnels = allFunnelMetrics()
    const priority = generateOptimizationPriority(pi, funnels)

    expect(priority.topRecommendation.severity).toBe('healthy')
    expect(priority.ranking).toHaveLength(0)
  })
})

describe('CapabilityHealth', () => {
  it('calculates all six capabilities', () => {
    const events: UserBehaviorEvent[] = [
      { action: 'open_discover', timestamp: '2026-01-01T00:00:00Z' },
      { action: 'click_entity', timestamp: '2026-01-01T00:01:00Z' },
      { action: 'open_entity', timestamp: '2026-01-01T00:02:00Z' },
      { action: 'start_chat', timestamp: '2026-01-01T00:03:00Z' },
      { action: 'start_research', timestamp: '2026-01-01T00:04:00Z' },
      { action: 'save_research', timestamp: '2026-01-01T00:05:00Z' },
    ]
    const pi = generateProductIntelligence(events)
    const funnels = allFunnelMetrics()
    const health = calculateCapabilityHealth(pi, funnels)

    expect(health).toHaveLength(6)
    expect(health.map((h) => h.capability)).toContain('Discovery 发现')
    expect(health.map((h) => h.capability)).toContain('AI Chat 对话')
    expect(health.map((h) => h.capability)).toContain('Comparison 对比')
  })

  it('Comparison is warning when never used (not critical)', () => {
    const events: UserBehaviorEvent[] = [{ action: 'open_entity', timestamp: '2026-01-01T00:00:00Z' }]
    const pi = generateProductIntelligence(events)
    const funnels = allFunnelMetrics()
    const health = calculateCapabilityHealth(pi, funnels)
    const comparison = health.find((h) => h.capability === 'Comparison 对比')!

    expect(comparison.severity).toBe('warning')
    expect(comparison.score).toBe(0)
  })

  it('AI Chat is healthy when adoption is high', () => {
    const events: UserBehaviorEvent[] = [
      { action: 'open_entity', timestamp: '2026-01-01T00:00:00Z' },
      { action: 'start_chat', timestamp: '2026-01-01T00:01:00Z' },
    ]
    const pi = generateProductIntelligence(events)
    const funnels = allFunnelMetrics()
    const health = calculateCapabilityHealth(pi, funnels)
    const chat = health.find((h) => h.capability === 'AI Chat 对话')!

    expect(chat.score).toBeGreaterThan(0)
  })
})

describe('DecisionIntelligence', () => {
  it('combines priority and health into unified output', () => {
    const events: UserBehaviorEvent[] = [
      { action: 'open_discover', timestamp: '2026-01-01T00:00:00Z' },
      { action: 'click_entity', timestamp: '2026-01-01T00:01:00Z' },
    ]
    const pi = generateProductIntelligence(events)
    const funnels = allFunnelMetrics()
    const di = generateDecisionIntelligence(pi, funnels)

    expect(di.priority.topRecommendation).toBeTruthy()
    expect(di.capabilityHealth).toHaveLength(6)
    expect(di.priority.generatedAt).toBeTruthy()
  })
})
