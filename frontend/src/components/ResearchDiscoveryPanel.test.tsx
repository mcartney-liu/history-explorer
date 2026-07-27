import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ResearchDiscoveryPanelView } from './ResearchDiscoveryPanel'
import type { ResearchRecommendation } from '../data/ResearchPlanner'

function mkRec(overrides: Partial<ResearchRecommendation> = {}): ResearchRecommendation {
  return {
    entityGlobalId: 't:rec',
    entityName: 'Test Entity',
    entityType: 'Civilization',
    reason: { kind: 'related', relationshipType: 'related_to', viaEntity: 'Rome' },
    suggestedDimensions: ['政治', '军事'],
    ...overrides,
  }
}

describe('ResearchDiscoveryPanelView', () => {
  it('renders section title and subtitle', () => {
    const html = renderToStaticMarkup(
      <ResearchDiscoveryPanelView
        currentEntity={{ globalId: 't:rome', name: 'Rome', type: 'Civilization' }}
        relationships={[]}
        recommendations={[]}
      />,
    )
    expect(html).toContain('推荐探索')
    expect(html).toContain('下一步探索方向')
  })

  it('renders empty state when no recommendations', () => {
    const html = renderToStaticMarkup(
      <ResearchDiscoveryPanelView
        currentEntity={{ globalId: 't:x', name: 'X', type: 'Event' }}
        relationships={[]}
        recommendations={[]}
      />,
    )
    expect(html).toContain('暂无推荐探索')
  })

  it('renders multiple recommendation cards', () => {
    const html = renderToStaticMarkup(
      <ResearchDiscoveryPanelView
        currentEntity={{ globalId: 't:rome', name: 'Rome', type: 'Civilization' }}
        relationships={[]}
        recommendations={[
          mkRec({ entityName: 'Byzantium' }),
          mkRec({ entityName: 'Han Dynasty', reason: { kind: 'comparison_candidate', sharedType: 'Civilization' } }),
        ]}
      />,
    )
    expect(html).toContain('Byzantium')
    expect(html).toContain('Han Dynasty')
  })

  it('renders causal chain recommendations', () => {
    const html = renderToStaticMarkup(
      <ResearchDiscoveryPanelView
        currentEntity={{ globalId: 't:rome', name: 'Rome', type: 'Civilization' }}
        relationships={[]}
        recommendations={[
          mkRec({ reason: { kind: 'causal_chain', position: 'effect' } }),
        ]}
      />,
    )
    expect(html).toContain('因果探索')
  })

  it('renders history-based recommendation cards', () => {
    const html = renderToStaticMarkup(
      <ResearchDiscoveryPanelView
        currentEntity={{ globalId: 't:rome', name: 'Rome', type: 'Civilization' }}
        relationships={[]}
        recommendations={[
          mkRec({ reason: { kind: 'from_history', researchCount: 2 } }),
        ]}
      />,
    )
    expect(html).toContain('历史推荐')
    expect(html).toContain('2 次')
  })

  it('displays insight text when provided', () => {
    const html = renderToStaticMarkup(
      <ResearchDiscoveryPanelView
        currentEntity={{ globalId: 't:rome', name: 'Rome', type: 'Civilization' }}
        relationships={[]}
        recommendations={[]}
        insightText="您经常探索 Civilization 与 Military 主题"
      />,
    )
    expect(html).toContain('您经常探索')
  })
})
