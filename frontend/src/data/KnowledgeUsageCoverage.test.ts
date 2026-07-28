import { describe, it, expect } from 'vitest'
import { analyzeKnowledgeUsageCoverage } from './KnowledgeUsageCoverage'
import type { UserBehaviorEvent } from './UserBehaviorEvent'

describe('KnowledgeUsageCoverage (M50 Phase 2)', () => {
  it('empty events: relationshipDataAvailable=false, coverage=null', () => {
    const result = analyzeKnowledgeUsageCoverage([])
    expect(result.relationshipDataAvailable).toBe(false)
    expect(result.coverageRatio.relationshipCoverage).toBeNull()
    expect(result.exploredRelationshipTypes).toHaveLength(0)
    expect(result.unexploredRelationshipTypes).toHaveLength(0)
  })

  it('entity coverage unaffected by relationship semantics', () => {
    const events: UserBehaviorEvent[] = [
      { action: 'click_entity', entityType: 'Civilization', timestamp: '2026-01-01T00:00:00Z' },
      { action: 'click_entity', entityType: 'Event', timestamp: '2026-01-01T00:01:00Z' },
    ]
    const result = analyzeKnowledgeUsageCoverage(events)
    expect(result.exploredEntityTypes).toContain('Civilization')
    expect(result.coverageRatio.entityCoverage).toBeGreaterThan(0)
  })

  it('no false unexplored relationships when data unavailable', () => {
    const events: UserBehaviorEvent[] = [
      { action: 'click_entity', entityType: 'Person', timestamp: '2026-01-01T00:00:00Z' },
    ]
    const result = analyzeKnowledgeUsageCoverage(events)
    expect(result.unexploredRelationshipTypes).toHaveLength(0)
    expect(result.exploredRelationshipTypes).toHaveLength(0)
  })

  it('summary contains "unavailable" not "0/18"', () => {
    const events: UserBehaviorEvent[] = [
      { action: 'click_entity', entityType: 'Civilization', timestamp: '2026-01-01T00:00:00Z' },
    ]
    const result = analyzeKnowledgeUsageCoverage(events)
    const combined = JSON.stringify(result)
    // Should not falsely claim 0 explored relationships
    expect(combined).not.toMatch(/关系类型.*0.*18/)
    // Should flag unavailability
    expect(result.insights.some((s) => s.includes('unavailable'))).toBe(true)
  })

  it('deterministic output', () => {
    const events: UserBehaviorEvent[] = [
      { action: 'click_entity', entityType: 'Civilization', timestamp: '2026-01-01T00:00:00Z' },
    ]
    const r1 = analyzeKnowledgeUsageCoverage(events)
    const r2 = analyzeKnowledgeUsageCoverage(events)
    expect(r1.coverageRatio.relationshipCoverage).toBe(r2.coverageRatio.relationshipCoverage)
    expect(r1.relationshipDataAvailable).toBe(r2.relationshipDataAvailable)
    expect(r1.unexploredRelationshipTypes).toEqual(r2.unexploredRelationshipTypes)
  })

  it('top entry entities still computed', () => {
    const events: UserBehaviorEvent[] = [
      { action: 'click_entity', entityGlobalId: 't:rome', timestamp: '2026-01-01T00:00:00Z' },
    ]
    const result = analyzeKnowledgeUsageCoverage(events)
    expect(result.topEntryEntities).toContain('t:rome')
  })
})
