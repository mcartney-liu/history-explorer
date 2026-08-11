/** M85 — CausalObject type, Semantic Relationship & event tests. */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'

// Mock localStorage
const store: Record<string, string> = {}
const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value },
  removeItem: (key: string) => { delete store[key] },
}
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock })

import {
  recordEvent,
  getEvents,
  getEventsByAction,
  clearEvents,
} from '../UserBehaviorEvent'
import type { CausalObjectData, ExplorationPathRefData, RelatedCausalObjectRefData } from '../causalStatement'

beforeEach(() => {
  clearEvents()
})

afterEach(() => {
  clearEvents()
})

describe('M85 CausalObject Type', () => {
  it('CausalObjectData extends CausalStatementData with M85 fields', () => {
    const path: ExplorationPathRefData = {
      from: 'entity-a',
      to: 'entity-b',
      relationship: 'caused',
      label: 'A led to B',
    }
    const rel: RelatedCausalObjectRefData = {
      target_id: 'co-002',
      relation_type: 'institutional_evolution',
      explanation: 'A enabled B.',
    }
    const obj: CausalObjectData = {
      id: 'co-001',
      cause_id: 'entity-a',
      effect_id: 'entity-b',
      mechanism: 'A caused B',
      consequence: 'This led to C',
      confidence: 'high',
      evidence_refs: ['ec-001'],
      object_type: 'causal',
      related_entities: ['entity-c'],
      exploration_paths: [path],
      related_causal_objects: [rel],
    }
    expect(obj.id).toBe('co-001')
    expect(obj.object_type).toBe('causal')
    expect(obj.related_causal_objects).toHaveLength(1)
    expect(obj.related_causal_objects![0].target_id).toBe('co-002')
    expect(obj.related_causal_objects![0].relation_type).toBe('institutional_evolution')
    expect(obj.related_causal_objects![0].explanation).toBe('A enabled B.')
  })

  it('CausalObjectData has 10 keys minimum (related_causal_objects optional)', () => {
    const obj: CausalObjectData = {
      id: 'co-test',
      cause_id: 'a',
      effect_id: 'b',
      mechanism: null,
      consequence: null,
      confidence: null,
      evidence_refs: [],
      object_type: 'causal',
      related_entities: [],
      exploration_paths: [],
    }
    expect(Object.keys(obj)).toHaveLength(10)
  })

  it('RelatedCausalObjectRefData has 3 fields', () => {
    const ref: RelatedCausalObjectRefData = {
      target_id: 'co-002',
      relation_type: 'technological_chain',
      explanation: 'Tech A enabled Tech B.',
    }
    expect(Object.keys(ref)).toHaveLength(3)
    expect(ref.target_id).toBe('co-002')
    expect(ref.relation_type).toBe('technological_chain')
    expect(ref.explanation).toBe('Tech A enabled Tech B.')
  })
})

describe('M85 CausalObject Events', () => {
  it('co_related_object_click event emits with causalId', () => {
    recordEvent({ action: 'co_related_object_click', causalId: 'co-001' })
    const events = getEvents()
    expect(events).toHaveLength(1)
    expect(events[0].action).toBe('co_related_object_click')
    expect(events[0].causalId).toBe('co-001')
  })

  it('co_relationship_view event emits with causalId', () => {
    recordEvent({ action: 'co_relationship_view', causalId: 'co-001' })
    const events = getEvents()
    expect(events).toHaveLength(1)
    expect(events[0].action).toBe('co_relationship_view')
    expect(events[0].causalId).toBe('co-001')
  })

  it('co_events are filterable including M85', () => {
    recordEvent({ action: 'co_detail_open', causalId: 'co-001' })
    recordEvent({ action: 'co_related_object_click', causalId: 'co-001' })
    recordEvent({ action: 'co_related_object_click', causalId: 'co-002' })
    recordEvent({ action: 'cs_card_view', causalId: 'cs-001' })

    expect(getEventsByAction('co_detail_open')).toHaveLength(1)
    expect(getEventsByAction('co_related_object_click')).toHaveLength(2)
  })

  it('no forbidden fields on co events', () => {
    recordEvent({ action: 'co_related_object_click', causalId: 'co-001' })
    const event = getEvents()[0]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((event as any).causalConfidence).toBeUndefined()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((event as any).relationshipScore).toBeUndefined()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((event as any).relationType).toBeUndefined()
  })
})
