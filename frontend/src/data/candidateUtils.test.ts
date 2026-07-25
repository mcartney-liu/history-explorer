import { describe, it, expect } from 'vitest'
import type { SearchResultItem } from '../components/SearchResults'
import { deriveGlobalId, toCandidate } from './candidateUtils'

// M14 candidate normalization — pure, no state, no AI logic.
// Only real Entity rows with a resolvable global_id become candidates.
describe('candidateUtils — candidate normalization', () => {
  const entity: SearchResultItem = {
    result_type: 'Entity',
    id: 'person-qinshihuang',
    name: '秦始皇',
    type: 'Person',
    topic: 'qin_dynasty',
  }

  describe('deriveGlobalId', () => {
    it('derives the canonical `${topic}:${id}` shape', () => {
      expect(deriveGlobalId(entity)).toBe('qin_dynasty:person-qinshihuang')
    })

    it('prefers an explicit global_id when present', () => {
      expect(
        deriveGlobalId({ ...entity, global_id: 'roman_empire:person-augustus' }),
      ).toBe('roman_empire:person-augustus')
    })

    it('trims whitespace on the explicit global_id and derived parts', () => {
      expect(deriveGlobalId({ ...entity, global_id: '  qin_dynasty:x  ' })).toBe(
        'qin_dynasty:x',
      )
      expect(
        deriveGlobalId({ ...entity, id: '  person-x  ', topic: '  qin  ' }),
      ).toBe('qin:person-x')
    })

    it('returns null when topic or id is missing (cannot resolve a node)', () => {
      expect(deriveGlobalId({ ...entity, id: undefined })).toBeNull()
      expect(deriveGlobalId({ ...entity, topic: undefined })).toBeNull()
      expect(deriveGlobalId({ name: 'orphan' })).toBeNull()
    })

    it('ignores an empty/whitespace explicit global_id and falls back', () => {
      expect(deriveGlobalId({ ...entity, global_id: '   ' })).toBe(
        'qin_dynasty:person-qinshihuang',
      )
    })
  })

  describe('toCandidate', () => {
    it('maps a real Entity row into a friendly Candidate', () => {
      expect(toCandidate(entity)).toEqual({
        gid: 'qin_dynasty:person-qinshihuang',
        name: '秦始皇',
        type: 'Person',
        topic: 'qin_dynasty',
      })
    })

    it('treats an undefined result_type as an Entity (matches orderSearchResults)', () => {
      const { result_type, ...noType } = entity
      void result_type
      expect(toCandidate(noType)).toEqual({
        gid: 'qin_dynasty:person-qinshihuang',
        name: '秦始皇',
        type: 'Person',
        topic: 'qin_dynasty',
      })
    })

    it('drops Topic rows (never selectable candidates)', () => {
      expect(
        toCandidate({ result_type: 'Topic', name: 'Roman Empire', topic: 'roman_empire' }),
      ).toBeNull()
    })

    it('drops rows without a resolvable global_id', () => {
      expect(toCandidate({ result_type: 'Entity', name: 'no-id', topic: 'x' })).toBeNull()
    })

    it('supports cross-topic candidates (M14 acceptance scenario)', () => {
      const qin = toCandidate(entity)
      const alex = toCandidate({
        result_type: 'Entity',
        id: 'person-alexander',
        name: '亚历山大',
        type: 'Person',
        topic: 'ancient_greece',
      })
      const rome = toCandidate({
        result_type: 'Entity',
        id: 'civ-roman-empire',
        name: '罗马帝国',
        type: 'Civilization',
        topic: 'roman_empire',
      })
      expect([qin?.gid, alex?.gid, rome?.gid]).toEqual([
        'qin_dynasty:person-qinshihuang',
        'ancient_greece:person-alexander',
        'roman_empire:civ-roman-empire',
      ])
    })
  })
})
