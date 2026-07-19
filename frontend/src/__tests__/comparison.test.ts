import { describe, it, expect } from 'vitest'
import {
  pickComparisonTargets,
  deriveBridgedEntities,
  extractTopicFromGlobalId,
} from '../data/comparison'
import { CrossTopicRelated } from '../components/crossTopic'

function edge(topic: string, global_id: string, name: string): CrossTopicRelated {
  return {
    id: global_id.split(':').pop() ?? null,
    name,
    type: 'person',
    global_id,
    topic,
    relationship: 'influenced',
    direction: 'outgoing',
  }
}

describe('comparison helpers (M5-C)', () => {
  it('pickComparisonTargets de-duplicates while preserving order', () => {
    const edges: CrossTopicRelated[] = [
      edge('greek_philosophy', 'greek_philosophy:plato', 'Plato'),
      edge('persian_empire', 'persian_empire:cyrus', 'Cyrus'),
      edge('greek_philosophy', 'greek_philosophy:aristotle', 'Aristotle'),
    ]
    expect(pickComparisonTargets(edges)).toEqual(['greek_philosophy', 'persian_empire'])
  })

  it('pickComparisonTargets returns [] for empty/undefined', () => {
    expect(pickComparisonTargets(undefined)).toEqual([])
    expect(pickComparisonTargets([])).toEqual([])
  })

  it('deriveBridgedEntities filters by target topic (pure filter, no scoring)', () => {
    const edges: CrossTopicRelated[] = [
      edge('greek_philosophy', 'greek_philosophy:plato', 'Plato'),
      edge('persian_empire', 'persian_empire:cyrus', 'Cyrus'),
      edge('greek_philosophy', 'greek_philosophy:aristotle', 'Aristotle'),
    ]
    const bridges = deriveBridgedEntities(edges, 'greek_philosophy')
    expect(bridges.map((b) => b.global_id)).toEqual([
      'greek_philosophy:plato',
      'greek_philosophy:aristotle',
    ])
  })

  it('deriveBridgedEntities returns [] when target is null or absent', () => {
    expect(deriveBridgedEntities([], 'x')).toEqual([])
    expect(deriveBridgedEntities([edge('t', 't:a', 'A')], null)).toEqual([])
  })

  it('extractTopicFromGlobalId parses the owning topic', () => {
    expect(extractTopicFromGlobalId('greek_philosophy:plato')).toBe('greek_philosophy')
    expect(extractTopicFromGlobalId(null)).toBeNull()
    expect(extractTopicFromGlobalId('nocolon')).toBeNull()
  })
})
