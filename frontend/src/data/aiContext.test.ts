import { describe, it, expect } from 'vitest'
import {
  entityContext,
  relationshipContext,
  timelineContext,
  multiEntityContext,
  isTimelineSyntheticId,
  isValidContextGlobalId,
} from './aiContext'

// M12-2 Context Assembly Layer — pure, stateless, no API/DB/history.
// Every input MUST be a real graph global_id. Synthetic timeline ids
// (`topic:timeline:<label>`) are grounding-only and must never be assembled
// as a grounding context.
describe('aiContext — Context Assembly Layer', () => {
  describe('isTimelineSyntheticId', () => {
    it('detects backend timeline citation ids', () => {
      expect(isTimelineSyntheticId('topic:timeline:foo')).toBe(true)
      expect(isTimelineSyntheticId('entity:timeline:War')).toBe(true)
    })
    it('does NOT flag real entity/relationship ids', () => {
      expect(isTimelineSyntheticId('e:1')).toBe(false)
      expect(isTimelineSyntheticId('rel:a:b')).toBe(false)
      expect(isTimelineSyntheticId('')).toBe(false)
      expect(isTimelineSyntheticId(42 as unknown)).toBe(false)
      expect(isTimelineSyntheticId(undefined)).toBe(false)
    })
  })

  describe('isValidContextGlobalId', () => {
    it('accepts non-empty real ids, rejects empty/synthetic/non-string', () => {
      expect(isValidContextGlobalId('e:1')).toBe(true)
      expect(isValidContextGlobalId('  e:1  ')).toBe(true)
      expect(isValidContextGlobalId('')).toBe(false)
      expect(isValidContextGlobalId('topic:timeline:foo')).toBe(false)
      expect(isValidContextGlobalId(null)).toBe(false)
    })
  })

  describe('entityContext', () => {
    it('returns [globalId] for a real entity id', () => {
      expect(entityContext('e:1')).toEqual(['e:1'])
    })
    it('trims surrounding whitespace', () => {
      expect(entityContext('  e:1  ')).toEqual(['e:1'])
    })
    it('throws on empty id', () => {
      expect(() => entityContext('')).toThrow(/non-empty global_id/)
      expect(() => entityContext('   ')).toThrow(/non-empty global_id/)
    })
    it('throws on synthetic timeline id', () => {
      expect(() => entityContext('topic:timeline:foo')).toThrow(/synthetic timeline id/)
    })
  })

  describe('relationshipContext', () => {
    it('returns [a, b] for two distinct real ids', () => {
      expect(relationshipContext('a:1', 'b:2')).toEqual(['a:1', 'b:2'])
    })
    it('throws when the two ids are identical', () => {
      expect(() => relationshipContext('a:1', 'a:1')).toThrow(/two distinct entity global_ids/)
    })
    it('throws on empty id', () => {
      expect(() => relationshipContext('', 'b:2')).toThrow(/non-empty global_id/)
    })
    it('throws on synthetic timeline id in either slot', () => {
      expect(() => relationshipContext('topic:timeline:x', 'b:2')).toThrow(/synthetic timeline id/)
      expect(() => relationshipContext('a:1', 'topic:timeline:x')).toThrow(/synthetic timeline id/)
    })
  })

  describe('timelineContext', () => {
    it('returns [entityGid] for a real entity id', () => {
      expect(timelineContext('e:1')).toEqual(['e:1'])
    })
    it('throws on empty id', () => {
      expect(() => timelineContext('')).toThrow(/non-empty global_id/)
    })
    it('NEVER accepts a synthetic timeline id (frontend must not invent ids)', () => {
      expect(() => timelineContext('topic:timeline:foo')).toThrow(/synthetic timeline id/)
    })
  })

  describe('multiEntityContext (M13)', () => {
    it('returns the same single id for a one-element selection', () => {
      expect(multiEntityContext(['e:1'])).toEqual(['e:1'])
    })
    it('keeps N distinct real ids in first-occurrence order', () => {
      expect(multiEntityContext(['a:1', 'b:2', 'c:3'])).toEqual(['a:1', 'b:2', 'c:3'])
    })
    it('deduplicates while preserving first occurrence', () => {
      expect(multiEntityContext(['a:1', 'b:2', 'a:1', 'c:3', 'b:2'])).toEqual([
        'a:1',
        'b:2',
        'c:3',
      ])
    })
    it('trims surrounding whitespace', () => {
      expect(multiEntityContext(['  a:1  ', 'b:2'])).toEqual(['a:1', 'b:2'])
    })
    it('returns [] for an empty array (no selection yet)', () => {
      expect(multiEntityContext([])).toEqual([])
    })
    it('does NOT cap N — MAX_N is a UI-layer concern', () => {
      const many = Array.from({ length: 20 }, (_, i) => `e:${i}`)
      expect(multiEntityContext(many)).toHaveLength(20)
    })
    it('throws when not given an array', () => {
      expect(() => multiEntityContext('e:1')).toThrow(/expects an array/)
      expect(() => multiEntityContext(null)).toThrow(/expects an array/)
    })
    it('throws on an empty id within the selection', () => {
      expect(() => multiEntityContext(['a:1', '', 'b:2'])).toThrow(/non-empty global_id/)
    })
    it('throws on a synthetic timeline id within the selection', () => {
      expect(() => multiEntityContext(['a:1', 'topic:timeline:foo'])).toThrow(
        /synthetic timeline id/,
      )
    })
  })
})
