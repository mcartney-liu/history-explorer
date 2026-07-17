import {
  CrossTopicRelated,
  formatRelationship,
  formatTopicLabel,
} from './crossTopic'

type CrossTopicConnectionsPanelProps = {
  // Direct cross-topic neighbors of the Explore centered entity. ONLY present
  // on the Explore page (`exploration.cross_topic_related`); the Entity page
  // does not return this field by design.
  connections?: CrossTopicRelated[]
  // Reuse the existing navigation handler with the fully-qualified global_id
  // the backend already supplied — never re-prefix here.
  onEntityClick: (globalId: string) => void
}

// M4-003 (additive): renders each cross-topic neighbor of the centered entity
// as a clickable chip. Distinct data source from `connections_explained`
// (ExplorationEngine ranking) — this panel consumes pure GlobalGraph
// projections only. Returns null when there is no data (no placeholder text).
function CrossTopicConnectionsPanel({
  connections,
  onEntityClick,
}: CrossTopicConnectionsPanelProps) {
  if (!connections || connections.length === 0) {
    return null
  }
  return (
    <div className="result-section">
      <h3>Cross-Topic Connections</h3>
      <ul className="related-list">
        {connections
          .filter(
            (item): item is CrossTopicRelated & { global_id: string } =>
              Boolean(item.global_id),
          )
          .map((item) => (
            <li
              key={item.global_id}
              className="is-clickable"
              role="button"
              tabIndex={0}
              aria-label={`Open ${item.name ?? item.global_id}`}
              onClick={() => onEntityClick(item.global_id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onEntityClick(item.global_id)
                }
              }}
            >
              <span className="re-name">{item.name ?? item.id ?? 'Unknown'}</span>
              <span className="re-type">{item.type ?? 'entity'}</span>
              <span className="re-rel">
                {formatTopicLabel(item.topic ?? '')} ·{' '}
                {formatRelationship(item.relationship)}
              </span>
            </li>
          ))}
      </ul>
    </div>
  )
}

export default CrossTopicConnectionsPanel
