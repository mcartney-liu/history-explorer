import { describe, it, expect } from 'vitest'
import {
  orderSearchResults,
  resolveSearchResultTarget,
  SearchResultItem,
} from '../components/SearchResults'

describe('orderSearchResults (M4-004 section ordering)', () => {
  it('puts Topics before Entities and preserves intra-group order', () => {
    const mixed: SearchResultItem[] = [
      { result_type: 'Entity', id: 'e1', name: 'B-entity', topic: 'roman_empire' },
      { result_type: 'Topic', topic: 'roman_empire', name: 'Roman Empire' },
      { result_type: 'Entity', id: 'e2', name: 'A-entity', topic: 'roman_empire' },
      { result_type: 'Topic', topic: 'persian_empire', name: 'Persian Empire' },
    ]
    const ordered = orderSearchResults(mixed)
    expect(ordered.map((r) => r.result_type)).toEqual([
      'Topic',
      'Topic',
      'Entity',
      'Entity',
    ])
    // Within the Entity group, backend order (B then A) is preserved.
    const entities = ordered.filter((r) => r.result_type === 'Entity')
    expect(entities.map((e) => e.name)).toEqual(['B-entity', 'A-entity'])
  })

  it('returns an entity-only list unchanged', () => {
    const entities: SearchResultItem[] = [
      { result_type: 'Entity', id: 'e1', name: 'One', topic: 't' },
      { result_type: 'Entity', id: 'e2', name: 'Two', topic: 't' },
    ]
    expect(orderSearchResults(entities)).toEqual(entities)
  })

  it('returns [] for null input', () => {
    expect(orderSearchResults(null)).toEqual([])
  })
})

describe('resolveSearchResultTarget (M4-004 click branch)', () => {
  it('resolves a Topic row to a topic target (no id)', () => {
    const item: SearchResultItem = {
      result_type: 'Topic',
      topic: 'roman_empire',
      name: 'Roman Empire',
    }
    expect(resolveSearchResultTarget(item)).toEqual({
      kind: 'topic',
      topic: 'roman_empire',
    })
  })

  it('resolves an Entity row to an entity target', () => {
    const item: SearchResultItem = {
      result_type: 'Entity',
      id: 'person-augustus',
      name: 'Augustus',
      topic: 'roman_empire',
    }
    expect(resolveSearchResultTarget(item)).toEqual({
      kind: 'entity',
      id: 'person-augustus',
    })
  })

  it('returns null when neither target is resolvable', () => {
    const item: SearchResultItem = { name: 'Mystery' }
    expect(resolveSearchResultTarget(item)).toBeNull()
  })
})
