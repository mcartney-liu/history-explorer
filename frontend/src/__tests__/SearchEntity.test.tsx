import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import App from '../App'
import EntitySearchBox from '../components/EntitySearchBox'
import SearchResults, { SearchResultItem } from '../components/SearchResults'
import EntityPage, { EntityDetail } from '../components/EntityPage'
import { nextSelectionIndex } from '../components/searchNav'

// M2-002 frontend tests. We render components directly (no DOM/interaction
// library is added, per the no-new-dependency constraint) to verify the
// search bar, ranked results, entity rendering, and clickable navigation
// surface are all present. Interaction wiring is covered end-to-end by the
// backend integration tests.
describe('M2-002 search & entity UI', () => {
  it('app renders the new entity search bar', () => {
    const html = renderToStaticMarkup(<App />)
    expect(html).toContain('Search entities')
  })

  it('EntitySearchBox exposes a search input and button', () => {
    const html = renderToStaticMarkup(<EntitySearchBox onSearch={() => {}} />)
    expect(html).toContain('Search entities')
    expect(html).toContain('Search')
  })

  it('SearchResults renders ranked entities and marks them clickable', () => {
    const results: SearchResultItem[] = [
      { id: 'person-augustus', name: 'Augustus', type: 'Person', topic: 'roman_empire', match: 'exact' },
      { id: 'loc-rome', name: 'Rome', type: 'Location', topic: 'roman_empire', match: 'contains' },
    ]
    const html = renderToStaticMarkup(
      <SearchResults query="rome" results={results} onSelect={() => {}} />,
    )
    // Both entities listed
    expect(html).toContain('Augustus')
    expect(html).toContain('Rome')
    // Clickable navigation surface (role=button) is present
    expect(html).toContain('role="button"')
    expect(html).toContain('Open Augustus')
    // Match badges surface the ranking
    expect(html).toContain('exact')
    expect(html).toContain('contains')
  })

  it('SearchResults shows an empty state when nothing matches', () => {
    const html = renderToStaticMarkup(
      <SearchResults query="zzz" results={[]} onSelect={() => {}} />,
    )
    expect(html).toContain('No entities found.')
  })

  it('EntityPage renders summary, relationships and timeline', () => {
    const entity: EntityDetail = {
      id: 'person-augustus',
      type: 'Person',
      name: 'Augustus',
      summary: {
        id: 'person-augustus',
        type: 'Person',
        name: 'Augustus',
        description: 'First Roman emperor.',
      },
      timeline: [{ period: '27 BC', event: 'Roman Empire Established' }],
      relationships: [
        {
          type: 'participated_in',
          source: 'person-augustus',
          target: 'event-roman-empire-established',
          direction: 'outgoing',
          other: {
            id: 'event-roman-empire-established',
            name: 'Roman Empire Established',
            type: 'Event',
          },
        },
      ],
      exploration: {
        main_entity: {
          id: 'person-augustus',
          type: 'Person',
          name: 'Augustus',
          description: 'First Roman emperor.',
        },
        related_entities: [
          {
            id: 'event-roman-empire-established',
            type: 'Event',
            relationship: 'participated_in',
          },
        ],
      },
    }
    const html = renderToStaticMarkup(
      <EntityPage entity={entity} onEntityClick={() => {}} />,
    )
    // Summary / name
    expect(html).toContain('Augustus')
    expect(html).toContain('First Roman emperor.')
    // Timeline entry
    expect(html).toContain('Roman Empire Established')
    // Relationship / related entity clickable surface
    expect(html).toContain('role="button"')
    expect(html).toContain('Explore Roman Empire Established')
    // Section headings
    expect(html).toContain('Relationship Network')
    expect(html).toContain('Related Exploration')
  })

  it('SearchResults shows type, time period, location and description', () => {
    const results: SearchResultItem[] = [
      {
        id: 'person-augustus',
        name: 'Augustus',
        type: 'Person',
        topic: 'roman_empire',
        description: 'First Roman emperor.',
        start: '63 BC',
        end: '14 CE',
        location: null,
        match: 'exact',
      },
      {
        id: 'loc-rome',
        name: 'Rome',
        type: 'Location',
        topic: 'roman_empire',
        description: 'Capital of the Roman Empire.',
        start: null,
        end: null,
        location: 'Italian Peninsula',
        match: 'exact',
      },
    ]
    const html = renderToStaticMarkup(
      <SearchResults query="rome" results={results} onSelect={() => {}} />,
    )
    // Time period composed from start/end labels
    expect(html).toContain('63 BC')
    expect(html).toContain('14 CE')
    // Location surfaced for the Location entity
    expect(html).toContain('Italian Peninsula')
    // Description rendered; type badge present
    expect(html).toContain('First Roman emperor.')
    expect(html).toContain('Person')
  })

  it('SearchResults omits missing time/location without placeholder text', () => {
    const results: SearchResultItem[] = [
      { id: 'civ-x', name: 'Some Civ', type: 'Civilization', topic: 'roman_empire' },
    ]
    const html = renderToStaticMarkup(
      <SearchResults query="x" results={results} onSelect={() => {}} />,
    )
    // No enrichment spans when the data is absent
    expect(html).not.toContain('re-period')
    expect(html).not.toContain('re-loc')
    // No placeholder / dash text anywhere (graceful omission)
    expect(html).not.toContain('—')
    expect(html).not.toContain('N/A')
    // Name + type still render
    expect(html).toContain('Some Civ')
    expect(html).toContain('Civilization')
  })

  it('SearchResults marks the keyboard-selected row', () => {
    const results: SearchResultItem[] = [
      { id: 'a', name: 'Alpha', type: 'Person', topic: 't' },
      { id: 'b', name: 'Beta', type: 'Location', topic: 't' },
    ]
    const html = renderToStaticMarkup(
      <SearchResults query="x" results={results} onSelect={() => {}} selectedIndex={1} />,
    )
    // The highlight class is present and sits on the Beta row (not Alpha).
    expect(html).toContain('is-selected')
    expect(html.indexOf('Alpha')).toBeLessThan(html.indexOf('is-selected'))
    expect(html.indexOf('is-selected')).toBeLessThan(html.indexOf('Beta'))
  })
})
