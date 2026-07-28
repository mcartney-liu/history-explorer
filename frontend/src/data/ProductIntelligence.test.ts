import { describe, it, expect } from 'vitest'
import { generateProductIntelligence, intelligenceSummary } from './ProductIntelligence'
import type { UserBehaviorEvent } from './UserBehaviorEvent'

describe('ProductIntelligence', () => {
  it('returns safe defaults for empty events', () => {
    const pi = generateProductIntelligence([])
    expect(pi.totalEvents).toBe(0)
    expect(pi.sessions).toBe(0)
    expect(pi.discoveryToEntityRate).toBe(0)
    expect(pi.exploreEngagementRate).toBe(0)
    expect(pi.mostUsedTab).toBeNull()
    expect(pi.mostExploredTypes).toHaveLength(0)
  })

  it('calculates Discovery conversion correctly', () => {
    const events: UserBehaviorEvent[] = [
      { action: 'open_discover', timestamp: '2026-01-01T00:00:00Z' },
      { action: 'click_entity', timestamp: '2026-01-01T00:01:00Z' },
    ]
    const pi = generateProductIntelligence(events)
    expect(pi.discoveryToEntityRate).toBe(1)
  })

  it('detects low Discovery conversion', () => {
    const events: UserBehaviorEvent[] = [
      { action: 'open_discover', timestamp: '2026-01-01T00:00:00Z' },
      { action: 'open_discover', timestamp: '2026-01-01T00:05:00Z' },
      { action: 'click_entity', timestamp: '2026-01-01T00:10:00Z' },
    ]
    const pi = generateProductIntelligence(events)
    expect(pi.discoveryToEntityRate).toBe(0.5) // 1 click / 2 opens
  })

  it('computes exploration engagement', () => {
    const events: UserBehaviorEvent[] = [
      { action: 'open_entity', timestamp: '2026-01-01T00:00:00Z' },
      { action: 'switch_tab', tab: 'explore', timestamp: '2026-01-01T00:01:00Z' },
      { action: 'click_journey', timestamp: '2026-01-01T00:02:00Z' },
    ]
    const pi = generateProductIntelligence(events)
    // 2 explore actions / 3 total events, rounded to 2 decimals
    expect(pi.exploreEngagementRate).toBe(0.67)
  })

  it('calculates research save rate', () => {
    const events: UserBehaviorEvent[] = [
      { action: 'start_research', timestamp: '2026-01-01T00:00:00Z' },
      { action: 'start_research', timestamp: '2026-01-01T00:05:00Z' },
      { action: 'save_research', timestamp: '2026-01-01T00:10:00Z' },
    ]
    const pi = generateProductIntelligence(events)
    expect(pi.researchSaveRate).toBe(0.5) // 1 save / 2 starts
  })

  it('splits sessions on 30-minute gap', () => {
    const events: UserBehaviorEvent[] = [
      { action: 'open_discover', timestamp: '2026-01-01T00:00:00Z' },
      { action: 'click_entity', timestamp: '2026-01-01T00:01:00Z' },
      // >30 min gap
      { action: 'open_discover', timestamp: '2026-01-01T01:00:00Z' },
      { action: 'click_entity', timestamp: '2026-01-01T01:01:00Z' },
    ]
    const pi = generateProductIntelligence(events)
    expect(pi.sessions).toBe(2)
  })

  it('finds most used tab', () => {
    const events: UserBehaviorEvent[] = [
      { action: 'switch_tab', tab: 'research', timestamp: '2026-01-01T00:00:00Z' },
      { action: 'switch_tab', tab: 'explore', timestamp: '2026-01-01T00:01:00Z' },
      { action: 'switch_tab', tab: 'research', timestamp: '2026-01-01T00:02:00Z' },
    ]
    const pi = generateProductIntelligence(events)
    expect(pi.mostUsedTab).toBe('research')
  })

  it('generates recommendations for missing actions', () => {
    const events: UserBehaviorEvent[] = [
      { action: 'open_discover', timestamp: '2026-01-01T00:00:00Z' },
    ]
    const pi = generateProductIntelligence(events)
    expect(pi.recommendations.length).toBeGreaterThanOrEqual(3)
    expect(pi.recommendations.some((r) => r.includes('探索入口'))).toBe(true)
  })

  it('generates positive recommendation when everything is used', () => {
    const events: UserBehaviorEvent[] = [
      { action: 'open_discover', timestamp: '2026-01-01T00:00:00Z' },
      { action: 'click_entity', timestamp: '2026-01-01T00:01:00Z' },
      { action: 'switch_tab', tab: 'explore', timestamp: '2026-01-01T00:02:00Z' },
      { action: 'save_research', timestamp: '2026-01-01T00:03:00Z' },
      { action: 'start_comparison', timestamp: '2026-01-01T00:04:00Z' },
      { action: 'start_chat', timestamp: '2026-01-01T00:05:00Z' },
    ]
    const pi = generateProductIntelligence(events)
    expect(pi.recommendations[0]).toContain('所有关键探索路径都已被使用')
  })

  it('generates human-readable summary', () => {
    const events: UserBehaviorEvent[] = [
      { action: 'open_discover', timestamp: '2026-01-01T00:00:00Z' },
      { action: 'click_entity', timestamp: '2026-01-01T00:01:00Z' },
    ]
    const pi = generateProductIntelligence(events)
    const summary = intelligenceSummary(pi)
    expect(summary).toContain('Events: 2')
    expect(summary).toContain('Discovery')
  })
})

