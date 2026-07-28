import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import { analyzeProductUsage } from './ProductUsageAnalysis'
import { recordEvent, clearEvents, getEvents } from './UserBehaviorEvent'
import type { UserBehaviorEvent } from './UserBehaviorEvent'

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

describe('ProductUsageAnalysis', () => {
  it('returns safe analysis for empty events', () => {
    const analysis = analyzeProductUsage([])
    expect(analysis.funnelMetrics).toHaveLength(3)
    expect(analysis.intelligence.totalEvents).toBe(0)
    expect(analysis.summary).toContain('事件: 0')
  })

  it('returns complete analysis for full exploration path', () => {
    recordEvent({ action: 'open_discover' })
    recordEvent({ action: 'click_entity' })
    recordEvent({ action: 'open_entity' })
    recordEvent({ action: 'switch_tab', tab: 'explore' })
    recordEvent({ action: 'start_chat' })

    const analysis = analyzeProductUsage(getEvents())
    expect(analysis.funnelMetrics.map((m) => m.name)).toEqual(['Discovery', 'Exploration', 'Research'])
    expect(analysis.summary).toContain('Discovery')
    expect(analysis.summary).toContain('Exploration')
    expect(analysis.summary).toContain('AI对话采用')
  })

  it('detects incomplete path via dropOffPoints and recommendations', () => {
    // Just open discover, no click_entity
    recordEvent({ action: 'open_discover' })

    const analysis = analyzeProductUsage(getEvents())
    expect(analysis.intelligence.dropOffPoints.length).toBeGreaterThan(0)
    expect(analysis.intelligence.unusedCapabilities.length).toBeGreaterThan(0)
    expect(analysis.intelligence.recommendations.length).toBeGreaterThan(0)
  })

  it('delegates funnel metrics to ExplorationFunnelAnalysis', () => {
    const analysis = analyzeProductUsage([])
    // Funnel would return zero-event metrics, but structure should be correct
    for (const f of analysis.funnelMetrics) {
      expect(f.name).toBeTruthy()
      expect(f.steps.length).toBeGreaterThan(0)
      expect(typeof f.overallConversionRate).toBe('number')
    }
  })

  it('generates readable summary with all sections', () => {
    recordEvent({ action: 'open_discover' })
    recordEvent({ action: 'click_entity' })

    const analysis = analyzeProductUsage(getEvents())
    const s = analysis.summary
    expect(s).toContain('[基础]')
    expect(s).toContain('[Discovery]')
    expect(s).toContain('[互动]')
    expect(s).toContain('[未用]')
  })
})
