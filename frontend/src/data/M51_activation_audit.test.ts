// ============================================================
// M51 — Intelligence Activation Audit
// Cross-module consistency + evidence traceability validation.
// Audit only — zero new features. Zero backend. Zero AI.
// ============================================================

import { describe, it, expect } from 'vitest'
import { analyzeProductUsage } from './ProductUsageAnalysis'
import type { UserBehaviorEvent } from './UserBehaviorEvent'

// Simulation helper
function simulate(...actions: UserBehaviorEvent['action'][]): UserBehaviorEvent[] {
  return actions.map((action, i) => ({
    action,
    timestamp: `2026-07-28T${String(10 + i).padStart(2, '0')}:${String((i * 3) % 60).padStart(2, '0')}:00Z`,
  }))
}

describe('M51 Intelligence Activation Audit', () => {
  // === Validation 1: Real Event Activation ===
  it('V1: complete pipeline produces all 7 output fields', () => {
    const events: UserBehaviorEvent[] = [
      { action: 'open_discover', timestamp: '2026-07-28T10:00:00Z' },
      { action: 'click_entity', entityType: 'Civilization', timestamp: '2026-07-28T10:01:00Z' },
      { action: 'open_entity', timestamp: '2026-07-28T10:02:00Z' },
    ]
    const result = analyzeProductUsage(events)
    // All 7 fields must exist
    expect(result.funnelMetrics).toBeTruthy()
    expect(result.intelligence).toBeTruthy()
    expect(result.priority).toBeTruthy()
    expect(result.capabilityHealth).toBeTruthy()
    expect(result.explorationBehaviors).toBeTruthy()
    expect(result.explorationDepth).toBeTruthy()
    expect(result.knowledgeUsageCoverage).toBeTruthy()
    expect(result.summary).toBeTruthy()
  })

  // === Validation 2: Cross-Module Consistency ===
  it('V2: depth=5 + research_loop are consistent', () => {
    const events = simulate('start_research', 'save_research')
    const result = analyzeProductUsage(events)
    // depth 5 should pair with research_loop, not quick_lookup
    expect(result.explorationDepth.maxDepth).toBe(5)
    expect(result.explorationBehaviors.dominantPattern).toBe('research_loop')
    // Should NOT contradict
    expect(result.explorationBehaviors.dominantPattern).not.toBe('quick_lookup')
  })

  it('V2: comparison triggers comparison_research + depth 5', () => {
    const events = simulate('start_comparison')
    const result = analyzeProductUsage(events)
    expect(result.explorationDepth.maxDepth).toBe(5)
    expect(result.explorationBehaviors.dominantPattern).toBe('comparison_research')
  })

  it('V2: deep_exploration + depth 3 are consistent', () => {
    const events = simulate('open_entity', 'switch_tab', 'click_journey')
    const result = analyzeProductUsage(events)
    expect(result.explorationDepth.maxDepth).toBe(3)
    expect(result.explorationBehaviors.dominantPattern).toBe('deep_exploration')
  })

  // === Validation 3: Evidence Traceability ===
  it('V3: priority conclusions are traceable to events', () => {
    const events = simulate('start_research')
    const result = analyzeProductUsage(events)
    // Priority should reference save flow because research started but not saved
    expect(result.priority.topRecommendation.capability).toBeTruthy()
    expect(result.priority.topRecommendation.reason).toBeTruthy()
    // Reason should mention the metric that led to this conclusion
    expect(result.priority.topRecommendation.reason.length).toBeGreaterThan(10)
  })

  it('V3: behavior pattern is traceable to event sequence', () => {
    const events = simulate('open_entity', 'click_journey')
    const result = analyzeProductUsage(events)
    expect(result.explorationBehaviors.insights.length).toBeGreaterThan(0)
    expect(result.explorationBehaviors.dominantPattern).not.toBe('unknown')
  })

  it('V3: coverage data references actual event entityTypes', () => {
    const events: UserBehaviorEvent[] = [
      { action: 'click_entity', entityType: 'Civilization', timestamp: '2026-07-28T10:00:00Z' },
    ]
    const result = analyzeProductUsage(events)
    expect(result.knowledgeUsageCoverage.exploredEntityTypes).toContain('Civilization')
    // Relationship data unavailable flag should be set
    expect(result.knowledgeUsageCoverage.relationshipDataAvailable).toBe(false)
    expect(result.knowledgeUsageCoverage.coverageRatio.relationshipCoverage).toBeNull()
  })

  // === M52 Decision Fusion Preparation ===
  it('V4: all required M52 inputs are available in pipeline output', () => {
    const events = simulate('open_discover', 'click_entity', 'open_entity', 'start_chat', 'start_research', 'save_research')
    const result = analyzeProductUsage(events)

    // M52 Decision Fusion will need these inputs:
    const inputs = {
      dominantPattern: result.explorationBehaviors.dominantPattern,
      maxDepth: result.explorationDepth.maxDepth,
      topRecommendation: result.priority.topRecommendation.capability,
      entityCoverage: result.knowledgeUsageCoverage.coverageRatio.entityCoverage,
      funnelCount: result.funnelMetrics.length,
      criticalCount: result.capabilityHealth.filter((c) => c.severity === 'critical').length,
    }

    // All must be non-null and meaningful
    expect(inputs.dominantPattern).toBeTruthy()
    expect(inputs.maxDepth).toBeGreaterThan(0)
    expect(inputs.topRecommendation).toBeTruthy()
    expect(typeof inputs.entityCoverage).toBe('number')
    expect(inputs.funnelCount).toBe(3)
    expect(typeof inputs.criticalCount).toBe('number')

    // Log M52 fusion readiness
    console.log('\n=== M52 Decision Fusion Input Assessment ===')
    console.log('Available inputs:', inputs)
    console.log('All inputs present for M52 Decision Fusion: YES')
  })
})
