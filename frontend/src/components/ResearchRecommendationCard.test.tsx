import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ResearchRecommendationCardView } from './ResearchRecommendationCard'
import type { ResearchRecommendation } from '../data/ResearchPlanner'

function mkRec(overrides: Partial<ResearchRecommendation> = {}): ResearchRecommendation {
  return {
    entityGlobalId: 't:byzantine',
    entityName: 'Byzantine Empire',
    entityType: 'Civilization',
    reason: { kind: 'related', relationshipType: 'expanded_from', viaEntity: 'Roman Empire' },
    suggestedDimensions: ['政治制度', '军事体系', '经济网络', '文化影响'],
    ...overrides,
  }
}

describe('ResearchRecommendationCardView', () => {
  it('renders entity name and type', () => {
    const html = renderToStaticMarkup(
      <ResearchRecommendationCardView recommendation={mkRec()} />,
    )
    expect(html).toContain('Byzantine Empire')
    expect(html).toContain('Civilization')
  })

  it('renders related reason correctly', () => {
    const html = renderToStaticMarkup(
      <ResearchRecommendationCardView
        recommendation={mkRec({
          reason: { kind: 'related', relationshipType: 'expanded_from', viaEntity: 'Roman Empire' },
        })}
      />,
    )
    expect(html).toContain('关联发现')
    expect(html).toContain('expanded_from')
    expect(html).toContain('Roman Empire')
  })

  it('renders comparison candidate reason', () => {
    const html = renderToStaticMarkup(
      <ResearchRecommendationCardView
        recommendation={mkRec({
          entityName: 'Han Dynasty',
          reason: { kind: 'comparison_candidate', sharedType: 'Civilization' },
        })}
      />,
    )
    expect(html).toContain('对比推荐')
    expect(html).toContain('Civilization')
  })

  it('renders suggested dimensions', () => {
    const html = renderToStaticMarkup(
      <ResearchRecommendationCardView
        recommendation={mkRec({ suggestedDimensions: ['经济', '军事'] })}
      />,
    )
    expect(html).toContain('建议研究方向')
    expect(html).toContain('经济')
    expect(html).toContain('军事')
  })

  it('explore button has aria label and entity name', () => {
    const html = renderToStaticMarkup(
      <ResearchRecommendationCardView recommendation={mkRec()} />,
    )
    expect(html).toContain('探索')
    expect(html).toContain('探索 Byzantine Empire')
  })

  it('renders causal chain reason', () => {
    const html = renderToStaticMarkup(
      <ResearchRecommendationCardView
        recommendation={mkRec({
          reason: { kind: 'causal_chain', position: 'effect' },
        })}
      />,
    )
    expect(html).toContain('因果探索')
    expect(html).toContain('后果')
  })

  it('renders history-based reason with research count', () => {
    const html = renderToStaticMarkup(
      <ResearchRecommendationCardView
        recommendation={mkRec({
          reason: { kind: 'from_history', researchCount: 3 },
        })}
      />,
    )
    expect(html).toContain('历史推荐')
    expect(html).toContain('3 次')
  })
})
