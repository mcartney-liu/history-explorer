import EmptyState from './EmptyState'
import { useLocale } from '../data/locale'
import { getEntityLabel } from '../data/entity/entityLabels'

export type SearchResultItem = {
  // M4-004 (additive): unified results[] — every row carries a `result_type`.
  // Entity rows keep their prior fields; Topic rows omit `id`/`type`/time/loc.
  result_type?: 'Entity' | 'Topic'
  id?: string
  name: string
  type?: string
  topic?: string
  // M14 (additive): a real graph global_id, when the payload carries one.
  // The current /search API omits it (it strips global_id in _entity_result),
  // so this stays OPTIONAL — candidateUtils derives `${topic}:${id}` as the
  // canonical fallback. Adding the field keeps the type honest and lets a
  // future backend surface global_id directly without another type change.
  global_id?: string
  description?: string | null
  match?: string
  // Additive display enrichment (M2-002.5). All optional and may be null —
  // the card renders them only when present and never shows placeholder text.
  start?: string | null
  end?: string | null
  location?: string | null
}

// The resolved navigation target for a search row. Pure function so the
// Entity-vs-Topic branch can be unit-tested without rendering.
export type SearchTarget =
  | { kind: 'topic'; topic: string }
  | { kind: 'entity'; id: string }

export function resolveSearchResultTarget(
  item: SearchResultItem,
): SearchTarget | null {
  if (item.result_type === 'Topic' && item.topic) {
    return { kind: 'topic', topic: item.topic }
  }
  if (item.id) {
    return { kind: 'entity', id: item.id }
  }
  return null
}

// M4-004: group the unified list into a single ordered list with Topics
// first, then Entities — preserving the backend's deterministic (rank, name)
// order WITHIN each group. The flattened order is what keyboard navigation
// indexes against, so the DOM order matches `selectedIndex`.
export function orderSearchResults(
  items: SearchResultItem[] | null,
): SearchResultItem[] {
  if (!items) return []
  const topics = items.filter((i) => i.result_type === 'Topic')
  const entities = items.filter((i) => i.result_type !== 'Topic')
  return [...topics, ...entities]
}

type SearchResultsProps = {
  query: string
  results: SearchResultItem[]
  onSelectItem: (item: SearchResultItem) => void
  onClear?: () => void
  selectedIndex?: number
}

// Compose a time-period label from start/end, e.g. "63 BC – 14 CE".
// Returns '' when neither side is present so the caller can skip rendering.
function periodLabel(item: SearchResultItem): string {
  const parts = [item.start, item.end].filter((v) => !!v)
  return parts.join(' – ')
}

function rowKey(item: SearchResultItem): string {
  return item.result_type === 'Topic'
    ? `topic:${item.topic}`
    : `${item.topic}:${item.id}`
}

// M4-004 (was M2-002 / M2-002.5): unified ranked search results rendered by
// Section — Topics first, then Entities. Each row is clickable and opens the
// matching entity page (GET /entity/{id}) or navigates to the topic. Ranking
// badges (exact / alias / contains) and the optional type / time-period /
// location enrichment come from the backend, so the UI stays dumb. Missing
// enrichment fields are omitted silently (no placeholder text). `selectedIndex`
// drives keyboard navigation against the flattened (Topics-then-Entities) order.
function SearchResults({
  query,
  results,
  onSelectItem,
  onClear,
  selectedIndex = -1,
}: SearchResultsProps) {
  const { t, locale } = useLocale()
  const topics = results.filter((r) => r.result_type === 'Topic')
  const entities = results.filter((r) => r.result_type !== 'Topic')

  function renderRow(item: SearchResultItem) {
    const period = periodLabel(item)
    const selected = results.indexOf(item) === selectedIndex
    const isTopic = item.result_type === 'Topic'
    return (
      <li
        key={rowKey(item)}
        className={`is-clickable${selected ? ' is-selected' : ''}`}
        role="button"
        tabIndex={0}
        aria-selected={selected}
        aria-label={t('common.openLabel', { name: item.name })}
        onClick={() => onSelectItem(item)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onSelectItem(item)
          }
        }}
      >
        <span className="re-name">{item.name}</span>
        <span className="re-type">
          {isTopic ? t('common.kindTopic') : getEntityLabel(item.type ?? '', locale)}
        </span>
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
  }

  return (
    <div className="result result-section search-results">
      <div className="search-results-head">
        <h3>{t('search.resultsFor', { query })}</h3>
        {onClear && (
          <button className="link-button" type="button" onClick={onClear}>
            {t('common.clear')}
          </button>
        )}
      </div>

      {results.length > 0 ? (
        <>
          {topics.length > 0 && (
            <>
              <h4 className="search-section-title">{t('search.topicsHeading')}</h4>
              <ul className="related-list search-list">
                {topics.map(renderRow)}
              </ul>
            </>
          )}
          {entities.length > 0 && (
            <>
              <h4 className="search-section-title">{t('search.entitiesHeading')}</h4>
              <ul className="related-list search-list">
                {entities.map(renderRow)}
              </ul>
            </>
          )}
        </>
      ) : (
        <>
          <EmptyState message={t('search.noResults')} />
          {query && (
            <p className="search-noresults-hint">{t('search.noResultsHint', { query })}</p>
          )}
        </>
      )}
    </div>
  )
}

export default SearchResults
