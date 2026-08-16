import { useState } from 'react'
import type { SearchResultItem } from './SearchResults'
import type { Candidate } from '../data/candidateUtils'
import { toCandidate } from '../data/candidateUtils'
import type { SortKey } from '../data/pickerUtils'
import {
  filterByTopic,
  distinctTopics,
  sortCandidates,
  reorderCandidates,
  clearCandidates,
} from '../data/pickerUtils'
import { useLocale } from '../data/locale'
import { getEntityLabel, getEntityIcon } from '../data/entity/entityLabels'
import { Icon } from './ui/Icon'
import type { IconName } from './ui/Icon'

// M14 (Cross Topic Selection Picker): search ANY topic, then hand-pick N real
// entities across different topics into a friendly candidate list. The picked
// candidates flow (via onCandidatesChange) into the existing M13
// MultiEntityContextPanel reasoning pipeline.
//
// M15 (Multi Entity Reasoning Enhancement): thickened selection UX built ONLY
// from the pure pickerUtils helpers — topic-filter chips, a sort control,
// selected-candidate reordering, clear-all, and results overflow handling.
//
// Freeze constraints (M14/M15 Scope Freeze):
//   - selected candidates AND the new sort/topic-filter choices are all
//     COMPONENT-LOCAL state. No App global AI state, no store/context provider,
//     no persistence.
//   - Reuses the existing GET /search endpoint. Zero backend changes.
//   - No AI logic here — this is search + selection UX only.
//   - global_id (Candidate.gid) stays authoritative: filtering/sorting/reorder
//     never rewrite an id, they only rearrange the SAME candidates.

import { API_BASE } from '../config/api'

// UI-only cap on how many result rows to render at once (overflow handling).
// Not a data limit — the full list is still searchable via a narrower query.
const MAX_VISIBLE_RESULTS = 50

// Sort keys (the human label is localized via t() at render time).
const SORT_KEYS: SortKey[] = ['name', 'type', 'topic', 'gid']

/**
 * Map a raw /search response into selectable candidates: drop non-entity /
 * unresolvable rows (toCandidate → null) and de-duplicate by gid, preserving
 * first-occurrence order. Pure — unit-testable without a DOM.
 */
export function resultsToCandidates(results: SearchResultItem[]): Candidate[] {
  const seen = new Set<string>()
  const out: Candidate[] = []
  for (const item of results) {
    const c = toCandidate(item)
    if (c && !seen.has(c.gid)) {
      seen.add(c.gid)
      out.push(c)
    }
  }
  return out
}

/** Add a candidate unless its gid is already selected. Pure. */
export function addCandidate(prev: Candidate[], c: Candidate): Candidate[] {
  if (prev.some((p) => p.gid === c.gid)) return prev
  return [...prev, c]
}

/** Remove a candidate by gid. Pure. */
export function removeCandidate(prev: Candidate[], gid: string): Candidate[] {
  return prev.filter((p) => p.gid !== gid)
}

/**
 * Default search fetcher (injectable for tests). Reuses GET /search and returns
 * the raw results[]; parsing into candidates happens in resultsToCandidates so
 * the network shape stays identical to App.handleSearch.
 */
