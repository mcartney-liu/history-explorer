import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { JourneyCardView } from './JourneyCard'
import type { EntityRelationship } from './EntityPage'

function rel(
  type: string,
  direction: string,
  id: string,
  name: string,
  otherType = 'Event',
): EntityRelationship {
  return {
    type,
    source: direction === 'outgoing' ? 'center' : id,
    target: direction === 'outgoing' ? id : 'center',
    direction,
    other: { id, name, type: otherType, global_id: `topic:${id}` },
  }
}

describe('JourneyCardView', () => {
  it('renders empty state when no relationships', () => {
    const html = renderToStaticMarkup(
      <JourneyCardView relationships={[]} centerEntityName="Test" />,
    )
    expect(html).toContain('继续探索')
    expect(html).toContain('暂无探索推荐')
  })

  it('renders caused recommendation cards', () => {
    const html = renderToStaticMarkup(
      <JourneyCardView
        relationships={[
          rel('caused', 'incoming', 'ev-rep', 'Republic End'),
          rel('caused', 'outgoing', 'ev-pax', 'Pax Romana'),
        ]}
        centerEntityName="Empire"
        nameById={{ 'ev-rep': 'Republic End', 'ev-pax': 'Pax Romana' }}
      />,
    )
    expect(html).toContain('Republic End')
    expect(html).toContain('Pax Romana')
    expect(html).toContain('caused')
  })

  it('renders before/after temporal cards', () => {
    const html = renderToStaticMarkup(
      <JourneyCardView
        relationships={[
          rel('before', 'outgoing', 'ev-late', 'Fall of Empire'),
          rel('after', 'incoming', 'ev-early', 'Earlier Event'),
        ]}
        centerEntityName="Middle"
        nameById={{ 'ev-late': 'Fall of Empire', 'ev-early': 'Earlier Event' }}
      />,
    )
    expect(html).toContain('Fall of Empire')
    expect(html).toContain('Earlier Event')
  })

  it('renders clickable cards', () => {
    const html = renderToStaticMarkup(
      <JourneyCardView
        relationships={[rel('caused', 'incoming', 'ev-1', 'Cause')]}
        centerEntityName="Test"
        nameById={{ 'ev-1': 'Cause' }}
        onEntityClick={() => {}}
      />,
    )
    expect(html).toContain('is-clickable')
  })

  it('shows recommendation count', () => {
    const html = renderToStaticMarkup(
      <JourneyCardView
        relationships={[
          rel('caused', 'incoming', 'ev-1', 'A'),
          rel('caused', 'outgoing', 'ev-2', 'B'),
          rel('influenced', 'outgoing', 'civ-1', 'Roman Empire', 'Civilization'),
        ]}
        centerEntityName="Test"
        nameById={{ 'ev-1': 'A', 'ev-2': 'B', 'civ-1': 'Roman Empire' }}
      />,
    )
    expect(html).toContain('3 个推荐方向')
  })

  it('sorts by priority (caused before influenced)', () => {
    const html = renderToStaticMarkup(
      <JourneyCardView
        relationships={[
          rel('influenced', 'outgoing', 'ev-inf', 'Influence'),
          rel('caused', 'outgoing', 'ev-cau', 'Caused'),
        ]}
        centerEntityName="Test"
        nameById={{ 'ev-cau': 'Caused', 'ev-inf': 'Influence' }}
      />,
    )
    const cIdx = html.indexOf('Caused')
    const iIdx = html.indexOf('Influence')
    expect(cIdx).toBeGreaterThan(0)
    expect(iIdx).toBeGreaterThan(0)
    expect(cIdx).toBeLessThan(iIdx)
  })

  it('caps at 6 recommendations', () => {
    const rels: EntityRelationship[] = Array.from({ length: 10 }, (_, i) =>
      rel('influenced', 'outgoing', `ev-${i}`, `Event ${i}`),
    )
    const html = renderToStaticMarkup(
      <JourneyCardView
        relationships={rels}
        centerEntityName="Test"
        nameById={Object.fromEntries(rels.map((_, i) => [`ev-${i}`, `Event ${i}`]))}
      />,
    )
    const count = (html.match(/is-clickable/g) || []).length
    expect(count).toBeLessThanOrEqual(6)
  })
})
