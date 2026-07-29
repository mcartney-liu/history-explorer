import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { LocaleProvider } from '../data/locale'
import EntitySearchBox from '../components/EntitySearchBox'
import SearchBox from '../components/SearchBox'
import SearchResults, { SearchResultItem } from '../components/SearchResults'
import { nextSelectionIndex } from '../components/searchNav'

describe('M2-002 search & entity UI', () => {
  it('EntitySearchBox exposes a search input and button', () => {
    const html = renderToStaticMarkup(
      <LocaleProvider>
        <EntitySearchBox onSearch={() => {}} />
      </LocaleProvider>,
    )
    expect(html).toContain('搜索实体')
  })

  it('SearchBox renders topic input with placeholder', () => {
    const html = renderToStaticMarkup(
      <SearchBox topic="" loading={false} error="" onTopicChange={() => {}} onExplore={() => {}} />
    )
    expect(html).toContain('placeholder="')
  })

  it('SearchResults renders ranked entities', () => {
    // M4-004 unified Search v2 shape: items carry `result_type: 'Entity'`,
    // rendered as rows under the "Entities" section. The old M2-002 shape
    // (entity_id / global_id / onSelect / onExplore) was retired in
    // commit b15cfb2; this test was never updated. Using the current API.
    const items: SearchResultItem[] = [
      { id: 'person-caesar', name: 'Julius Caesar', type: 'Person', result_type: 'Entity' as const },
      { id: 'person-augustus', name: 'Augustus', type: 'Person', result_type: 'Entity' as const },
    ]
    const html = renderToStaticMarkup(
      <LocaleProvider>
        <SearchResults
          query="caesar"
          results={items}
          onSelectItem={() => {}}
        />
      </LocaleProvider>,
    )
    expect(html).toContain('Julius Caesar')
    expect(html).toContain('Augustus')
    // M4-004 unified Search renders each row as a <li role="button"> for
    // keyboard accessibility, rather than a native <button>. Assert on the
    // accessible name + button role instead of the literal element.
    expect(html).toContain('role="button"')
    expect(html).toContain('aria-label="打开 Julius Caesar"')
  })

  it('nextSelectionIndex wraps correctly', () => {
    // Args: (current: number, delta: number, count: number)
    expect(nextSelectionIndex(0, 2, 3)).toBe(2)
    expect(nextSelectionIndex(2, 0, 3)).toBe(2)
    expect(nextSelectionIndex(-1, -1, 3)).toBe(2)
  })
})
