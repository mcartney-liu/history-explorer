import EmptyState from './EmptyState'

export type SearchResultItem = {
  id: string
  name: string
  type: string
  topic: string
  description?: string | null
  match?: string
  // Additive display enrichment (M2-002.5). All optional and may be null —
  // the card renders them only when present and never shows placeholder text.
  start?: string | null
  end?: string | null
  location?: string | null
}

type SearchResultsProps = {
  query: string
  results: SearchResultItem[]
  onSelect: (id: string) => void
  onClear?: () => void
  selectedIndex?: number
}

// Compose a time-period label from start/end, e.g. "63 BC – 14 CE".
// Returns '' when neither side is present so the caller can skip rendering.
function periodLabel(item: SearchResultItem): string {
  const parts = [item.start, item.end].filter((v) => !!v)
  return parts.join(' – ')
}

// M2-002 / M2-002.5: ranked search results. Each row is clickable and opens
// the matching entity page (GET /entity/{id}). Ranking badges (exact / alias /
// contains) and the optional type / time-period / location enrichment come from
// the backend, so the UI stays dumb. Missing enrichment fields are omitted
// silently (no placeholder text). `selectedIndex` drives keyboard navigation.
function SearchResults({
  query,
  results,
  onSelect,
  onClear,
  selectedIndex = -1,
}: SearchResultsProps) {
  return (
    <div className="result result-section search-results">
      <div className="search-results-head">
        <h3>Search results for “{query}”</h3>
        {onClear && (
          <button className="link-button" type="button" onClick={onClear}>
            Clear
          </button>
        )}
      </div>

      {results.length > 0 ? (
        <ul className="related-list search-list">
          {results.map((item, idx) => {
            const period = periodLabel(item)
            const selected = idx === selectedIndex
            return (
              <li
                key={`${item.topic}:${item.id}`}
                className={`is-clickable${selected ? ' is-selected' : ''}`}
                role="button"
                tabIndex={0}
                aria-selected={selected}
                aria-label={`Open ${item.name}`}
                onClick={() => onSelect(item.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelect(item.id)
                  }
                }}
              >
                <span className="re-name">{item.name}</span>
                <span className="re-type">{item.type}</span>
                {item.description ? (
                  <span className="re-desc">{item.description}</span>
                ) : null}
                <span className="re-meta">
                  {period ? <span className="re-period">{period}</span> : null}
                  {item.location ? (
                    <span className="re-loc">{item.location}</span>
                  ) : null}
                  <span className="re-rel">
                    {item.topic}
                    {item.match ? ` · ${item.match}` : ''}
                  </span>
                </span>
              </li>
            )
          })}
        </ul>
      ) : (
        <EmptyState message="No entities found." />
      )}
    </div>
  )
}

export default SearchResults
