// ============================================================
// M54 — Scenario Logic Regression (synthetic fixtures, NOT real replay; see M66_real_event_replay.test.ts)
// Simulates a synthetic user session and evaluates pipeline output.
// ============================================================

import { describe, it, expect } from 'vitest'
import { analyzeProductUsage } from './ProductUsageAnalysis'
import type { UserBehaviorEvent } from './UserBehaviorEvent'

describe('M54 Scenario Logic Regression', () => {
  it('Scenario: user completes full exploration + research journey', () => {
    // Simulate a realistic user session:
    // Open discover → pick a topic → open entity → explore tabs →
    // click a journey card → chat with AI → switch to research tab →
    // start research → complete and save
    const events: UserBehaviorEvent[] = [
      { action: 'open_discover',     timestamp: '2026-07-28T10:00:00Z' },
      { action: 'click_entity',      timestamp: '2026-07-28T10:01:00Z', entityType: 'Civilization' },
      { action: 'open_entity',       timestamp: '2026-07-28T10:02:00Z' },
      { action: 'switch_tab',        timestamp: '2026-07-28T10:03:00Z', tab: 'explore' },
      { action: 'click_journey',     timestamp: '2026-07-28T10:04:00Z' },
      { action: 'start_chat',        timestamp: '2026-07-28T10:05:00Z' },
      { action: 'switch_tab',        timestamp: '2026-07-28T10:07:00Z', tab: 'research' },
      { action: 'start_research',    timestamp: '2026-07-28T10:08:00Z', entityGlobalId: 't:rome' },
      { action: 'save_research',     timestamp: '2026-07-28T10:15:00Z', entityGlobalId: 't:rome' },
    ]

    const result = analyzeProductUsage(events)
    const di = result.decisionInsight

    console.log('\n========================================')
    console.log('  M54 SCENARIO LOGIC REGRESSION REPORT')
    console.log('========================================\n')
    console.log('=== User Flow ===')
    console.log('Discover → Civilization entity → Explore tab → Journey card →')
    console.log('AI Chat → Research tab → Start Research → Save Research\n')
    console.log('=== ProductDecisionInsight Output ===')
    console.log(result.summary)
    console.log('')
    console.log('=== DECISION INSIGHT ===')
    console.log('Status:     ', di.overallStatus)
    console.log('Confidence: ', Math.round(di.confidence * 100) + '%')

    // Validation assertions
    expect(di.overallStatus).toBeTruthy()
    expect(di.confidence).toBeGreaterThanOrEqual(0)
    expect(di.confidence).toBeLessThanOrEqual(1)
    expect(result.explorationDepth.maxDepth).toBe(5)
    expect(result.explorationBehaviors.dominantPattern).toBe('research_loop')
    expect(result.knowledgeUsageCoverage.exploredEntityTypes).toContain('Civilization')
  })

  it('Scenario: user browses but never goes deep', () => {
    const events: UserBehaviorEvent[] = [
      { action: 'open_discover', timestamp: '2026-07-28T10:00:00Z' },
      { action: 'click_entity',  timestamp: '2026-07-28T10:01:00Z', entityType: 'Event' },
      { action: 'open_entity',   timestamp: '2026-07-28T10:02:00Z' },
    ]

    const result = analyzeProductUsage(events)

    console.log('\n=== Scenario: Browse-Only User ===')
    console.log(result.summary)

    expect(result.explorationDepth.maxDepth).toBe(1)
    expect(result.explorationBehaviors.dominantPattern).not.toBe('research_loop')
  })
})
