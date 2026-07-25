import { useState } from 'react'
import type { SearchResultItem } from './SearchResults'
import type { Candidate } from '../data/candidateUtils'
import { toCandidate } from '../data/candidateUtils'

// M14 (Cross Topic Selection Picker): search ANY topic, then hand-pick N real
// entities across different topics into a friendly candidate list. The picked
// candidates flow (via onCandidatesChange) into the existing M13
// MultiEntityContextPanel reasoning pipeline.
//
// Freeze constraints (M14 Scope Freeze):
//   - selected candidates are COMPONENT-LOCAL state. No App global AI state,
//     no store/context provider, no persistence.
//   - Reuses the existing GET /search endpoint. Zero backend changes.
//   - No AI logic here — this is search + selection UX only.

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

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

// Container: owns query / results / selected / loading / error — all local.
export default function EntityPickerPanel({
  onCandidatesChange,
  search = defaultSearch,
}: EntityPickerPanelProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Candidate[]>([])
  const [selected, setSelected] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function emit(next: Candidate[]) {
    setSelected(next)
    onCandidatesChange?.(next)
  }

  async function runSearch(q: string) {
    const trimmed = q.trim()
    if (trimmed.length === 0) {
      setResults([])
      setError('')
      return
    }
    setLoading(true)
    setError('')
    try {
      const raw = await search(trimmed)
      setResults(resultsToCandidates(raw))
    } catch {
      setError('Unable to search. Is the backend running?')
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <EntityPickerView
      query={query}
      results={results}
      selected={selected}
      loading={loading}
      error={error}
      onQueryChange={setQuery}
      onSearch={() => runSearch(query)}
      onAdd={(c) => emit(addCandidate(selected, c))}
      onRemove={(gid) => emit(removeCandidate(selected, gid))}
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
}: EntityPickerViewProps) {
  const selectedGids = new Set(selected.map((c) => c.gid))

  return (
    <section className="entity-picker" aria-label="跨主题实体选择器">
      <h3 className="ep-title">跨主题实体选择器</h3>
      <p className="ep-hint">
        搜索任意主题，挑选多个实体（可跨主题），再向 AI 提出一个联合事实溯源问题。
      </p>

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
          placeholder="搜索实体，如 秦始皇 / 亚历山大 / 罗马帝国"
          aria-label="搜索实体"
          onChange={(e) => onQueryChange(e.target.value)}
        />
        <button type="submit" className="ep-search-btn" disabled={loading}>
          {loading ? '搜索中…' : '搜索'}
        </button>
      </form>

      {error && <p className="ep-error" role="alert">{error}</p>}

      {selected.length > 0 && (
        <div className="ep-selected" aria-label="已选实体">
          <span className="ep-selected-label">已选 {selected.length}：</span>
          <ul className="ep-chips">
            {selected.map((c) => (
              <li key={c.gid} className="ep-chip">
                <span className="ep-chip-name">{c.name}</span>
                {c.type && <span className="ep-chip-type">{c.type}</span>}
                <button
                  type="button"
                  className="ep-chip-remove"
                  aria-label={`移除 ${c.name}`}
                  onClick={() => onRemove(c.gid)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ul className="ep-results">
        {!loading && results.length === 0 && query.trim().length > 0 && !error && (
          <li className="ep-empty">没有可选的实体结果。</li>
        )}
        {results.map((c) => {
          const isSelected = selectedGids.has(c.gid)
          return (
            <li key={c.gid} className="ep-result">
              <span className="ep-result-name">{c.name}</span>
              {c.type && <span className="ep-result-type">{c.type}</span>}
              {c.topic && <span className="ep-result-topic">{c.topic}</span>}
              <button
                type="button"
                className="ep-add"
                disabled={isSelected}
                aria-label={`添加 ${c.name}`}
                onClick={() => onAdd(c)}
              >
                {isSelected ? '已添加' : '添加'}
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
