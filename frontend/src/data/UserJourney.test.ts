import { describe, it, expect } from 'vitest'
import {
  DISCOVERY_FUNNEL,
  EXPLORATION_FUNNEL,
  RESEARCH_FUNNEL,
  allFunnels,
  blockersInFunnel,
  missingGuidanceReport,
  funnelSummary,
} from './UserJourney'

describe('UserJourney', () => {
  it('all three funnels exist', () => {
    const funnels = allFunnels()
    expect(funnels).toHaveLength(3)
    expect(funnels.map((f) => f.name)).toEqual(['Discovery', 'Exploration', 'Research'])
  })

  it('Discovery funnel has 3 nodes', () => {
    expect(DISCOVERY_FUNNEL.nodes).toHaveLength(3)
    expect(DISCOVERY_FUNNEL.nodes[0].id).toBe('d1_landing')
    expect(DISCOVERY_FUNNEL.nodes[2].id).toBe('d3_enter')
  })

  it('Exploration funnel has 5 nodes with tab transitions', () => {
    expect(EXPLORATION_FUNNEL.nodes).toHaveLength(5)
    expect(EXPLORATION_FUNNEL.nodes[2].id).toBe('e3_explore_tab')
  })

  it('Research funnel covers start-save-restore-compare', () => {
    const ids = RESEARCH_FUNNEL.nodes.map((n) => n.id)
    expect(ids).toContain('r1_start')
    expect(ids).toContain('r3_save')
    expect(ids).toContain('r4_restore')
    expect(ids).toContain('r5_compare')
  })

  it('every node has userGoal and entryPoint', () => {
    for (const funnel of allFunnels()) {
      for (const node of funnel.nodes) {
        expect(node.userGoal).toBeTruthy()
        expect(node.entryPoint).toBeTruthy()
      }
    }
  })

  it('identifies blockers in Exploration funnel', () => {
    const blockers = blockersInFunnel(EXPLORATION_FUNNEL)
    expect(blockers.length).toBeGreaterThan(0)
    expect(blockers.some((b) => b.blocker!.includes('tab'))).toBe(true)
  })

  it('identifies blockers in Research funnel', () => {
    const blockers = blockersInFunnel(RESEARCH_FUNNEL)
    expect(blockers.length).toBeGreaterThanOrEqual(3)
  })

  it('generates missing guidance report', () => {
    const report = missingGuidanceReport(RESEARCH_FUNNEL)
    expect(report.length).toBeGreaterThan(0)
    expect(report.every((r) => r.startsWith('r'))).toBe(true)
  })

  it('generates summary with blockers and missing count', () => {
    const summary = funnelSummary()
    expect(summary).toContain('3 funnels')
    expect(summary).toContain('blockers')
    expect(summary).toContain('missing guidance')
  })
})
