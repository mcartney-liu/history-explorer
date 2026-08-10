// M5-B-1: "Continue Exploring" — the Stage 5 (Continuous Discovery) next-step
// action zone. After a user has explored a topic or entity, this panel surfaces
// the engine's ALREADY-RANKED `connections_explained` as concrete "go here
// next" actions, each carrying the engine's own explanation (the "why"). Nodes
// the user has already visited are visually weakened with a "seen" marker — but
// the order is NEVER changed. We do not re-rank or score anything here: that
// would be a recommender, which is out of scope (freeze red line). This is set
// awareness (already-visited vs not) layered over the engine's own ordering.
//
// When direct explained connections are sparse (a dead-end), it falls back to
// cross-topic related entities and related topics, so exploration never truly
// dead-ends (B-3). Strictly additive & pure presentational: renders nothing
// when there is nothing to show, and App owns all state + navigation (the
// single navigateTo path, via onNodeClick / onTopicClick).

import { ConnectionExplained } from './ConnectionsExplainedPanel'
import { CrossTopicRelated, RelatedTopic, formatTopicLabel } from './crossTopic'
import { useLocale } from '../data/locale'
import { usePreferences, getDisplayName } from '../lib/preferences'
import { getEntityDisplayName } from '../data/explorationPackages'

// M73-A P0-1: removed localName() (string-slicing exposed internal IDs like
// "civ-romanciv-roman").  Replaced with getEntityDisplayName() which resolves
// labels[locale] → name → fallback — same fix as ConnectionsExplainedPanel.

const DEFAULT_MAX = 5

type ContinueExploringPanelProps = {
  connections?: ConnectionExplained[]
  crossTopicRelated?: CrossTopicRelated[]
  relatedTopics?: RelatedTopic[]
  // Global ids the user has already visited (derived from recent explorations).
  // Used only to add a "seen" marker — never to reorder.
  seenGlobalIds?: Set<string>
  max?: number
  onNodeClick?: (globalId: string) => void
  onTopicClick?: (topic: string) => void
}

function ContinueExploringPanel({
  connections,
  crossTopicRelated,
  relatedTopics,
  seenGlobalIds,
  max = DEFAULT_MAX,
  onNodeClick,
  onTopicClick,
}: ContinueExploringPanelProps) {
  const { t, locale } = useLocale()
  const [prefs] = usePreferences()
  // Engine-ranked next steps, consumed AS-IS (no re-rank). We only take the
  // top-N and mark already-seen nodes; the order is the engine's.
  const primary = (connections ?? [])
    .filter((c) => typeof c.global_id === 'string' && c.global_id)
    .slice(0, max)

  // B-3 dead-end fallback: only used when there are no direct explained
  // connections. Cross-topic entities first (concrete nodes), then topics.
  const fallbackEntities =
    primary.length === 0
      ? (crossTopicRelated ?? []).filter((c) => Boolean(c.global_id)).slice(0, max)
      : []
  const fallbackTopics =
    primary.length === 0 ? (relatedTopics ?? []).slice(0, max) : []

  if (
    primary.length === 0 &&
    fallbackEntities.length === 0 &&
    fallbackTopics.length === 0
  ) {
    return null
  }

  const isDeadEnd = primary.length === 0

  return (
    <div className="result-section he-continue">
      <h3>{t('discover.continueHeading')}</h3>

      {isDeadEnd ? (
        <p className="he-continue-hint">{t('discover.continueDeadEndHint')}</p>
      ) : null}

      {primary.length > 0 && (
        <ul className="he-continue-list">
          {primary.map((item, idx) => {
            const gid = item.global_id
            const seen = seenGlobalIds?.has(gid) ?? false
            return (
              <li key={`${gid}-${idx}`} className="he-continue-item">
                <button
                  type="button"
                  className={seen ? 'he-continue-node is-seen' : 'he-continue-node'}
                  aria-label={t('discover.continueToAria', { name: getEntityDisplayName(gid, locale as 'zh' | 'en' | 'ja') })}
                  onClick={() => onNodeClick?.(gid)}
                >
                  <span className="he-continue-name">{getEntityDisplayName(gid, locale as 'zh' | 'en' | 'ja')}</span>
                  {seen && (
                    <span className="he-continue-seen" aria-hidden="true">
                      {t('discover.continueSeen')}
                    </span>
                  )}
                </button>
                {item.explanation ? (
                  <p className="he-continue-why">{item.explanation}</p>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}

      {isDeadEnd && fallbackEntities.length > 0 && (
        <ul className="he-continue-list">
          {fallbackEntities.map((c, idx) => {
            const gid = c.global_id as string
            const seen = seenGlobalIds?.has(gid) ?? false
            const name = c.name || getEntityDisplayName(gid, locale as 'zh' | 'en' | 'ja')
            return (
              <li key={`${gid}-${idx}`} className="he-continue-item">
                <button
                  type="button"
                  className={seen ? 'he-continue-node is-seen' : 'he-continue-node'}
                  aria-label={t('discover.continueToAria', {
                    name: getDisplayName(name, locale, prefs.properNameMode),
                  })}
                  onClick={() => onNodeClick?.(gid)}
                >
                  <span className="he-continue-name">
                    {getDisplayName(name, locale, prefs.properNameMode)}
                  </span>
                  {c.topic && (
                    <span className="he-continue-topic">{formatTopicLabel(c.topic)}</span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {isDeadEnd && fallbackTopics.length > 0 && (
        <ul className="he-continue-topics">
          {fallbackTopics.map((tt, idx) => (
            <li key={`${tt.topic}-${idx}`}>
              <button
                type="button"
                className="he-continue-topic-chip"
                aria-label={t('discover.exploreTopicAria', {
                  title: formatTopicLabel(tt.topic),
                })}
                onClick={() => onTopicClick?.(tt.topic)}
              >
                {formatTopicLabel(tt.topic)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default ContinueExploringPanel
