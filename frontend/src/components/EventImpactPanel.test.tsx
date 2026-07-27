import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { EventImpactPanelView } from './EventImpactPanel'
import type { EntityRelationship } from './EntityPage'

function other(id: string, name: string, type: string): EntityRelationship['other'] {
  return { id, name, type }
}

function rel(
  type: string,
  direction: string,
  o: EntityRelationship['other'],
): EntityRelationship {
  return {
    type,
    source: direction === 'outgoing' ? 'center' : o.id,
    target: direction === 'outgoing' ? o.id : 'center',
    direction,
    other: o,
  }
}

describe('EventImpactPanelView', () => {
  it('renders empty state when no impact relationships', () => {
    const html = renderToStaticMarkup(
      <EventImpactPanelView relationships={[]} centerEntityName="Test" />,
    )
    expect(html).toContain('长期影响')
    expect(html).toContain('暂无影响数据')
  })

  it('renders caused impact on Civilization', () => {
    const html = renderToStaticMarkup(
      <EventImpactPanelView
        relationships={[rel('caused', 'outgoing', other('civ-1', 'Roman Civ', 'Civilization'))]}
        centerEntityName="Pax Romana"
        nameById={{ 'civ-1': 'Roman Civilization' }}
      />,
    )
    expect(html).toContain('Civilization')
    expect(html).toContain('Roman Civilization')
    expect(html).toContain('导致')
  })

  it('renders influenced impact on Religion', () => {
    const html = renderToStaticMarkup(
      <EventImpactPanelView
        relationships={[rel('influenced', 'outgoing', other('rel-1', 'Early Church', 'Religion'))]}
        centerEntityName="Edict of Milan"
        nameById={{ 'rel-1': 'Early Church' }}
      />,
    )
    expect(html).toContain('Religion')
    expect(html).toContain('Early Church')
    expect(html).toContain('影响')
  })

  it('groups impacts by entity type', () => {
    const html = renderToStaticMarkup(
      <EventImpactPanelView
        relationships={[
          rel('caused', 'outgoing', other('civ-1', 'Roman Civ', 'Civilization')),
          rel('influenced', 'outgoing', other('civ-2', 'Byzantine', 'Civilization')),
          rel('spread', 'outgoing', other('rel-1', 'Christianity', 'Religion')),
        ]}
        centerEntityName="Test"
        nameById={{ 'civ-1': 'Roman', 'civ-2': 'Byzantine', 'rel-1': 'Christianity' }}
      />,
    )
    // Two groups rendered
    const civCount = (html.match(/Civilization/g) || []).length
    const relCount = (html.match(/Religion/g) || []).length
    expect(civCount).toBeGreaterThanOrEqual(2)
    expect(relCount).toBeGreaterThanOrEqual(1)
    expect(html).toContain('Roman')
    expect(html).toContain('Byzantine')
    expect(html).toContain('Christianity')
  })

  it('filters out Event targets', () => {
    const html = renderToStaticMarkup(
      <EventImpactPanelView
        relationships={[
          rel('caused', 'outgoing', other('ev-1', 'Next Event', 'Event')),
          rel('influenced', 'outgoing', other('civ-1', 'Rome', 'Civilization')),
        ]}
        centerEntityName="Test"
        nameById={{ 'civ-1': 'Rome' }}
      />,
    )
    expect(html).toContain('Rome')
    expect(html).not.toContain('Next Event')
  })

  it('filters out incoming relationships', () => {
    const html = renderToStaticMarkup(
      <EventImpactPanelView
        relationships={[
          rel('caused', 'incoming', other('ev-1', 'Cause Event', 'Event')),
          rel('influenced', 'outgoing', other('civ-1', 'Rome', 'Civilization')),
        ]}
        centerEntityName="Test"
        nameById={{ 'civ-1': 'Rome' }}
      />,
    )
    // Cause Event should not appear (it's incoming + Event target)
    expect(html).not.toContain('Cause Event')
    // But Rome (outgoing, non-Event) should
    expect(html).toContain('Rome')
  })

  it('renders clickable nodes with correct id', () => {
    const html = renderToStaticMarkup(
      <EventImpactPanelView
        relationships={[rel('influenced', 'outgoing', other('civ-1', 'Rome', 'Civilization'))]}
        centerEntityName="Test"
        nameById={{ 'civ-1': 'Rome' }}
        onEntityClick={() => {}}
      />,
    )
    expect(html).toContain('is-clickable')
  })

  it('shows impact count in subtitle', () => {
    const html = renderToStaticMarkup(
      <EventImpactPanelView
        relationships={[
          rel('influenced', 'outgoing', other('civ-1', 'Rome', 'Civilization')),
          rel('caused', 'outgoing', other('civ-2', 'Byzantine', 'Civilization')),
        ]}
        centerEntityName="Test"
        nameById={{ 'civ-1': 'Rome', 'civ-2': 'Byzantine' }}
      />,
    )
    expect(html).toContain('此事件影响了 2 个实体')
  })
})
