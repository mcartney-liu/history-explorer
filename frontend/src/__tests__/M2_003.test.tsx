import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import Breadcrumb from '../components/Breadcrumb'
import HistoryBar from '../components/HistoryBar'
import RecentExplorations from '../components/RecentExplorations'
import RelationshipView from '../components/RelationshipView'
import TimelinePanel from '../components/TimelinePanel'
import LoadingSkeleton from '../components/LoadingSkeleton'
import ErrorCard from '../components/ErrorCard'
import EmptyState from '../components/EmptyState'
import EntityPage, { EntityDetail } from '../components/EntityPage'
import { NavNode } from '../components/navigation'

const crumbs = [
  { key: 'home', label: 'Home', index: 0 },
  { key: 'topic:roman_empire', label: 'Roman Empire', index: 1 },
  { key: 'entity:person-augustus', label: 'Augustus', index: 2 },
]

describe('M2-003 Breadcrumb', () => {
  it('renders Home plus visited levels; current level is not a button', () => {
    const html = renderToStaticMarkup(
      <Breadcrumb crumbs={crumbs} onCrumbClick={() => {}} />,
    )
    expect(html).toContain('Home')
    expect(html).toContain('Roman Empire')
    expect(html).toContain('Augustus')
    expect(html).toContain('aria-current="page"')
    // Non-current crumbs are clickable links.
    expect(html).toContain('he-breadcrumb-link')
  })
})

describe('M2-003 HistoryBar', () => {
  it('disables Back at the start and Forward at the end', () => {
    const html = renderToStaticMarkup(
      <HistoryBar canBack={false} canForward={false} onBack={() => {}} onForward={() => {}} />,
    )
    expect(html).toContain('disabled')
  })

  it('enables both buttons when navigation is possible', () => {
    const html = renderToStaticMarkup(
      <HistoryBar canBack={true} canForward={true} onBack={() => {}} onForward={() => {}} />,
    )
    // Two enabled buttons => no "disabled" attribute present.
    expect(html).not.toContain('disabled')
  })
})

describe('M2-003 RecentExplorations', () => {
  const items: NavNode[] = [
    { type: 'topic', topic: 'roman_empire', title: 'Roman Empire' },
    { type: 'entity', id: 'person-augustus', name: 'Augustus' },
  ]

  it('renders clickable chips with type + label', () => {
    const html = renderToStaticMarkup(
      <RecentExplorations items={items} onSelect={() => {}} />,
    )
    expect(html).toContain('Recent Explorations')
    expect(html).toContain('Roman Empire')
    expect(html).toContain('Augustus')
    expect(html).toContain('he-recent-chip')
  })

  it('renders nothing when there are no items', () => {
    const html = renderToStaticMarkup(
      <RecentExplorations items={[]} onSelect={() => {}} />,
    )
    expect(html).toBe('')
  })
})

describe('M2-003 Relationship navigation', () => {
  const mainEntity = { id: 'person-augustus', type: 'Person', name: 'Augustus', description: '' }
  const related = [{ id: 'event-x', type: 'Event', relationship: 'participated_in' }]

  it('makes every relationship branch clickable when onEntityClick is provided', () => {
    const html = renderToStaticMarkup(
      <RelationshipView
        mainEntity={mainEntity}
        relatedEntities={related}
        nameById={{ 'event-x': 'Battle of Actium' }}
        onEntityClick={() => {}}
      />,
    )
    expect(html).toContain('role="button"')
    expect(html).toContain('Explore Battle of Actium')
  })

  it('falls back to the raw id when no name is available', () => {
    const html = renderToStaticMarkup(
      <RelationshipView
        mainEntity={mainEntity}
        relatedEntities={related}
        onEntityClick={() => {}}
      />,
    )
    expect(html).toContain('Explore event-x')
  })
})

describe('M2-003 Timeline navigation', () => {
  const timeline = [{ period: '27 BC', event: 'Roman Empire Established' }]

  it('makes an event clickable when its name maps to an entity', () => {
    const html = renderToStaticMarkup(
      <TimelinePanel
        timeline={timeline}
        nameToId={{ 'Roman Empire Established': 'event-roman-empire-established' }}
        onEventClick={() => {}}
      />,
    )
    expect(html).toContain('Open Roman Empire Established')
  })

  it('stays static when the event is not linked to an entity', () => {
    const html = renderToStaticMarkup(<TimelinePanel timeline={timeline} />)
    expect(html).not.toContain('Open Roman Empire Established')
    expect(html).toContain('Roman Empire Established')
  })

  it('EntityPage timeline becomes clickable when a related event is linked', () => {
    const entity: EntityDetail = {
      id: 'person-augustus',
      type: 'Person',
      name: 'Augustus',
      summary: { id: 'person-augustus', type: 'Person', name: 'Augustus', description: 'First Roman emperor.' },
      timeline: [{ period: '27 BC', event: 'Roman Empire Established' }],
      relationships: [
        {
          type: 'participated_in',
          source: 'person-augustus',
          target: 'event-roman-empire-established',
          direction: 'outgoing',
          other: { id: 'event-roman-empire-established', name: 'Roman Empire Established', type: 'Event' },
        },
      ],
      exploration: {
        main_entity: { id: 'person-augustus', type: 'Person', name: 'Augustus', description: '' },
        related_entities: [{ id: 'event-roman-empire-established', type: 'Event', relationship: 'participated_in' }],
      },
    }
    const html = renderToStaticMarkup(
      <EntityPage entity={entity} onEntityClick={() => {}} />,
    )
    expect(html).toContain('Open Roman Empire Established')
  })
})

describe('M2-003 unified states', () => {
  it('LoadingSkeleton exposes a status role', () => {
    const html = renderToStaticMarkup(<LoadingSkeleton />)
    expect(html).toContain('role="status"')
    expect(html).toContain('he-skeleton')
  })

  it('EmptyState renders the provided message', () => {
    const html = renderToStaticMarkup(<EmptyState message="No timeline data." />)
    expect(html).toContain('No timeline data.')
  })

  it('ErrorCard shows accurate copy per kind', () => {
    expect(renderToStaticMarkup(<ErrorCard kind="notfound" />)).toContain('Not found')
    expect(renderToStaticMarkup(<ErrorCard kind="network" />)).toContain('Connection problem')
    expect(renderToStaticMarkup(<ErrorCard kind="parse" />)).toContain('Something went wrong')
  })
})
