import { describe, it, expect } from 'vitest'
import { ALL_CAPABILITIES, type AICapabilityId } from './AICapabilities'
import { getCapability, getCapabilitiesByTrigger, getCapabilitiesForContext, getSuggestedCapabilities } from './AIRegistry'
import { buildAIContext } from './AIContext'
import type { AIContext } from './AIContext'

function makeContext(overrides: Partial<AIContext> = {}): AIContext {
  return {
    entity: { id: 'caesar', name: 'Julius Caesar', type: 'Person', timeLabel: '100 BC', locationLabel: 'Rome', summary: 'Roman leader' },
    currentView: 'graph',
    exploration: { visitedEntities: ['rome'], currentPath: [], depth: 1, dominantPattern: null },
    availableActions: { explainRelation: true, explainTimeline: true, compare: true, research: true, askHistory: true },
    availableCapabilities: [],
    data: {
      graphNodes: [{ id: 'caesar', name: 'Julius Caesar', type: 'Person' }, { id: 'pompey', name: 'Pompey', type: 'Person' }],
      graphEdges: [{ source: 'caesar', target: 'pompey', relation: 'opposed', label: 'opposed' }],
      timeline: [{ year: -44, event: 'Assassinated' }],
      relatedEntityNames: ['Julius Caesar', 'Pompey'],
    },
    ...overrides,
  }
}

describe('AI Capabilities', () => {
  it('all capability ids are unique', () => {
    const ids = ALL_CAPABILITIES.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every capability has requiredContext', () => {
    for (const cap of ALL_CAPABILITIES) {
      expect(cap.requiredContext.length).toBeGreaterThan(0)
    }
  })

  it('getCapability returns correct capability', () => {
    const cap = getCapability('explain_entity')
    expect(cap).toBeDefined()
    expect(cap!.id).toBe('explain_entity')
    expect(cap!.name).toBe('解释实体')
  })

  it('getCapability returns undefined for invalid id', () => {
    expect(getCapability('nonexistent' as AICapabilityId)).toBeUndefined()
  })

  it('getCapabilitiesByTrigger returns matches', () => {
    const caps = getCapabilitiesByTrigger('entity_selected')
    expect(caps.length).toBeGreaterThanOrEqual(2)
    expect(caps.some((c) => c.id === 'explain_entity')).toBe(true)
    expect(caps.some((c) => c.id === 'suggest_exploration')).toBe(true)
  })

  it('getCapabilitiesForContext with timeline view', () => {
    const ctx = makeContext({ currentView: 'timeline' })
    const caps = getCapabilitiesForContext(ctx)
    expect(caps.some((c) => c.id === 'explain_timeline')).toBe(true)
  })

  it('getCapabilitiesForContext with graph view returns relation capabilities', () => {
    const ctx = makeContext({ currentView: 'graph' })
    const caps = getCapabilitiesForContext(ctx)
    expect(caps.some((c) => c.id === 'explain_relation')).toBe(true)
  })

  it('getCapabilitiesForContext without timeline returns no timeline capability', () => {
    const ctx = makeContext({
      currentView: 'timeline',
      data: { ...makeContext().data, timeline: [] },
    })
    const caps = getCapabilitiesForContext(ctx)
    expect(caps.some((c) => c.id === 'explain_timeline')).toBe(false)
  })

  it('getSuggestedCapabilities replaces placeholders', () => {
    const ctx = makeContext({ currentView: 'timeline' })
    const prompts = getSuggestedCapabilities(ctx)
    expect(prompts.some((p) => p.includes('Julius Caesar'))).toBe(true)
  })

  it('buildAIContext produces valid context', () => {
    const ctx = buildAIContext({
      entityId: 'caesar',
      entityName: 'Julius Caesar',
      entityType: 'Person',
      timeLabel: '100 BC',
      locationLabel: 'Rome',
      summary: 'Roman leader',
      currentView: 'graph',
      graphNodes: [{ id: 'caesar', name: 'Julius Caesar', type: 'Person' }, { id: 'pompey', name: 'Pompey', type: 'Person' }],
      graphEdges: [{ source: 'caesar', target: 'pompey', relation: 'opposed', label: 'opposed' }],
      timeline: [{ year: -44, event: 'Assassinated' }],
    })
    expect(ctx.entity.name).toBe('Julius Caesar')
    expect(ctx.availableActions.askHistory).toBe(true)
  })
})
