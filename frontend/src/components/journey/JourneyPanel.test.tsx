// M35 Feature D — JourneyPanel smoke test (node env, renderToStaticMarkup).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import JourneyPanel from './JourneyPanel'
import { addJourneyEntry, clearJourney } from '../../lib/journey'

function makeFakeStorage() {
  const map = new Map<string, string>()
  return {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
  }
}

describe('JourneyPanel', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', makeFakeStorage() as unknown as Storage)
    clearJourney()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders the empty state when there is no journey', () => {
    const html = renderToStaticMarkup(<JourneyPanel />)
    expect(html).toContain('journey-panel--empty')
    expect(html).toContain('还没有记录')
  })

  it('renders recorded entries with kind + label', () => {
    addJourneyEntry({ globalId: 'silk_road', kind: 'topic', label: 'Silk Road' })
    addJourneyEntry({ globalId: 'roman_empire:civ-roman', kind: 'entity', label: 'Roman Civilization' })
    const html = renderToStaticMarkup(<JourneyPanel />)
    expect(html).toContain('journey-panel')
    expect(html).toContain('data-kind="topic"')
    expect(html).toContain('data-kind="entity"')
    expect(html).toContain('Silk Road')
    expect(html).toContain('Roman Civilization')
    expect(html).toContain('清空')
  })
})
