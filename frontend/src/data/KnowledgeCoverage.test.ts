import { describe, it, expect } from 'vitest'
import {
  calculateKnowledgeCoverage,
  getCoverageWarnings,
  coverageSummary,
  type EntityRecord,
  type ClaimRecord,
} from './KnowledgeCoverage'

function mkEntity(overrides: Partial<EntityRecord> = {}): EntityRecord {
  return { id: 'e1', type: 'Civilization', name: 'Test', ...overrides }
}

function mkClaim(overrides: Partial<ClaimRecord> = {}): ClaimRecord {
  return { id: 'c1', subject_type: 'entity', subject_id: 'e1', source_id: 's1', ...overrides }
}

describe('calculateKnowledgeCoverage', () => {
  it('returns safe empty array for empty input', () => {
    const result = calculateKnowledgeCoverage([], [], [])
    expect(result.length).toBeGreaterThan(0) // returns all 8 types
    expect(result.every((m) => m.entityCount === 0)).toBe(true)
  })

  it('counts entities per type', () => {
    const result = calculateKnowledgeCoverage([
      mkEntity({ type: 'Civilization' }),
      mkEntity({ id: 'e2', type: 'Civilization' }),
      mkEntity({ id: 'e3', type: 'Event' }),
    ])
    const civ = result.find((m) => m.entityType === 'Civilization')
    expect(civ?.entityCount).toBe(2)
    const evt = result.find((m) => m.entityType === 'Event')
    expect(evt?.entityCount).toBe(1)
  })

  it('counts claims matched to entities', () => {
    const result = calculateKnowledgeCoverage(
      [mkEntity({ id: 'rome', type: 'Civilization' })],
      [],
      [mkClaim({ subject_id: 'rome' }), mkClaim({ id: 'c2', subject_id: 'rome', source_id: 's2' })],
    )
    const civ = result.find((m) => m.entityType === 'Civilization')
    expect(civ?.claimCount).toBe(2)
  })

  it('counts unique sources per entity type', () => {
    const result = calculateKnowledgeCoverage(
      [mkEntity({ id: 'e1', type: 'Event' })],
      [],
      [mkClaim({ subject_id: 'e1', source_id: 'sA' }), mkClaim({ id: 'c2', subject_id: 'e1', source_id: 'sA' }), mkClaim({ id: 'c3', subject_id: 'e1', source_id: 'sB' })],
    )
    const evt = result.find((m) => m.entityType === 'Event')
    expect(evt?.sourceCount).toBe(2)
  })

  it('counts relationship claims', () => {
    const result = calculateKnowledgeCoverage(
      [mkEntity({ id: 'rome', type: 'Civilization' })],
      [],
      [
        mkClaim({ subject_id: 'rome', subject_type: 'entity' }),
        mkClaim({ id: 'c2', subject_id: 'rome', subject_type: 'relationship' }),
      ],
    )
    const civ = result.find((m) => m.entityType === 'Civilization')
    expect(civ?.relationshipCount).toBe(1)
  })

  it('calculates avg dimensions', () => {
    const result = calculateKnowledgeCoverage(
      [mkEntity({ id: 'e1', type: 'Person' }), mkEntity({ id: 'e2', type: 'Person' })],
      [],
      [
        mkClaim({ subject_id: 'e1' }),
        mkClaim({ id: 'c2', subject_id: 'e1' }),
        mkClaim({ id: 'c3', subject_id: 'e2' }),
      ],
    )
    const person = result.find((m) => m.entityType === 'Person')
    expect(person?.avgDimensionsCovered).toBe(1.5) // 3 claims / 2 entities
  })

  it('handles missing fields gracefully', () => {
    const result = calculateKnowledgeCoverage(
      [{ id: 'bare', type: 'Event' }],
      [],
      [{ id: 'bare_c', source_id: 'x' }],
    )
    const evt = result.find((m) => m.entityType === 'Event')
    expect(evt?.entityCount).toBe(1)
  })

  it('returns zero for type with no entities', () => {
    const result = calculateKnowledgeCoverage(
      [mkEntity({ type: 'Civilization' })],
    )
    const rel = result.find((m) => m.entityType === 'Religion')
    expect(rel?.entityCount).toBe(0)
    expect(rel?.claimCount).toBe(0)
  })
})

describe('getCoverageWarnings', () => {
  it('warns for no entities', () => {
    const warnings = getCoverageWarnings([{
      entityType: 'Idea', entityCount: 0, sourceCount: 0, claimCount: 0, relationshipCount: 0, avgDimensionsCovered: 0,
    }])
    expect(warnings).toHaveLength(1)
    expect(warnings[0].level).toBe('low')
    expect(warnings[0].reason).toBe('no_entities')
  })

  it('warns for low source count', () => {
    const warnings = getCoverageWarnings([{
      entityType: 'Religion', entityCount: 2, sourceCount: 1, claimCount: 5, relationshipCount: 0, avgDimensionsCovered: 2.5,
    }])
    expect(warnings).toHaveLength(1)
    expect(warnings[0].reason).toBe('source_count_low')
  })
})

describe('coverageSummary', () => {
  it('generates human-readable summary', () => {
    const summary = coverageSummary([{
      entityType: 'Civilization', entityCount: 5, sourceCount: 10, claimCount: 20, relationshipCount: 8, avgDimensionsCovered: 4,
    }, {
      entityType: 'Religion', entityCount: 1, sourceCount: 1, claimCount: 2, relationshipCount: 0, avgDimensionsCovered: 2,
    }])
    expect(summary).toContain('Total entities: 6')
    expect(summary).toContain('Low coverage: Religion')
  })
})
