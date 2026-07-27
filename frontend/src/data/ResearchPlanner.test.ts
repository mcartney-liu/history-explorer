import { describe, it, expect } from 'vitest'
import {
  generateRecommendations,
  type PlannerInput,
  type EntityInfo,
  type RelationshipInfo,
} from './ResearchPlanner'
import type { SavedResearch } from './ResearchHistory'

function mkEntity(overrides: Partial<EntityInfo> = {}): EntityInfo {
  return { globalId: 't:civ-roman', name: 'Roman Empire', type: 'Civilization', ...overrides }
}

function mkRel(type: string, overrides: Partial<EntityInfo> = {}): RelationshipInfo {
  return {
    type,
    other: { globalId: 't:other', name: 'Other Entity', type: 'Civilization', ...overrides },
  }
}

function mkInput(overrides: Partial<PlannerInput> = {}): PlannerInput {
  return {
    currentEntity: mkEntity(),
    relationships: [],
    researchHistory: [],
    ...overrides,
  }
}

function mkHistory(globalId: string, entityType = 'Civilization'): SavedResearch {
  return {
    id: `r_${globalId}`,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    entityName: 'Historical Entity',
    entityType,
    entityGlobalId: globalId,
    comparedNames: [],
    dimensions: [],
    summaryCitations: [],
    bookmarked: false,
    labels: [],
  }
}

describe('generateRecommendations', () => {
  it('generates relationship-driven recommendation', () => {
    const result = generateRecommendations(
      mkInput({ relationships: [mkRel('expanded_from', { globalId: 't:byzantine', name: 'Byzantine Empire', type: 'Civilization' })] }),
    )
    expect(result.length).toBeGreaterThanOrEqual(1)
    const rel = result.find((r) => r.entityName === 'Byzantine Empire')
    expect(rel).toBeTruthy()
    // 'expanded_from' is not causal, and the entity type matches (Civilization),
    // so comparison_candidate will fire first. Both reasons are valid.
    expect(['related', 'comparison_candidate']).toContain(rel!.reason.kind)
  })

  it('generates causal chain recommendation', () => {
    const result = generateRecommendations(
      mkInput({ relationships: [mkRel('caused', { globalId: 't:effect', name: 'Fall', type: 'Event' })] }),
    )
    const causal = result.find((r) => r.reason.kind === 'causal_chain')
    expect(causal).toBeTruthy()
    if (causal && causal.reason.kind === 'causal_chain') {
      expect(causal.reason.position).toBe('effect')
    }
  })

  it('detects comparison candidates (same entity type)', () => {
    const result = generateRecommendations(
      mkInput({ relationships: [mkRel('related_to', { globalId: 't:han', name: 'Han Dynasty', type: 'Civilization' })] }),
    )
    const comp = result.find((r) => r.reason.kind === 'comparison_candidate')
    expect(comp).toBeTruthy()
  })

  it('generates history-based recommendation', () => {
    const result = generateRecommendations(
      mkInput({
        relationships: [mkRel('related_to', { globalId: 't:persia', name: 'Persian Empire', type: 'Civilization' })],
        researchHistory: [mkHistory('t:persia')],
      }),
    )
    const hist = result.find((r) => r.reason.kind === 'from_history')
    expect(hist).toBeTruthy()
    expect(hist!.entityName).toBe('Persian Empire')
  })

  it('returns empty array for no relationships and no history', () => {
    const result = generateRecommendations(mkInput())
    expect(result).toHaveLength(0)
  })

  it('de-duplicates recommendations across rules', () => {
    const result = generateRecommendations(
      mkInput({
        relationships: [
          mkRel('expanded_from', { globalId: 't:byz', name: 'Byzantium', type: 'Civilization' }),
          mkRel('caused', { globalId: 't:byz', name: 'Byzantium', type: 'Civilization' }),
        ],
      }),
    )
    const matching = result.filter((r) => r.entityGlobalId === 't:byz')
    expect(matching).toHaveLength(1)
  })

  it('includes suggested dimensions in output', () => {
    const result = generateRecommendations(
      mkInput({ relationships: [mkRel('expanded_from', { globalId: 't:greek', name: 'Greece', type: 'Civilization' })] }),
    )
    expect(result[0].suggestedDimensions).toContain('政治制度')
    expect(result[0].suggestedDimensions).toHaveLength(4)
  })

  it('supports same-type comparison recommendations', () => {
    const result = generateRecommendations(
      mkInput({
        currentEntity: mkEntity({ globalId: 't:rome', name: 'Rome', type: 'Civilization' }),
        relationships: [mkRel('related_to', { globalId: 't:egypt', name: 'Egypt', type: 'Civilization' })],
      }),
    )
    const comp = result.find((r) => r.reason.kind === 'comparison_candidate')
    expect(comp).toBeTruthy()
    expect(comp!.entityName).toBe('Egypt')
  })
})
