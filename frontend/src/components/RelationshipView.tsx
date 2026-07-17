import { MainEntity } from './MainEntityCard'
import { RelatedEntity } from './RelatedEntityList'
import EmptyState from './EmptyState'

type RelationshipViewProps = {
  mainEntity: MainEntity
  relatedEntities: RelatedEntity[]
  // Optional id -> display name lookup, sourced from the response `entities`.
  // Falls back to the raw id when a name is unavailable.
  nameById?: Record<string, string>
  // M2-003: clicking a relationship branch navigates straight to the other
  // entity, so every relationship is a continuation point in the loop.
  onEntityClick?: (id: string) => void
}

// Lightweight relationship visualization prototype (S5-003).
// Pure CSS tree: current main entity at the root, connected entities branching
// below it. No graph engine, SVG, D3, canvas, or animation library.
function RelationshipView({
  mainEntity,
  relatedEntities,
  nameById,
  onEntityClick,
}: RelationshipViewProps) {
  if (!mainEntity?.id) {
    return null
  }

  return (
    <div className="result-section">
      <h3>Relationship Network</h3>
      <div className="rel-network">
        <div className="rel-root">
          <span className="rel-root-name">{mainEntity.name}</span>
          <span className="rel-root-type">{mainEntity.type}</span>
        </div>
        {relatedEntities.length > 0 ? (
          <ul className="rel-branches">
            {relatedEntities.map((item) => {
              const displayName = nameById?.[item.id] ?? item.id
              const clickable = typeof onEntityClick === 'function'
              const className = `rel-branch${clickable ? ' is-clickable' : ''}`
              const content = (
                <>
                  <span className="rel-target-name">{displayName}</span>
                  <span className="rel-target-type">{item.type}</span>
                  <span className="rel-edge">{item.relationship}</span>
                </>
              )
              return clickable ? (
                <li
                  key={item.id}
                  className={className}
                  role="button"
                  tabIndex={0}
                  aria-label={`Explore ${displayName}`}
                  onClick={() => onEntityClick!(item.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onEntityClick!(item.id)
                    }
                  }}
                >
                  {content}
                </li>
              ) : (
                <li key={item.id} className="rel-branch">
                  {content}
                </li>
              )
            })}
          </ul>
        ) : (
          <EmptyState message="No connected entities." />
        )}
      </div>
    </div>
  )
}

export default RelationshipView
