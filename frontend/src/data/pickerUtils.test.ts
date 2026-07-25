import { describe, it, expect } from 'vitest'
import type { Candidate } from './candidateUtils'
import {
  filterByTopic,
  distinctTopics,
  sortCandidates,
  reorderCandidates,
  clearCandidates,
} from './pickerUtils'

// M15 picker helpers — PURE, no state, no AI logic. Candidate identity (gid)
// stays authoritative: these helpers only filter / sort / reorder / clear.
describe('pickerUtils — picker UX helpers', () => {
  const qin: Candidate = {
    gid: 'qin_dynasty:person-qinshihuang',
    name: '秦始皇',
    type: 'Person',
    topic: 'qin_dynasty',
  }
  const alex: Candidate = {
    gid: 'ancient_greece:person-alexander',
    name: '亚历山大',
    type: 'Person',
    topic: 'ancient_greece',
  }
  const rome: Candidate = {
    gid: 'roman_empire:civ-roman-empire',
    name: '罗马帝国',
    type: 'Civilization',
    topic: 'roman_empire',
  }
  const augustus: Candidate = {
    gid: 'roman_empire:person-augustus',
    name: '奥古斯都',
    type: 'Person',
    topic: 'roman_empire',
  }
  const all: Candidate[] = [qin, alex, rome, augustus]

  describe('filterByTopic', () => {
    it('keeps only candidates matching the topic exactly', () => {
      expect(filterByTopic(all, 'roman_empire')).toEqual([rome, augustus])
    })

    it('returns a fresh copy of the whole list when topic is empty/blank/null', () => {
      for (const t of ['', '   ', null, undefined]) {
        const out = filterByTopic(all, t as string | null | undefined)
        expect(out).toEqual(all)
        expect(out).not.toBe(all) // fresh copy, not the same reference
      }
    })

    it('trims the requested topic before matching', () => {
      expect(filterByTopic(all, '  qin_dynasty  ')).toEqual([qin])
    })

    it('returns an empty list when nothing matches', () => {
      expect(filterByTopic(all, 'nonexistent')).toEqual([])
    })

    it('does not mutate the input', () => {
      const snapshot = [...all]
      filterByTopic(all, 'roman_empire')
      expect(all).toEqual(snapshot)
    })
  })

  describe('distinctTopics', () => {
    it('lists distinct non-empty topics in first-seen order', () => {
      expect(distinctTopics(all)).toEqual([
        'qin_dynasty',
        'ancient_greece',
        'roman_empire',
      ])
    })

    it('skips blank/undefined topics and trims', () => {
      const noisy: Candidate[] = [
        { gid: 'a', name: 'A', topic: '  qin_dynasty  ' },
        { gid: 'b', name: 'B', topic: '' },
        { gid: 'c', name: 'C' },
        { gid: 'd', name: 'D', topic: 'qin_dynasty' },
      ]
      expect(distinctTopics(noisy)).toEqual(['qin_dynasty'])
    })

    it('returns [] for an empty list', () => {
      expect(distinctTopics([])).toEqual([])
    })
  })

  describe('sortCandidates', () => {
    it('sorts by name (locale-aware) without mutating the input', () => {
      const snapshot = [...all]
      const out = sortCandidates(all, 'name')
      // Locale-aware pinyin order: 奥(a) < 罗(l) < 秦(q) < 亚(y)
      expect(out.map((c) => c.name)).toEqual(['奥古斯都', '罗马帝国', '秦始皇', '亚历山大'])
      expect(all).toEqual(snapshot)
      expect(out).not.toBe(all)
    })

    it('sorts by type, tie-breaking deterministically by gid', () => {
      const out = sortCandidates(all, 'type')
      // Civilization first, then the three Persons ordered by gid.
      expect(out.map((c) => c.gid)).toEqual([
        'roman_empire:civ-roman-empire',
        'ancient_greece:person-alexander',
        'qin_dynasty:person-qinshihuang',
        'roman_empire:person-augustus',
      ])
    })

    it('sorts by topic', () => {
      const out = sortCandidates(all, 'topic')
      expect(out.map((c) => c.topic)).toEqual([
        'ancient_greece',
        'qin_dynasty',
        'roman_empire',
        'roman_empire',
      ])
    })

    it('sorts by gid (canonical stable order)', () => {
      const out = sortCandidates(all, 'gid')
      expect(out.map((c) => c.gid)).toEqual([
        'ancient_greece:person-alexander',
        'qin_dynasty:person-qinshihuang',
        'roman_empire:civ-roman-empire',
        'roman_empire:person-augustus',
      ])
    })

    it('sinks blank type/topic values to the end', () => {
      const mixed: Candidate[] = [
        { gid: 'z', name: 'Z' }, // no type
        { gid: 'a', name: 'A', type: 'Person' },
      ]
      expect(sortCandidates(mixed, 'type').map((c) => c.gid)).toEqual(['a', 'z'])
    })
  })

  describe('reorderCandidates', () => {
    it('moves an item forward, returning a new array', () => {
      const out = reorderCandidates(all, 0, 2)
      expect(out.map((c) => c.gid)).toEqual([
        alex.gid,
        rome.gid,
        qin.gid,
        augustus.gid,
      ])
      expect(out).not.toBe(all)
    })

    it('moves an item backward', () => {
      const out = reorderCandidates(all, 3, 0)
      expect(out.map((c) => c.gid)).toEqual([
        augustus.gid,
        qin.gid,
        alex.gid,
        rome.gid,
      ])
    })

    it('returns a fresh unchanged copy for out-of-range or no-op moves', () => {
      for (const [from, to] of [
        [-1, 0],
        [0, 9],
        [5, 1],
        [1, 1],
        [1.5, 2],
      ] as [number, number][]) {
        const out = reorderCandidates(all, from, to)
        expect(out).toEqual(all)
        expect(out).not.toBe(all)
      }
    })

    it('preserves candidate identity (gid) after reordering', () => {
      const out = reorderCandidates(all, 0, 3)
      expect([...out].sort((a, b) => a.gid.localeCompare(b.gid))).toEqual(
        [...all].sort((a, b) => a.gid.localeCompare(b.gid)),
      )
    })

    it('does not mutate the input', () => {
      const snapshot = [...all]
      reorderCandidates(all, 0, 2)
      expect(all).toEqual(snapshot)
    })
  })

  describe('clearCandidates', () => {
    it('returns a brand-new empty array each call', () => {
      const a = clearCandidates()
      const b = clearCandidates()
      expect(a).toEqual([])
      expect(a).not.toBe(b)
    })
  })
})
