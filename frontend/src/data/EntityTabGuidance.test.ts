import { describe, it, expect } from 'vitest'
import { TAB_GUIDANCE, guidanceFor } from './EntityTabGuidance'

describe('EntityTabGuidance', () => {
  it('has guidance for all five tabs', () => {
    expect(Object.keys(TAB_GUIDANCE)).toHaveLength(5)
    expect(TAB_GUIDANCE.info).toBeTruthy()
    expect(TAB_GUIDANCE.explore).toBeTruthy()
    expect(TAB_GUIDANCE.research).toBeTruthy()
    expect(TAB_GUIDANCE.analyze).toBeTruthy()
    expect(TAB_GUIDANCE.ai).toBeTruthy()
  })

  it('every guidance has title and description', () => {
    for (const g of Object.values(TAB_GUIDANCE)) {
      expect(g.title).toBeTruthy()
      expect(g.description).toBeTruthy()
      expect(g.userGoal).toBeTruthy()
    }
  })

  it('explore tab has exploration-related guidance', () => {
    const g = guidanceFor('explore')
    expect(g.title).toContain('探索')
    expect(g.recommendedActions.length).toBeGreaterThanOrEqual(2)
  })

  it('research tab mentions comparison and save', () => {
    const g = guidanceFor('research')
    const actions = g.recommendedActions.join(' ')
    expect(actions).toContain('维度')
    expect(actions).toContain('保存')
  })

  it('guidanceFor returns correct record', () => {
    expect(guidanceFor('info').title).toBe('了解基本事实')
    expect(guidanceFor('analyze').title).toBe('理解原因与影响')
  })
})