async function defaultSearch(query: string): Promise<SearchResultItem[]> {
  const response = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`)
  if (!response.ok) throw new Error(`Search failed (${response.status})`)
  const data = await response.json()
  return (data.results ?? []) as SearchResultItem[]
}

export type EntityPickerPanelProps = {
  // Notifies the host of the current picked set. The host may forward it into
  // MultiEntityContextPanel's `candidates` prop. This is a plain selection
  // list, NOT AI state.
  onCandidatesChange?: (candidates: Candidate[]) => void
  // Injectable search fn (tests provide a stub; production uses /search).
  search?: (query: string) => Promise<SearchResultItem[]>
}

// Container: owns query / results / selected / loading / error AND the M15
// view-only choices (sortKey / activeTopic) — all local, never persisted.
export default function EntityPickerPanel({
  onCandidatesChange,
  search = defaultSearch,
}: EntityPickerPanelProps) {
  const { t } = useLocale()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Candidate[]>([])
  const [selected, setSelected] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [activeTopic, setActiveTopic] = useState('')

  function emit(next: Candidate[]) {
    setSelected(next)
    onCandidatesChange?.(next)
  }

  async function runSearch(q: string) {
    const trimmed = q.trim()
    if (trimmed.length === 0) {
      setResults([])
      setError('')
      setActiveTopic('') // reset the topic filter for the empty state
      return
    }
    setLoading(true)
    setError('')
    try {
      const raw = await search(trimmed)
      setResults(resultsToCandidates(raw))
      setActiveTopic('') // new result set → clear any stale topic filter
    } catch {
      setError(t('picker.searchError'))
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  // Derived, pure view model — filter then sort the SAME candidates by gid.
  const topics = distinctTopics(results)
  const visibleResults = sortCandidates(filterByTopic(results, activeTopic), sortKey)

  return (
    <EntityPickerView
      query={query}
      results={visibleResults}
      selected={selected}
      loading={loading}
      error={error}
      topics={topics}
      activeTopic={activeTopic}
      sortKey={sortKey}
      maxVisibleResults={MAX_VISIBLE_RESULTS}
      onQueryChange={setQuery}
      onSearch={() => runSearch(query)}
      onAdd={(c) => emit(addCandidate(selected, c))}
      onRemove={(gid) => emit(removeCandidate(selected, gid))}
      onTopicFilter={(tt) => setActiveTopic(tt)}
      onSortChange={(k) => setSortKey(k)}
      onReorder={(from, to) => emit(reorderCandidates(selected, from, to))}
      onClearAll={() => emit(clearCandidates())}
    />
  )
}

export type EntityPickerViewProps = {
  query: string
  results: Candidate[]
  selected: Candidate[]
  loading: boolean
  error: string
  onQueryChange: (q: string) => void
  onSearch: () => void
  onAdd: (c: Candidate) => void
  onRemove: (gid: string) => void
  // M15 — all optional so existing callers/tests keep working unchanged.
  topics?: string[]
  activeTopic?: string
  sortKey?: SortKey
  maxVisibleResults?: number
  onTopicFilter?: (topic: string) => void
  onSortChange?: (key: SortKey) => void
  onReorder?: (from: number, to: number) => void
  onClearAll?: () => void
}

// Presentational view — every visual state derives purely from props.
export function EntityPickerView({
  query,
  results,
  selected,
  loading,
  error,
  onQueryChange,
  onSearch,
  onAdd,
  onRemove,
  topics = [],
  activeTopic = '',
  sortKey = 'name',
  maxVisibleResults,
  onTopicFilter,
  onSortChange,
  onReorder,
  onClearAll,
}: EntityPickerViewProps) {
  const { t, locale } = useLocale()
  const selectedGids = new Set(selected.map((c) => c.gid))
  const cap = typeof maxVisibleResults === 'number' ? maxVisibleResults : results.length
  const shown = results.slice(0, cap)
  const overflow = results.length - shown.length

  return (
    <section className="entity-picker" aria-label={t('picker.title')}>
      <h3 className="ep-title">{t('picker.title')}</h3>
      <p className="ep-hint">{t('picker.hint')}</p>

      <form
        className="ep-search"
        onSubmit={(e) => {
          e.preventDefault()
          onSearch()
        }}
      >
        <input
          type="search"
          className="ep-input"
          value={query}
          placeholder={t('picker.searchPlaceholder')}
          aria-label={t('picker.searchAria')}
          onChange={(e) => onQueryChange(e.target.value)}
        />
        <button type="submit" className="ep-search-btn" disabled={loading}>
          {loading ? t('picker.searchBtnLoading') : t('picker.searchBtn')}
        </button>
      </form>

      {error && <p className="ep-error" role="alert">{error}</p>}

      {selected.length > 0 && (
        <div className="ep-selected" aria-label={t('picker.selectedAria')}>
          <div className="ep-selected-head">
            <span className="ep-selected-label">
              {t('picker.selectedLabel', { n: String(selected.length) })}
            </span>
            {onClearAll && (
              <button
                type="button"
                className="ep-clear-all"
                aria-label={t('picker.clearAria')}
                onClick={() => onClearAll()}
              >
                {t('picker.clear')}
              </button>
            )}
          </div>
          <ul className="ep-chips">
            {selected.map((c, i) => (
              <li key={c.gid} className="ep-chip">
                {onReorder && (
                  <button
                    type="button"
                    className="ep-chip-up"
                    aria-label={t('picker.upAria', { name: c.name })}
                    disabled={i === 0}
                    onClick={() => onReorder(i, i - 1)}
                  >
                    ↑
                  </button>
                )}
                {onReorder && (
                  <button
                    type="button"
                    className="ep-chip-down"
                    aria-label={t('picker.downAria', { name: c.name })}
                    disabled={i === selected.length - 1}
                    onClick={() => onReorder(i, i + 1)}
                  >
                    ↓
                  </button>
                )}
                <span className="ep-chip-name">
                  <Icon
                    name={getEntityIcon(c.type ?? '') as IconName}
                    size={16}
                    className="ep-chip-name-icon"
                  />
                  {c.name}
                </span>
                {c.type && <span className="ep-chip-type">{getEntityLabel(c.type, locale)}</span>}
                <button
                  type="button"
                  className="ep-chip-remove"
                  aria-label={t('picker.removeAria', { name: c.name })}
                  onClick={() => onRemove(c.gid)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {onTopicFilter && topics.length > 0 && (
        <div className="ep-topics" aria-label={t('picker.topicFilterAria')}>
          <button
            type="button"
            className={`ep-topic-chip${activeTopic === '' ? ' is-active' : ''}`}
            aria-pressed={activeTopic === ''}
            onClick={() => onTopicFilter('')}
          >
            {t('picker.all')}
          </button>
          {topics.map((topic) => (
            <button
              key={topic}
              type="button"
              className={`ep-topic-chip${activeTopic === topic ? ' is-active' : ''}`}
              aria-pressed={activeTopic === topic}
              onClick={() => onTopicFilter(topic)}
            >
              {topic}
            </button>
          ))}
        </div>
      )}

      {onSortChange && results.length > 0 && (
        <div className="ep-sort">
          <label className="ep-sort-label" htmlFor="ep-sort-select">
            {t('picker.sortLabel')}
          </label>
          <select
            id="ep-sort-select"
            className="ep-sort-select"
            value={sortKey}
            onChange={(e) => onSortChange(e.target.value as SortKey)}
          >
            {SORT_KEYS.map((k) => (
              <option key={k} value={k}>
                {t(`picker.sort${k.charAt(0).toUpperCase()}${k.slice(1)}`)}
              </option>
            ))}
          </select>
        </div>
      )}

      <ul className="ep-results">
        {!loading && results.length === 0 && query.trim().length > 0 && !error && (
          <li className="ep-empty">{t('picker.emptyResults')}</li>
        )}
        {shown.map((c) => {
          const isSelected = selectedGids.has(c.gid)
          return (
            <li key={c.gid} className="ep-result">
              <span className="ep-result-name">
                <Icon
                  name={getEntityIcon(c.type ?? '') as IconName}
                  size={16}
                  className="ep-result-name-icon"
                />
                {c.name}
              </span>
              {c.type && <span className="ep-result-type">{getEntityLabel(c.type, locale)}</span>}
              {c.topic && <span className="ep-result-topic">{c.topic}</span>}
              <button
                type="button"
                className="ep-add"
                disabled={isSelected}
                aria-label={t('picker.addAria', { name: c.name })}
                onClick={() => onAdd(c)}
              >
                {isSelected ? t('picker.added') : t('picker.add')}
              </button>
            </li>
          )
        })}
        {overflow > 0 && (
          <li className="ep-overflow" aria-label={t('picker.resultOverflowAria')}>
            {t('picker.overflow', { n: String(overflow) })}
          </li>
        )}
      </ul>
    </section>
  )
}
