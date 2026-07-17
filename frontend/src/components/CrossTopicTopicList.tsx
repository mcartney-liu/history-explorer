import { RelatedTopic, formatTopicLabel } from './crossTopic'

type CrossTopicTopicListProps = {
  relatedTopics?: RelatedTopic[]
  // Navigate to a topic (used on both the Explore page and the Entity page).
  onTopicClick: (topic: string) => void
}

// M4-003 (additive): renders the cross-topic "Connected Topics" list from the
// `related_topics` projection. Shown on BOTH the Explore page and the Entity
// page. Returns null when there is no data — no error / empty-state messaging.
function CrossTopicTopicList({ relatedTopics, onTopicClick }: CrossTopicTopicListProps) {
  if (!relatedTopics || relatedTopics.length === 0) {
    return null
  }
  return (
    <div className="result-section">
      <h3>Connected Topics</h3>
      <ul className="related-list">
        {relatedTopics.map((item) => (
          <li
            key={item.topic}
            className="is-clickable"
            role="button"
            tabIndex={0}
            aria-label={`Explore ${formatTopicLabel(item.topic)}`}
            onClick={() => onTopicClick(item.topic)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onTopicClick(item.topic)
              }
            }}
          >
            <span className="re-name">{formatTopicLabel(item.topic)}</span>
            <span className="re-type">
              {item.cross_topic_edge_count}{' '}
              {item.cross_topic_edge_count === 1 ? 'cross-topic edge' : 'cross-topic edges'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default CrossTopicTopicList
