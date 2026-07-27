import { describe, it, expect } from 'vitest'
import { generateResearchInsights, insightSummary, generateUserInterestProfile } from './ResearchInsights'
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

// ============================================================
// M42 Phase 2 — UserInterestProfile tests
// ============================================================

describe('generateUserInterestProfile', () => {
  it('returns safe empty profile for empty history', () => {
    const profile = generateUserInterestProfile([])
    expect(profile.topEntityTypes).toHaveLength(0)
    expect(profile.topDimensions).toHaveLength(0)
    expect(profile.topThemes).toHaveLength(0)
    expect(profile.recentlyExplored).toHaveLength(0)
    expect(profile.comparisonPairs).toHaveLength(0)
    expect(profile.activeExplorationDays).toBe(0)
    expect(profile.bookmarkCategories).toHaveLength(0)
  })

  it('counts entity types correctly', () => {
    const profile = generateUserInterestProfile([
      mkHistory({ id: 'r1', entityType: 'Civilization' }),
      mkHistory({ id: 'r2', entityType: 'Civilization' }),
      mkHistory({ id: 'r3', entityType: 'Event' }),
    ])
    expect(profile.topEntityTypes[0]).toEqual({ type: 'Civilization', count: 2 })
    expect(profile.topEntityTypes[1]).toEqual({ type: 'Event', count: 1 })
  })

  it('ranks dimensions by frequency', () => {
    const profile = generateUserInterestProfile([
      mkHistory({ dimensions: [{ id: '0', title: 'Politics', question: 'Q', status: 'success', citationCount: 1 }] }),
      mkHistory({ dimensions: [{ id: '0', title: 'Politics', question: 'Q', status: 'success', citationCount: 1 }] }),
      mkHistory({ dimensions: [{ id: '0', title: 'Military', question: 'Q', status: 'success', citationCount: 1 }] }),
    ])
    expect(profile.topDimensions[0]).toEqual({ dimension: 'Politics', count: 2 })
  })

  it('maps entity types to themes', () => {
    const profile = generateUserInterestProfile([
      mkHistory({ entityType: 'Civilization' }),
      mkHistory({ entityType: 'Event' }),
    ])
    expect(profile.topThemes).toContain('古代文明')
    expect(profile.topThemes).toContain('历史事件')
  })

  it('extracts comparison pairs from comparedNames', () => {
    const profile = generateUserInterestProfile([
      mkHistory({ entityName: 'Rome', comparedNames: ['Han', 'Persia'] }),
    ])
    expect(profile.comparisonPairs).toHaveLength(1)
    expect(profile.comparisonPairs[0].entities).toContain('Rome')
    expect(profile.comparisonPairs[0].entities).toContain('Han')
  })

  it('sorts recently explored by createdAt', () => {
    const profile = generateUserInterestProfile([
      mkHistory({ id: 'r_old', entityGlobalId: 't:old', createdAt: '2025-01-01T00:00:00Z' }),
      mkHistory({ id: 'r_new', entityGlobalId: 't:new', createdAt: '2026-07-01T00:00:00Z' }),
    ])
    expect(profile.recentlyExplored[0]).toBe('t:new')
    expect(profile.recentlyExplored[1]).toBe('t:old')
  })

  it('calculates active exploration days', () => {
    const profile = generateUserInterestProfile([
      mkHistory({ id: '1', createdAt: '2026-07-01T00:00:00Z' }),
      mkHistory({ id: '2', createdAt: '2026-07-28T00:00:00Z' }),
    ])
    expect(profile.activeExplorationDays).toBeGreaterThanOrEqual(27)
  })

  it('extracts bookmark categories from labels', () => {
    const profile = generateUserInterestProfile([
      mkHistory({ labels: ['重要', '历史'] }),
      mkHistory({ labels: ['重要', '军事'] }),
    ])
    expect(profile.bookmarkCategories).toContain('重要')
    expect(profile.bookmarkCategories).toContain('历史')
    expect(profile.bookmarkCategories).toContain('军事')
  })

  it('handles missing fields gracefully', () => {
    const profile = generateUserInterestProfile([
      { id: 'r_bare', version: 1, createdAt: '2026-01-01T00:00:00Z', updatedAt: '', entityName: '', entityType: 'Event', entityGlobalId: '', comparedNames: [], dimensions: [], summaryCitations: [], bookmarked: false, labels: [] },
    ] as SavedResearch[])
    expect(profile.topEntityTypes).toHaveLength(1)
    expect(profile.recentlyExplored).toHaveLength(1)
  })

  it('handles large research history without performance issues', () => {
    const many = Array.from({ length: 50 }, (_, i) =>
      mkHistory({ id: `r${i}`, entityType: i % 3 === 0 ? 'Civilization' : 'Event' }),
    )
    const profile = generateUserInterestProfile(many)
    expect(profile.topEntityTypes.length).toBeGreaterThan(0)
    expect(profile.recentlyExplored.length).toBeLessThanOrEqual(10)
  })
})