// ============================================================
// M46 Phase 2 — Extended intelligence fields
// ============================================================

describe('ProductIntelligence (M46 Phase 2)', () => {
  it('detects drop-off when user opens discover but never clicks entity', () => {
    const events: UserBehaviorEvent[] = [
      { action: 'open_discover', timestamp: '2026-01-01T00:00:00Z' },
    ]
    const pi = generateProductIntelligence(events)
    expect(pi.dropOffPoints.length).toBeGreaterThan(0)
    expect(pi.dropOffPoints[0].funnel).toBe('Discovery')
    expect(pi.dropOffPoints[0].nextStep).toBe('click_entity')
  })

  it('no drop-off when funnel is complete', () => {
    const events: UserBehaviorEvent[] = [
      { action: 'open_discover', timestamp: '2026-01-01T00:00:00Z' },
      { action: 'click_entity', timestamp: '2026-01-01T00:01:00Z' },
      { action: 'open_entity', timestamp: '2026-01-01T00:02:00Z' },
    ]
    const pi = generateProductIntelligence(events)
    expect(pi.dropOffPoints).toHaveLength(0)
  })

  it('calculates chat adoption rate', () => {
    const events: UserBehaviorEvent[] = [
      { action: 'open_entity', timestamp: '2026-01-01T00:00:00Z' },
      { action: 'open_entity', timestamp: '2026-01-01T00:01:00Z' },
      { action: 'start_chat', timestamp: '2026-01-01T00:02:00Z' },
    ]
    const pi = generateProductIntelligence(events)
    expect(pi.chatAdoptionRate).toBe(0.5) // 1 chat / 2 opens
  })

  it('chat adoption rate is 0 when no events', () => {
    const pi = generateProductIntelligence([])
    expect(pi.chatAdoptionRate).toBe(0)
  })

  it('detects unused capabilities', () => {
    const events: UserBehaviorEvent[] = [
      { action: 'open_discover', timestamp: '2026-01-01T00:00:00Z' },
    ]
    const pi = generateProductIntelligence(events)
    expect(pi.unusedCapabilities.length).toBeGreaterThan(0)
    expect(pi.unusedCapabilities).toContain('AI 历史学家对话')
    expect(pi.unusedCapabilities).toContain('多实体对比研究')
  })

  it('no unused capabilities when all used', () => {
    const events: UserBehaviorEvent[] = [
      { action: 'open_discover', timestamp: '2026-01-01T00:00:00Z' },
      { action: 'click_entity', timestamp: '2026-01-01T00:01:00Z' },
      { action: 'open_entity', timestamp: '2026-01-01T00:02:00Z' },
      { action: 'switch_tab', timestamp: '2026-01-01T00:03:00Z' },
      { action: 'click_journey', timestamp: '2026-01-01T00:04:00Z' },
      { action: 'start_chat', timestamp: '2026-01-01T00:05:00Z' },
      { action: 'start_research', timestamp: '2026-01-01T00:06:00Z' },
      { action: 'save_research', timestamp: '2026-01-01T00:07:00Z' },
      { action: 'restore_research', timestamp: '2026-01-01T00:08:00Z' },
      { action: 'start_comparison', timestamp: '2026-01-01T00:09:00Z' },
    ]
    const pi = generateProductIntelligence(events)
    expect(pi.unusedCapabilities).toHaveLength(0)
    expect(pi.dropOffPoints).toHaveLength(0)
    expect(pi.chatAdoptionRate).toBeGreaterThan(0)
  })
})
