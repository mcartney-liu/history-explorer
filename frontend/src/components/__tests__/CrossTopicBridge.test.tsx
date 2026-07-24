import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import CrossTopicBridge from '../CrossTopicBridge'
import type { CrossTopicRelated, RelatedTopic } from '../crossTopic'

// M10-2: CrossTopicBridge is a composition-only layer. It OWNS no data, state,
// or navigation — it threads props through to the two preserved child panels
// (CrossTopicConnectionsPanel + CrossTopicTopicList) and passes the shared
// focus (VIEW STATE) into the connections panel so a focused cross-topic
// neighbor highlights in sync with Relationship / Timeline.
describe('M10-2 CrossTopicBridge — composition layer', () => {
  const connections: CrossTopicRelated[] = [
    {
      id: 'e1',
      name: 'Augustus',
      type: 'person',
      global_id: 'roman_empire:augustus',
      topic: 'greek_city_states',
      relationship: 'influenced_by',
      direction: 'incoming',
    },
    {
      id: 'e2',
      name: 'Cleopatra',
      type: 'person',
      global_id: 'ptolemaic_egypt:cleopatra',
      topic: 'ptolemaic_egypt',
      relationship: 'allied_with',
      direction: 'outgoing',
    },
  ]
  const relatedTopics: RelatedTopic[] = [
    { topic: 'ptolemaic_egypt', cross_topic_edge_count: 3 },
    { topic: 'greek_city_states', cross_topic_edge_count: 1 },
  ]

  it('threads focusedId into the connections panel so the matching neighbor highlights', () => {
    const html = renderToStaticMarkup(
      <CrossTopicBridge
        connections={connections}
        relatedTopics={relatedTopics}
        focusedId="roman_empire:augustus"
        onEntityClick={() => {}}
        onTopicClick={() => {}}
      />,
    )
    // The focused neighbor's chip carries the is-focused marker.
    expect(html).toContain('is-focused')
    // Both chips still render (highlight, not hide).
    expect(html).toContain('Open Augustus')
    expect(html).toContain('Open Cleopatra')
  })

  it('renders no is-focused marker when focusedId is undefined', () => {
    const html = renderToStaticMarkup(
      <CrossTopicBridge
        connections={connections}
        relatedTopics={relatedTopics}
        onEntityClick={() => {}}
        onTopicClick={() => {}}
      />,
    )
    expect(html).not.toContain('is-focused')
  })

  it('renders both child panels (connections + connected topics)', () => {
    const html = renderToStaticMarkup(
      <CrossTopicBridge
        connections={connections}
        relatedTopics={relatedTopics}
        onEntityClick={() => {}}
        onTopicClick={() => {}}
      />,
    )
    expect(html).toContain('Cross-Topic Connections')
    expect(html).toContain('Connected Topics')
    expect(html).toContain('Ptolemaic Egypt')
    expect(html).toContain('Greek City States')
  })

  it('self-hides entirely when neither panel has data (no empty chrome)', () => {
    const html = renderToStaticMarkup(
      <CrossTopicBridge onEntityClick={() => {}} onTopicClick={() => {}} />,
    )
    expect(html).not.toContain('Cross-Topic Connections')
    expect(html).not.toContain('Connected Topics')
  })
})
