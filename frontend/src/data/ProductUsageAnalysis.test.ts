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

// ============================================================
// M48 Phase 2 — ExplorationBehaviors integration
// ============================================================

describe('ProductUsageAnalysis (M48 exploration behaviors)', () => {
  it('empty events return unknown behavior pattern', () => {
    clearEvents()
    const analysis = analyzeProductUsage(getEvents())
    expect(analysis.explorationBehaviors.dominantPattern).toBe('unknown')
    expect(analysis.explorationBehaviors.confidence).toBe(0)
  })

  it('quick_lookup detected from open_entity only', () => {
    clearEvents()
    recordEvent({ action: 'open_entity' })
    const analysis = analyzeProductUsage(getEvents())
    expect(analysis.explorationBehaviors.dominantPattern).toBe('quick_lookup')
  })

  it('research_loop detected from start + save', () => {
    clearEvents()
    recordEvent({ action: 'start_research' })
    recordEvent({ action: 'save_research' })
    const analysis = analyzeProductUsage(getEvents())
    expect(analysis.explorationBehaviors.dominantPattern).toBe('research_loop')
  })

  it('comparison_research detected from start_comparison', () => {
    clearEvents()
    recordEvent({ action: 'start_comparison' })
    const analysis = analyzeProductUsage(getEvents())
    expect(analysis.explorationBehaviors.dominantPattern).toBe('comparison_research')
  })

  it('existing fields remain unchanged after integration', () => {
    clearEvents()
    recordEvent({ action: 'open_discover' })
    recordEvent({ action: 'click_entity' })
    const analysis = analyzeProductUsage(getEvents())
    // All existing fields must still exist
    expect(analysis.funnelMetrics).toHaveLength(3)
    expect(analysis.intelligence).toBeTruthy()
    expect(analysis.priority.topRecommendation).toBeTruthy()
    expect(analysis.capabilityHealth).toHaveLength(6)
    expect(analysis.summary).toContain('[基础]')
    expect(analysis.summary).toContain('[行为模式]')

    // ExplorationBehaviors field exists
    expect(analysis.explorationBehaviors).toBeTruthy()
    expect(analysis.explorationBehaviors.dominantPattern).toBeTruthy()
  })
})

// ============================================================
// M49 Phase 2 — ExplorationDepth integration
// ============================================================

describe('ProductUsageAnalysis (M49 exploration depth)', () => {
  it('empty events → maxDepth 0', () => {
    clearEvents()
    const analysis = analyzeProductUsage(getEvents())
    expect(analysis.explorationDepth.maxDepth).toBe(0)
  })

  it('open_entity only → maxDepth 1 (surface)', () => {
    clearEvents()
    recordEvent({ action: 'open_entity' })
    const analysis = analyzeProductUsage(getEvents())
    expect(analysis.explorationDepth.maxDepth).toBe(1)
  })

  it('open_entity + switch_tab → maxDepth 2 (browse)', () => {
    clearEvents()
    recordEvent({ action: 'open_entity' })
    recordEvent({ action: 'switch_tab', tab: 'explore' })
    const analysis = analyzeProductUsage(getEvents())
    expect(analysis.explorationDepth.maxDepth).toBe(2)
  })

  it('start_research + save → maxDepth 5 (deep)', () => {
    clearEvents()
    recordEvent({ action: 'start_research' })
    recordEvent({ action: 'save_research' })
    const analysis = analyzeProductUsage(getEvents())
    expect(analysis.explorationDepth.maxDepth).toBe(5)
  })

  it('full path → maxDepth 5 + all old fields preserved', () => {
    clearEvents()
    recordEvent({ action: 'open_entity' })
    recordEvent({ action: 'switch_tab', tab: 'explore' })
    recordEvent({ action: 'click_journey' })
    recordEvent({ action: 'start_chat' })
    recordEvent({ action: 'start_research' })
    recordEvent({ action: 'save_research' })
    recordEvent({ action: 'start_comparison' })

    const analysis = analyzeProductUsage(getEvents())
    expect(analysis.explorationDepth.maxDepth).toBe(5)
    // All old fields must still exist
    expect(analysis.funnelMetrics).toHaveLength(3)
    expect(analysis.intelligence).toBeTruthy()
    expect(analysis.priority.topRecommendation).toBeTruthy()
    expect(analysis.capabilityHealth).toHaveLength(6)
    expect(analysis.explorationBehaviors.dominantPattern).toBeTruthy()
    expect(analysis.summary).toContain('[探索深度]')
  })
})
