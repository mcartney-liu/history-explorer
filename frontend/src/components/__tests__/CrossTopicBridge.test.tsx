import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup as r2s } from 'react-dom/server'
import CrossTopicBridge from '../CrossTopicBridge'
import type { CrossTopicRelated, RelatedTopic } from '../crossTopic'
import { LocaleProvider } from '../../data/locale'
import type { ReactElement } from 'react'

const render = (el: ReactElement) => r2s(<LocaleProvider>{el}</LocaleProvider>)

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
    const html = render(
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
    expect(html).toContain('打开 Augustus')
    expect(html).toContain('打开 Cleopatra')
  })

  it('renders no is-focused marker when focusedId is undefined', () => {
    const html = render(
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
    const html = render(
      <CrossTopicBridge
        connections={connections}
        relatedTopics={relatedTopics}
        onEntityClick={() => {}}
        onTopicClick={() => {}}
      />,
    )
    expect(html).toContain('跨主题关联')
    expect(html).toContain('关联主题')
    expect(html).toContain('Ptolemaic Egypt')
    expect(html).toContain('Greek City States')
  })

  it('self-hides entirely when neither panel has data (no empty chrome)', () => {
    const html = render(
      <CrossTopicBridge onEntityClick={() => {}} onTopicClick={() => {}} />,
    )
    expect(html).not.toContain('跨主题关联')
    expect(html).not.toContain('关联主题')
  })
})
