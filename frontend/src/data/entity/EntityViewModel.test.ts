import { describe, it, expect } from 'vitest'
import { buildEntityViewModel } from './EntityViewModel'
import type { EntityDetail } from './entityTypes'

function makeEntity(overrides: Partial<EntityDetail> = {}): EntityDetail {
  return {
    id: 'ancient_rome:civ-roman',
    type: 'Civilization',
    name: 'Roman Empire',
    summary: {
      time_range: '27 BC – 476 AD',
      capital: 'Rome',
      significance: 'One of the most influential civilizations in Western history',
      population: '~60 million',
    },
    timeline: [
      { year: -27, label: 'Founded', event: 'Augustus becomes first emperor' },
      { year: 476, label: 'Fall', event: 'Western Empire falls' },
    ],
    relationships: [
      {
        type: 'influenced',
        source: 'ancient_rome:civ-roman',
        target: 'ancient_greece:civ-greek',
        direction: 'outgoing',
        other: { id: 'ancient_greece:civ-greek', name: 'Ancient Greece', type: 'Civilization' },
      },
    ],
    exploration: {
      main_entity: { name: 'Roman Empire', type: 'Civilization', summary: 'test' },
      related_entities: [{ name: 'Ancient Greece', type: 'Civilization' }],
    },
    ...overrides,
  }
}

describe('EntityViewModel', () => {
  it('builds identity from entity', () => {
    const entity = makeEntity()
    const vm = buildEntityViewModel(entity)

    expect(vm.identity.id).toBe('ancient_rome:civ-roman')
    expect(vm.identity.name).toBe('Roman Empire')
    expect(vm.identity.type).toBe('Civilization')
    expect(vm.identity.timeLabel).toContain('27 BC')
    expect(vm.identity.locationLabel).toBe('Rome')
    expect(vm.identity.keyFacts.length).toBeGreaterThan(0)
  })

  it('builds understanding from summary', () => {
    const entity = makeEntity()
    const vm = buildEntityViewModel(entity)

    expect(vm.understanding.entityTypeLabel).toBe('文明')
    expect(vm.understanding.significance).toBeTruthy()
    expect(vm.understanding.summary).toBeTruthy()
  })

  it('builds connections graph from relationships', () => {
    const entity = makeEntity()
    const vm = buildEntityViewModel(entity)

    expect(vm.connections.graphNodes.length).toBeGreaterThanOrEqual(2)
    expect(vm.connections.graphEdges.length).toBeGreaterThanOrEqual(1)
    expect(vm.connections.timeline).toHaveLength(2)
    expect(vm.connections.topRelations.length).toBeGreaterThan(0)
  })

  it('preserves timeline events', () => {
    const entity = makeEntity()
    const vm = buildEntityViewModel(entity)

    expect(vm.connections.timeline[0].event).toContain('Augustus')
    expect(vm.connections.timeline[1].year).toBe(476)
  })

  it('handles empty summary safely', () => {
    const entity = makeEntity({ summary: {} })
    const vm = buildEntityViewModel(entity)

    expect(vm.identity.timeLabel).toBe('')
    expect(vm.identity.locationLabel).toBe('')
    expect(vm.identity.keyFacts.length).toBeGreaterThan(0) // at least type
    expect(vm.understanding.summary.length).toBeGreaterThanOrEqual(0)
  })

  it('builds AI context string', () => {
    const entity = makeEntity()
    const vm = buildEntityViewModel(entity)

    expect(vm.connections.aiContext).toContain('Roman Empire')
    expect(vm.connections.aiContext).toContain('Ancient Greece')
    expect(vm.connections.aiContext).toContain('influenced')
  })

  it('exploration readiness is true when id exists', () => {
    const entity = makeEntity()
    const vm = buildEntityViewModel(entity)

    expect(vm.exploration.researchReady).toBe(true)
    expect(vm.exploration.provenanceReady).toBe(true)
  })
})
