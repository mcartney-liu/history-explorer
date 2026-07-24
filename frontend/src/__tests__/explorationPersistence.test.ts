import { describe, it, expect, beforeEach, afterEach } from 'vitest'

// Minimal in-memory localStorage so the adapter can be exercised in the node
// test environment (vitest env is 'node', which has no localStorage by default).
class MemStorage {
  private store = new Map<string, string>()
  getItem(k: string): string | null {
    return this.store.has(k) ? (this.store.get(k) as string) : null
  }
  setItem(k: string, v: string): void {
    this.store.set(k, v)
  }
  removeItem(k: string): void {
    this.store.delete(k)
  }
  clear(): void {
    this.store.clear()
  }
}

import { loadPath, savePath, loadReasons, saveReasons } from '../utils/explorationPersistence'
import type { NavNode } from '../components/navigation'
import type { JourneyWhyPayload } from '../components/ExplorationJourney'

let mem: MemStorage

beforeEach(() => {
  mem = new MemStorage()
  ;(globalThis as unknown as { localStorage: MemStorage }).localStorage = mem
})

afterEach(() => {
  delete (globalThis as unknown as { localStorage?: MemStorage }).localStorage
})

function topicNode(i: number): NavNode {
  return { type: 'topic', topic: `t${i}`, title: `T ${i}` }
}
function entityNode(i: number): NavNode {
  return { type: 'entity', id: `g:${i}`, name: `E ${i}` }
}
function why(gid: string): JourneyWhyPayload {
  return {
    fromGlobalId: gid,
    fromName: 'Augustus',
    relationPath: [],
    reasons: ['Same dynasty successor.'],
    score: 0.82,
    candidateSource: 'direct',
    capturedAt: '2026-07-22T00:00:00.000Z',
  }
}

// --- Path round-trip ---

describe('explorationPersistence (path)', () => {
  it('round-trips history + cursor', () => {
    const history = [topicNode(0), entityNode(1), topicNode(2)]
    savePath(history, 2)
    const loaded = loadPath()
    expect(loaded).not.toBeNull()
    expect(loaded!.history).toEqual(history)
    expect(loaded!.cursor).toBe(2)
  })

  it('returns null when nothing is stored', () => {
    expect(loadPath()).toBeNull()
  })

  it('returns null on corrupt JSON', () => {
    mem.setItem('he_exploration_path', 'not-json{')
    expect(loadPath()).toBeNull()
  })

  it('returns null on wrong envelope version', () => {
    mem.setItem('he_exploration_path', JSON.stringify({ v: 2, history: [], cursor: -1 }))
    expect(loadPath()).toBeNull()
  })

  it('clamps an out-of-range cursor into history bounds', () => {
    const history = [topicNode(0), entityNode(1)]
    savePath(history, 99)
    const loaded = loadPath()
    expect(loaded!.cursor).toBe(1)
  })

  it('caps the stored history at HISTORY_MAX', () => {
    const history: NavNode[] = Array.from({ length: 110 }, (_, i) => topicNode(i))
    savePath(history, 109)
    const loaded = loadPath()
    expect(loaded!.history).toHaveLength(100)
    expect(loaded!.history[99]).toEqual(topicNode(109))
  })

  it('is a no-op (no throw) when localStorage is unavailable', () => {
    delete (globalThis as unknown as { localStorage?: MemStorage }).localStorage
    expect(() => savePath([topicNode(0)], 0)).not.toThrow()
    expect(loadPath()).toBeNull()
  })
})

// --- Reasons round-trip ---

describe('explorationPersistence (reasons)', () => {
  it('round-trips the annotation map', () => {
    const reasons = new Map<string, JourneyWhyPayload>([['g:1', why('g:1')]])
    saveReasons(reasons)
    const loaded = loadReasons()
    expect(loaded).not.toBeNull()
    expect(loaded!.size).toBe(1)
    expect(loaded!.get('g:1')?.reasons).toEqual(['Same dynasty successor.'])
  })

  it('returns null when nothing is stored', () => {
    expect(loadReasons()).toBeNull()
  })

  it('returns null on wrong envelope version', () => {
    mem.setItem('he_journey_reasons', JSON.stringify({ v: 2, entries: [] }))
    expect(loadReasons()).toBeNull()
  })

  it('preserves multiple entries with distinct gids', () => {
    const reasons = new Map<string, JourneyWhyPayload>([
      ['g:1', why('g:1')],
      ['g:2', why('g:2')],
    ])
    saveReasons(reasons)
    const loaded = loadReasons()
    expect(loaded!.size).toBe(2)
    expect(loaded!.has('g:1')).toBe(true)
    expect(loaded!.has('g:2')).toBe(true)
  })

  it('is a no-op when localStorage is unavailable', () => {
    delete (globalThis as unknown as { localStorage?: MemStorage }).localStorage
    const reasons = new Map<string, JourneyWhyPayload>([['g:1', why('g:1')]])
    expect(() => saveReasons(reasons)).not.toThrow()
    expect(loadReasons()).toBeNull()
  })
})
