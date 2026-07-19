import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import ContinueExploringPanel from '../components/ContinueExploringPanel'
import { ConnectionExplained } from '../components/ConnectionsExplainedPanel'
import { CrossTopicRelated, RelatedTopic } from '../components/crossTopic'

function conn(global_id: string, explanation = ''): ConnectionExplained {
  return {
    global_id,
    depth: 1,
    path: [],
    steps: [],
    score: 0.5,
    score_breakdown: {},
    explanation,
  }
}

describe('ContinueExploringPanel (M5-B-1)', () => {
  it('renders nothing when there is nothing to show (additive, non-breaking)', () => {
    expect(renderToStaticMarkup(<ContinueExploringPanel />)).toBe('')
    expect(
      renderToStaticMarkup(
        <ContinueExploringPanel connections={[]} crossTopicRelated={[]} relatedTopics={[]} />,
      ),
    ).toBe('')
  })

  it('surfaces engine-ranked connections as clickable next steps with their explanation', () => {
    const connections = [
      conn('roman_empire:augustus', 'Founder of the empire.'),
      conn('silk_road:han_dynasty', 'Reached via trade.'),
    ]
    const html = renderToStaticMarkup(
      <ContinueExploringPanel connections={connections} />,
    )
    expect(html).toContain('Continue Exploring')
    expect(html).toContain('augustus')
    expect(html).toContain('han_dynasty')
    // The engine's "why" is shown.
    expect(html).toContain('Founder of the empire.')
    // Each next step is a labelled, clickable action carrying its global_id.
    expect(html).toContain('aria-label="Continue to augustus"')
  })

  it('preserves engine order and does NOT re-rank (top-N cap only)', () => {
    const connections = [
      conn('t:first'),
      conn('t:second'),
      conn('t:third'),
      conn('t:fourth'),
      conn('t:fifth'),
      conn('t:sixth'),
    ]
    const html = renderToStaticMarkup(
      <ContinueExploringPanel connections={connections} max={3} />,
    )
    // Only the first 3 (engine order) are shown; the rest are capped out.
    expect(html).toContain('first')
    expect(html).toContain('second')
    expect(html).toContain('third')
    expect(html).not.toContain('fourth')
    // Order is preserved: "first" appears before "second".
    expect(html.indexOf('first')).toBeLessThan(html.indexOf('second'))
  })

  it('weakly marks already-seen nodes without reordering them', () => {
    const connections = [conn('t:seen_node'), conn('t:new_node')]
    const seen = new Set(['t:seen_node'])
    const html = renderToStaticMarkup(
      <ContinueExploringPanel connections={connections} seenGlobalIds={seen} />,
    )
    expect(html).toContain('is-seen')
    expect(html).toContain('seen')
    // The seen node stays first (no reordering).
    expect(html.indexOf('seen_node')).toBeLessThan(html.indexOf('new_node'))
  })

  it('falls back to cross-topic entities and related topics on a dead-end (B-3)', () => {
    const crossTopicRelated: CrossTopicRelated[] = [
      {
        id: 'plato',
        name: 'Plato',
        type: 'person',
        global_id: 'greek_philosophy:plato',
        topic: 'greek_philosophy',
        relationship: 'influenced',
        direction: 'incoming',
      },
    ]
    const relatedTopics: RelatedTopic[] = [
      { topic: 'persian_empire', cross_topic_edge_count: 3 },
    ]
    const html = renderToStaticMarkup(
      <ContinueExploringPanel
        connections={[]}
        crossTopicRelated={crossTopicRelated}
        relatedTopics={relatedTopics}
      />,
    )
    // Dead-end hint shown, and both fallbacks rendered.
    expect(html).toContain('different direction')
    expect(html).toContain('Plato')
    expect(html).toContain('Persian Empire')
  })

  it('does not show fallbacks when direct connections exist', () => {
    const html = renderToStaticMarkup(
      <ContinueExploringPanel
        connections={[conn('t:a')]}
        crossTopicRelated={[
          {
            id: 'x',
            name: 'ShouldNotShow',
            type: 'person',
            global_id: 't:x',
            topic: 't',
            relationship: null,
            direction: null,
          },
        ]}
        relatedTopics={[{ topic: 'hidden_topic', cross_topic_edge_count: 1 }]}
      />,
    )
    expect(html).toContain('a')
    expect(html).not.toContain('ShouldNotShow')
    expect(html).not.toContain('Hidden Topic')
    expect(html).not.toContain('different direction')
  })
})
