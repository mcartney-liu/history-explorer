export type RelatedEntity = {
  id: string
  type: string
  relationship: string
}

type RelatedEntityListProps = {
  relatedEntities: RelatedEntity[]
}

function RelatedEntityList({ relatedEntities }: RelatedEntityListProps) {
  return (
    <div className="result-section">
      <h3>Related Entities</h3>
      {relatedEntities.length > 0 ? (
        <ul className="related-list">
          {relatedEntities.map((item) => (
            <li key={item.id}>
              <span className="re-name">{item.id}</span>
              <span className="re-type">{item.type}</span>
              <span className="re-rel">{item.relationship}</span>
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
