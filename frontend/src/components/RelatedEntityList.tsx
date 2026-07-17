import EmptyState from './EmptyState'

export type RelatedEntity = {
  id: string
  type: string
  relationship: string
}

type RelatedEntityListProps = {
  relatedEntities: RelatedEntity[]
  // Optional id -> display name lookup, sourced from the response `entities`.
  // Falls back to the raw id when a name is unavailable.
  nameById?: Record<string, string>
  // Name of the current main entity, used to express the connection explicitly
  // (answers "what relationships connect them").
  mainEntityName?: string
  // Click handler so a related entity can be explored further, closing the
  // Explore -> Connect -> Continue loop (M-H1 / M1-005 A1).
  onEntityClick?: (id: string) => void
}

function RelatedEntityList({
  relatedEntities,
  nameById,
  mainEntityName,
  onEntityClick,
}: RelatedEntityListProps) {
  return (
    <div className="result-section">
      <h3>Related Exploration</h3>
      {relatedEntities.length > 0 ? (
        <ul className="related-list">
          {relatedEntities.map((item) => {
            const displayName = nameById?.[item.id] ?? item.id
            return (
            <li
              key={item.id}
              className="is-clickable"
              role="button"
              tabIndex={0}
              aria-label={`Explore ${displayName}`}
              onClick={() => onEntityClick?.(item.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onEntityClick?.(item.id)
                }
              }}
            >
              <span className="re-name">{displayName}</span>
              <span className="re-type">{item.type}</span>
              <span className="re-rel">
                {mainEntityName
                  ? `Connected via ${item.relationship}`
                  : item.relationship}
              </span>
            </li>
            )
          })}
        </ul>
      ) : (
        <EmptyState message="No related entities." />
      )}
    </div>
  )
}

export default RelatedEntityList
