import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { EventCausalChainView } from './EventCausalChain'
import type { EntityRelationship } from './EntityPage'

function ev(name: string, id: string): EntityRelationship['other'] {
  return { id, name, type: 'Event' }
}

function rel(
  type: string,
  direction: string,
  other: EntityRelationship['other'],
): EntityRelationship {
  return {
    type,
    source: direction === 'outgoing' ? 'center' : other.id,
    target: direction === 'incoming' ? 'center' : other.id,
    direction,
    other,
  }
}

describe('EventCausalChainView', () => {
  it('renders empty state when no Event→Event relationships', () => {
    const html = renderToStaticMarkup(
      <EventCausalChainView
        relationships={[]}
        centerEntityName="Test Event"
      />,
    )
    expect(html).toContain('事件因果链')
    expect(html).toContain('暂无因果链数据')
  })

  it('renders incoming caused relationship', () => {
    const html = renderToStaticMarkup(
      <EventCausalChainView
        relationships={[rel('caused', 'incoming', ev('Republic End', 'event-rep-end'))]}
        centerEntityName="Empire Established"
        nameById={{ 'event-rep-end': 'Republic End' }}
      />,
    )
    expect(html).toContain('导致此事件')
    expect(html).toContain('Republic End')
  })

  it('renders outgoing influenced relationship', () => {
    const html = renderToStaticMarkup(
      <EventCausalChainView
        relationships={[rel('influenced', 'outgoing', ev('Pax Romana', 'event-pax'))]}
        centerEntityName="Empire Established"
        nameById={{ 'event-pax': 'Pax Romana' }}
      />,
    )
    expect(html).toContain('此事件导致')
    expect(html).toContain('Pax Romana')
  })

  it('renders full causal chain (incoming + outgoing)', () => {
    const html = renderToStaticMarkup(
      <EventCausalChainView
        relationships={[
          rel('caused', 'incoming', ev('Republic End', 'event-rep-end')),
          rel('caused', 'outgoing', ev('Pax Romana', 'event-pax')),
          rel('influenced', 'outgoing', ev('Roman Law', 'event-law')),
        ]}
        centerEntityName="Empire Established"
        nameById={{
          'event-rep-end': 'Republic End',
          'event-pax': 'Pax Romana',
          'event-law': 'Roman Law',
        }}
      />,
    )
    expect(html).toContain('Republic End')
    expect(html).toContain('Empire Established')
    expect(html).toContain('Pax Romana')
    expect(html).toContain('Roman Law')
    // center node is non-clickable
    expect(html).not.toContain('onclick="')
  })

  it('renders before/after temporal relations', () => {
    const html = renderToStaticMarkup(
      <EventCausalChainView
        relationships={[
          rel('before', 'incoming', ev('Earlier Event', 'event-early')),
          rel('after', 'outgoing', ev('Later Event', 'event-late')),
        ]}
        centerEntityName="Middle Event"
        nameById={{ 'event-early': 'Earlier Event', 'event-late': 'Later Event' }}
      />,
    )
    expect(html).toContain('Earlier Event')
    expect(html).toContain('Later Event')
  })

  it('filters out non-Event relationships', () => {
    const html = renderToStaticMarkup(
      <EventCausalChainView
        relationships={[
          // Event→Event (should render)
          rel('caused', 'incoming', ev('Cause', 'ev-1')),
          // Person→Event (should NOT render — other.type is Person, not Event)
          {
            type: 'participated_in',
            source: 'person-1',
            target: 'center',
            direction: 'incoming',
            other: { id: 'person-1', name: 'Augustus', type: 'Person' },
          },
        ]}
        centerEntityName="Test Event"
        nameById={{ 'ev-1': 'Cause' }}
      />,
    )
    expect(html).toContain('Cause')
    expect(html).not.toContain('Augustus')
  })

  it('renders clickable buttons for related events', () => {
    const html = renderToStaticMarkup(
      <EventCausalChainView
        relationships={[rel('caused', 'incoming', ev('Republic', 'event-rep'))]}
        centerEntityName="Empire"
        nameById={{ 'event-rep': 'Republic End' }}
        onEntityClick={() => {}}
      />,
    )
    expect(html).toContain('is-clickable')
  })
})
