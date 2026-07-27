import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { EventNarrativeCardView } from './EventNarrativeCard'
import type { EntityRelationship } from './EntityPage'

function rel(type: string, otherType: string, direction = 'outgoing'): EntityRelationship {
  return {
    type,
    source: direction === 'outgoing' ? 'center' : 'other',
    target: direction === 'outgoing' ? `tgt-${type}` : 'center',
    direction,
    other: { id: `tgt-${type}`, name: 'Target', type: otherType },
  }
}

function makeResponse(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    answer: 'Narrative answer text.',
    citations: [{ global_id: 'a:b', kind: 'entity', label: 'B' }],
    rejected_citations: [],
    grounded: true,
    engine: 'ai' as const,
    question: 'q',
    context_global_ids: ['test'],
    mode: 'historical_impact',
    ...overrides,
  }
}

describe('EventNarrativeCardView', () => {
  it('renders idle state with prompt buttons', () => {
    const html = renderToStaticMarkup(
      <EventNarrativeCardView
        entityGlobalId="test:ev-1"
        entityName="Test Event"
        relationships={[]}
        status="idle"
      />,
    )
    expect(html).toContain('历史叙事')
    expect(html).toContain('历史影响')
    expect(html).toContain('前因后果')
    expect(html).toContain('多文明视角')
  })

  it('renders causal and impact count badges', () => {
    const html = renderToStaticMarkup(
      <EventNarrativeCardView
        entityGlobalId="test:ev-1"
        entityName="Test Event"
        relationships={[
          rel('caused', 'Civilization'),
          rel('influenced', 'Civilization'),
          rel('spread', 'Religion', 'outgoing'),
        ]}
        status="idle"
      />,
    )
    expect(html).toContain('2 条因果关联')
    expect(html).toContain('3 个影响实体')
  })

  it('renders loading state', () => {
    const html = renderToStaticMarkup(
      <EventNarrativeCardView
        entityGlobalId="test:ev-1"
        entityName="Test Event"
        relationships={[]}
        status="loading"
      />,
    )
    expect(html).toContain('AI 正在生成历史叙事')
  })

  it('renders error state', () => {
    const html = renderToStaticMarkup(
      <EventNarrativeCardView
        entityGlobalId="test:ev-1"
        entityName="Test Event"
        relationships={[]}
        status="error"
        error="AI request failed"
      />,
    )
    expect(html).toContain('AI 叙事生成失败')
    expect(html).toContain('AI request failed')
  })

  it('renders success state with GroundedAnswer', () => {
    const html = renderToStaticMarkup(
      <EventNarrativeCardView
        entityGlobalId="test:ev-1"
        entityName="Test Event"
        relationships={[]}
        status="success"
        response={makeResponse({ grounded: true, engine: 'ai' })}
      />,
    )
    expect(html).toContain('Narrative answer text.')
    expect(html).toContain('已通过事实溯源验证')
  })

  it('highlights active prompt button', () => {
    const html = renderToStaticMarkup(
      <EventNarrativeCardView
        entityGlobalId="test:ev-1"
        entityName="Test Event"
        relationships={[]}
        status="idle"
        activeMode="why_happened"
      />,
    )
    expect(html).toContain('enc-prompt-btn--active')
  })
})
