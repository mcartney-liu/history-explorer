import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import EntitySearchBox from '../components/EntitySearchBox'
import SearchBox from '../components/SearchBox'
import SearchResults, { SearchResultItem } from '../components/SearchResults'
import { nextSelectionIndex } from '../components/searchNav'

describe('M2-002 search & entity UI', () => {
  it('EntitySearchBox exposes a search input and button', () => {
    const html = renderToStaticMarkup(<EntitySearchBox onSearch={() => {}} />)
    expect(html).toContain('Search entities')
  })

  it('SearchBox renders topic input with placeholder', () => {
    const html = renderToStaticMarkup(
      <SearchBox topic="" loading={false} error="" onTopicChange={() => {}} onExplore={() => {}} />
    )
    expect(html).toContain('placeholder="')
  })

  it('SearchResults renders ranked entities', () => {
    const items: SearchResultItem[] = [
      { entity_id: 'person-caesar', name: 'Julius Caesar', global_id: 'roman_republic:person-caesar' },
      { entity_id: 'person-augustus', name: 'Augustus', global_id: 'roman_republic:person-augustus' },
    ]
    const html = renderToStaticMarkup(
      <SearchResults items={items} cursor={0} onSelect={() => {}} onExplore={() => {}} />,
    )
    expect(html).toContain('Julius Caesar')
    expect(html).toContain('Augustus')
    expect(html).toContain('<button')
  })

  it('nextSelectionIndex wraps correctly', () => {
    // Args: (current: number, delta: number, count: number)
    expect(nextSelectionIndex(0, 2, 3)).toBe(2)
    expect(nextSelectionIndex(2, 0, 3)).toBe(2)
    expect(nextSelectionIndex(-1, -1, 3)).toBe(2)
  })
})
