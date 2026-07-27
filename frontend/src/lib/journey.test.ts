// M35 Feature D — Journey localStorage CRUD test (node env, no DOM).
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  addJourneyEntry,
  getJourney,
  clearJourney,
  entryFromNode,
  type JourneyEntry,
} from './journey'

function makeFakeStorage() {
  const map = new Map<string, string>()
  return {
    map,
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
  }
}

describe('journey store', () => {
  let fake: ReturnType<typeof makeFakeStorage>

  beforeEach(() => {
    fake = makeFakeStorage()
    vi.stubGlobal('localStorage', fake as unknown as Storage)
  })

  it('addJourneyEntry writes an entry with a ts', () => {
    addJourneyEntry({ globalId: 'silk_road', kind: 'topic', label: 'Silk Road' })
    const list = getJourney()
    expect(list).toHaveLength(1)
    expect(list[0].globalId).toBe('silk_road')
    expect(typeof list[0].ts).toBe('number')
  })

  it('getJourney returns entries in insertion order', () => {
    addJourneyEntry({ globalId: 'silk_road', kind: 'topic', label: 'Silk Road' })
    addJourneyEntry({ globalId: 'ancient_india:religion-buddhism', kind: 'entity', label: 'Buddhism' })
    const list = getJourney()
    expect(list.map((e) => e.globalId)).toEqual(['silk_road', 'ancient_india:religion-buddhism'])
  })

  it('clearJourney empties the store', () => {
    addJourneyEntry({ globalId: 'x', kind: 'topic', label: 'X' })
    clearJourney()
    expect(getJourney()).toEqual([])
  })

  it('entryFromNode maps a topic node', () => {
    const e: Omit<JourneyEntry, 'ts'> = entryFromNode({ type: 'topic', topic: 'silk_road', title: 'Silk Road' })
    expect(e).toEqual({ globalId: 'silk_road', kind: 'topic', label: 'Silk Road' })
  })

  it('entryFromNode maps an entity node (global_id)', () => {
    const e: Omit<JourneyEntry, 'ts'> = entryFromNode({
      type: 'entity',
      id: 'roman_empire:civ-roman',
      name: 'Roman Civilization',
    })
    expect(e).toEqual({ globalId: 'roman_empire:civ-roman', kind: 'entity', label: 'Roman Civilization' })
  })

  it('caps at JOURNEY_MAX (50) keeping the newest', () => {
    for (let i = 0; i < 60; i++) {
      addJourneyEntry({ globalId: `t${i}`, kind: 'topic', label: `T${i}` })
    }
    const list = getJourney()
    expect(list).toHaveLength(50)
    expect(list[0].globalId).toBe('t10')
    expect(list[49].globalId).toBe('t59')
  })

  it('no-op when localStorage is undefined', () => {
    vi.unstubAllGlobals()
    // Without localStorage, addJourneyEntry must not throw.
    expect(() => addJourneyEntry({ globalId: 'z', kind: 'topic', label: 'Z' })).not.toThrow()
    expect(getJourney()).toEqual([])
  })
})
