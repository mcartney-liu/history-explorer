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
}

function RelatedEntityList({
  relatedEntities,
  nameById,
  mainEntityName,
}: RelatedEntityListProps) {
  return (
    <div className="result-section">
      <h3>Related Exploration</h3>
      {relatedEntities.length > 0 ? (
        <ul className="related-list">
          {relatedEntities.map((item) => (
            <li key={item.id}>
              <span className="re-name">{nameById?.[item.id] ?? item.id}</span>
              <span className="re-type">{item.type}</span>
              <span className="re-rel">
                {mainEntityName
                  ? `Connected via ${item.relationship}`
                  : item.relationship}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="empty">No related entities.</p>
      )}
    </div>
  )
}

export default RelatedEntityList
