import { describe, it, expect } from 'vitest'
import { generateResearchInsights, insightSummary } from './ResearchInsights'
import type { SavedResearch } from './ResearchHistory'

function mkHistory(overrides: Partial<SavedResearch> = {}): SavedResearch {
  return {
    id: `r_${Math.random().toString(36).slice(2)}`,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    entityName: 'Test',
    entityType: 'Civilization',
    entityGlobalId: 't:test',
    comparedNames: [],
    dimensions: [],
    summaryCitations: [],
    bookmarked: false,
    labels: [],
    ...overrides,
  }
}

describe('generateResearchInsights', () => {
  it('returns empty insight for empty research list', () => {
    const insight = generateResearchInsights([])
    expect(insight.researchCount).toBe(0)
    expect(insight.favoriteEntityTypes).toHaveLength(0)
    expect(insight.favoriteDimensions).toHaveLength(0)
    expect(insight.exploredRelationships).toHaveLength(0)
    expect(insight.frequentThemes).toHaveLength(0)
  })

  it('calculates research count', () => {
    const insight = generateResearchInsights([
      mkHistory({ id: 'r1' }),
      mkHistory({ id: 'r2' }),
      mkHistory({ id: 'r3' }),
    ])
    expect(insight.researchCount).toBe(3)
  })

  it('ranks entity types by frequency', () => {
    const insight = generateResearchInsights([
      mkHistory({ id: 'r1', entityType: 'Civilization' }),
      mkHistory({ id: 'r2', entityType: 'Civilization' }),
      mkHistory({ id: 'r3', entityType: 'Event' }),
    ])
    expect(insight.favoriteEntityTypes[0]).toBe('Civilization')
  })

  it('ranks dimensions by frequency', () => {
    const insight = generateResearchInsights([
      mkHistory({ dimensions: [{ id: '0', title: 'Politics', question: 'Q', status: 'success', citationCount: 1 }] }),
      mkHistory({ dimensions: [{ id: '0', title: 'Politics', question: 'Q', status: 'success', citationCount: 1 }] }),
      mkHistory({ dimensions: [{ id: '0', title: 'Military', question: 'Q', status: 'success', citationCount: 1 }] }),
    ])
    expect(insight.favoriteDimensions[0]).toBe('Politics')
  })

  it('extracts relationship interests from compared names', () => {
    const insight = generateResearchInsights([
      mkHistory({ comparedNames: ['Han Dynasty'] }),
    ])
    expect(insight.exploredRelationships).toContain('comparison')
  })

  it('infers causal interest from Event entity type', () => {
    const insight = generateResearchInsights([
      mkHistory({ entityType: 'Event' }),
    ])
    expect(insight.exploredRelationships).toContain('causal')
    expect(insight.exploredRelationships).toContain('temporal')
  })

  it('generates themes from entity types', () => {
    const insight = generateResearchInsights([
      mkHistory({ entityType: 'Civilization' }),
      mkHistory({ entityType: 'Event' }),
    ])
    expect(insight.frequentThemes).toContain('古代文明')
    expect(insight.frequentThemes).toContain('历史事件')
  })

  it('handles missing metadata gracefully', () => {
    const insight = generateResearchInsights([
      mkHistory({ dimensions: [], entityType: 'UnknownType' }),
    ])
    expect(insight.researchCount).toBe(1)
    expect(insight.favoriteDimensions).toHaveLength(0)
  })
})

describe('insightSummary', () => {
  it('returns null for empty insights', () => {
    expect(insightSummary(generateResearchInsights([]))).toBeNull()
  })

  it('generates human-readable summary', () => {
    const insight = generateResearchInsights([
      mkHistory({ entityType: 'Civilization' }),
      mkHistory({ entityType: 'Civilization' }),
    ])
    const summary = insightSummary(insight)
    expect(summary).toContain('Civilization')
  })
})
