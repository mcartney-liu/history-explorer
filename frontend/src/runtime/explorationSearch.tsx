// P1-② (Engineering Health, 2026-08-14, PO-approved): search behavior cluster
// relocated out of App.tsx — pure relocation, logic & call sites unchanged.
//
// This hook owns the search *interaction* behavior (result selection, keyboard
// navigation, escape/clear, and the `searchSlot` JSX that wires the search box
// + results overlay). The actual fetch (`handleSearch`, which also resets the
// entity/result view state) intentionally stays in App and is passed in, so this
// module never has to depend on `ExplorationResult` / `EntityDetail`.
//
// All search view-state (query / results / loading / error / selected) remains
// owned by App via `useState`; it is forwarded in as values + setters.

import type { Dispatch, ReactElement, SetStateAction } from 'react'
import EntitySearchBox from '../components/EntitySearchBox'
import SearchResults, {
  SearchResultItem,
  orderSearchResults,
  resolveSearchResultTarget,
} from '../components/SearchResults'
import { nextSelectionIndex } from '../components/searchNav'
import { resolveNarrativeKey } from '../data/narrative'
import type { NavNode } from '../components/navigation'

export interface UseExplorationSearchInput {
  searchQuery: string
  searchResults: SearchResultItem[] | null
  searchLoading: boolean
  searchError: string
  searchSelected: number
  setSearchResults: Dispatch<SetStateAction<SearchResultItem[] | null>>
  setSearchQuery: Dispatch<SetStateAction<string>>
  setSearchSelected: Dispatch<SetStateAction<number>>
  /** Async fetch, owned by App (also resets entity/result view state). */
  handleSearch: (q: string) => void | Promise<void>
  navigateTo: (node: NavNode) => void
  openEntity: (id: string, name?: string, tab?: 'info' | 'research' | 'extensions') => void
  prettifyTopic: (t: string) => string
}

export function useExplorationSearch(input: UseExplorationSearchInput): {
  searchSlot: ReactElement
} {
  const {
    searchQuery,
    searchResults,
    searchLoading,
    searchError,
    searchSelected,
    setSearchResults,
    setSearchQuery,
    setSearchSelected,
    handleSearch,
    navigateTo,
    openEntity,
    prettifyTopic,
  } = input

  function handleResultSelect(item: SearchResultItem) {
    const target = resolveSearchResultTarget(item)
    if (!target) return
    if (target.kind === 'topic') {
      navigateTo({
        type: 'topic',
        topic: target.topic,
        title: item.name || prettifyTopic(target.topic),
      })
    } else {
      // M35.1: reconstruct the entity global_id (the /search response strips
      // global_id, leaving only topic + id) so StorySection / WhyImportantPanel
      // inside EntityPage can match the curated narrative.
      openEntity(resolveNarrativeKey(item), item.name)
    }
  }

  // M4-004: the unified list is rendered Topics-first, so keyboard navigation
  // must index against the same ordered view the UI renders.
  const orderedSearchResults = orderSearchResults(searchResults)

  // M2-002.5 keyboard navigation handlers (wired to the search box).
  function handleSearchNav(direction: 'up' | 'down') {
    if (orderedSearchResults.length === 0) return
    setSearchSelected((cur) =>
      nextSelectionIndex(
        cur,
        direction === 'down' ? 1 : -1,
        orderedSearchResults.length,
      ),
    )
  }

  function handleSearchEnterSelect() {
    if (orderedSearchResults.length === 0) return
    const idx = searchSelected >= 0 ? searchSelected : 0
    handleResultSelect(orderedSearchResults[idx])
  }

  function handleSearchEscape() {
    clearSearch()
    setSearchSelected(-1)
  }

  function clearSearch() {
    setSearchResults(null)
    setSearchQuery('')
    setSearchSelected(-1)
  }

  // M34-A1: the search cluster and the navigation cluster are hoisted into
  // AppShell slots. AppShell wraps the nav cluster in a semantic <nav
  // class="nav-shell"> (fixes TD-nav) and renders the same hero + .explorer
  // chrome the monolith rendered, so the smoke tests stay green.
  const searchSlot = (
    <>
      <EntitySearchBox
        onSearch={handleSearch}
        loading={searchLoading}
        error={searchError}
        resultsActive={!!searchResults && searchResults.length > 0}
        onArrow={handleSearchNav}
        onEnterSelect={handleSearchEnterSelect}
        onEscape={handleSearchEscape}
      />

      {searchResults && (
        <SearchResults
          query={searchQuery}
          results={orderedSearchResults}
          onSelectItem={handleResultSelect}
          onClear={clearSearch}
          selectedIndex={searchSelected}
        />
      )}
    </>
  )

  return { searchSlot }
}
