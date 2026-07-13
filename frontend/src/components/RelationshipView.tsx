import { MainEntity } from './MainEntityCard'
import { RelatedEntity } from './RelatedEntityList'

type RelationshipViewProps = {
  mainEntity: MainEntity
  relatedEntities: RelatedEntity[]
  // Optional id -> display name lookup, sourced from the response `entities`.
  // Falls back to the raw id when a name is unavailable.
  nameById?: Record<string, string>
}

// Lightweight relationship visualization prototype (S5-003).
// Pure CSS tree: current main entity at the root, connected entities branching
// below it. No graph engine, SVG, D3, canvas, or animation library.
function RelationshipView({
  mainEntity,
  relatedEntities,
  nameById,
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
            {relatedEntities.map((item) => (
              <li key={item.id} className="rel-branch">
                <span className="rel-target-name">
                  {nameById?.[item.id] ?? item.id}
                </span>
                <span className="rel-target-type">{item.type}</span>
                <span className="rel-edge">{item.relationship}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty">No connected entities.</p>
        )}
      </div>
    </div>
  )
}

export default RelationshipView
