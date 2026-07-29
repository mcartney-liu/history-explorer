import { RelatedTopic, formatTopicLabel } from './crossTopic'
import { useLocale } from '../data/locale'

type CrossTopicTopicListProps = {
  relatedTopics?: RelatedTopic[]
  // Navigate to a topic (used on both the Explore page and the Entity page).
  onTopicClick: (topic: string) => void
}

// M4-003 (additive): renders the cross-topic "Connected Topics" list from the
// `related_topics` projection. Shown on BOTH the Explore page and the Entity
// page. Returns null when there is no data — no error / empty-state messaging.
function CrossTopicTopicList({ relatedTopics, onTopicClick }: CrossTopicTopicListProps) {
  const { t } = useLocale()
  if (!relatedTopics || relatedTopics.length === 0) {
    return null
  }
  return (
    <div className="result-section">
      <h3>{t('common.connectedTopics')}</h3>
      <ul className="related-list">
        {relatedTopics.map((item) => {
          const label = formatTopicLabel(item.topic)
          return (
            <li
              key={item.topic}
              className="is-clickable"
              role="button"
              tabIndex={0}
              aria-label={t('entity.exploreAria', { name: label })}
              onClick={() => onTopicClick(item.topic)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onTopicClick(item.topic)
                }
              }}
            >
              <span className="re-name">{label}</span>
              <span className="re-type">
                {t('common.crossTopicEdges', { count: String(item.cross_topic_edge_count) })}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default CrossTopicTopicList
