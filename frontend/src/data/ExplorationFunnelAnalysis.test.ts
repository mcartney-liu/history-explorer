import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import {
  analyzeDiscoveryFunnel,
  analyzeExplorationFunnel,
  analyzeResearchFunnel,
  allFunnelMetrics,
  funnelSummaryText,
  analyzeFunnelFromEvents,
} from './ExplorationFunnelAnalysis'
import { recordEvent, clearEvents } from './UserBehaviorEvent'
import type { UserBehaviorEvent } from './UserBehaviorEvent'

// localStorage polyfill
const store = new Map<string, string>()
beforeAll(() => {
  const mock: Storage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value) },
    removeItem: (key: string) => { store.delete(key) },
    clear: () => { store.clear() },
    get length() { return store.size },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
  }
  Object.defineProperty(globalThis, 'localStorage', { value: mock, writable: true })
})

beforeEach(() => {
  clearEvents()
})

describe('ExplorationFunnelAnalysis', () => {
  it('returns empty funnel with zero conversion when no events', () => {
    const funnel = analyzeDiscoveryFunnel()
    expect(funnel.name).toBe('Discovery')
    expect(funnel.steps).toHaveLength(3)
    expect(funnel.overallConversionRate).toBe(0)
  })

  it('tracks complete Discovery funnel', () => {
    recordEvent({ action: 'open_discover' })
    recordEvent({ action: 'click_entity' })
    recordEvent({ action: 'open_entity' })
    const funnel = analyzeDiscoveryFunnel()
    expect(funnel.overallConversionRate).toBe(1)
    expect(funnel.bottleneckSteps).toHaveLength(0)
  })

  it('detects bottleneck in incomplete Discovery', () => {
    recordEvent({ action: 'open_discover' })
    recordEvent({ action: 'click_entity' })
    // Missing: open_entity
    const funnel = analyzeDiscoveryFunnel()
    expect(funnel.overallConversionRate).toBe(0)
    expect(funnel.bottleneckSteps.length).toBeGreaterThan(0)
  })

  it('tracks Research funnel with save-restore', () => {
    recordEvent({ action: 'start_research' })
    recordEvent({ action: 'save_research' })
    recordEvent({ action: 'restore_research' })
    const funnel = analyzeResearchFunnel()
    expect(funnel.steps[0].entered).toBe(1) // start
    expect(funnel.steps[1].entered).toBe(1) // save
    expect(funnel.steps[2].entered).toBe(1) // restore
  })

  it('starts research but no save drops Research funnel', () => {
    recordEvent({ action: 'start_research' })
    const funnel = analyzeResearchFunnel()
    expect(funnel.steps[0].entered).toBe(1)
    expect(funnel.steps[1].entered).toBe(0) // no save
    expect(funnel.overallConversionRate).toBe(0)
  })

  it('Exploration recognizes tab/relationship/journey as explore', () => {
    recordEvent({ action: 'open_entity' })
    recordEvent({ action: 'switch_tab', tab: 'explore' })
    const funnel = analyzeExplorationFunnel()
    expect(funnel.steps[0].entered).toBe(1)
    expect(funnel.steps[1].entered).toBe(1) // composite any_explore
  })

  it('allFunnelMetrics returns three funnels', () => {
    const metrics = allFunnelMetrics()
    expect(metrics).toHaveLength(3)
    expect(metrics.map((m) => m.name)).toEqual(['Discovery', 'Exploration', 'Research'])
  })

  it('funnelSummaryText generates readable string', () => {
    recordEvent({ action: 'open_discover' })
    const text = funnelSummaryText()
    expect(text).toContain('Discovery')
    expect(text).toContain('conversion')
  })

  it('analyzeFunnelFromEvents works with custom steps', () => {
    const events: UserBehaviorEvent[] = [
      { action: 'start_research', timestamp: '2026-01-01T00:00:00Z' },
      { action: 'save_research', timestamp: '2026-01-01T00:01:00Z' },
    ]
    const funnel = analyzeFunnelFromEvents('Custom', ['start_research', 'save_research'], events)
    expect(funnel.steps[0].entered).toBe(1)
    expect(funnel.steps[1].entered).toBe(1)
    expect(funnel.overallConversionRate).toBe(1)
  })
})
