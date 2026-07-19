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

function localName(globalId: string): string {
  if (!globalId || !globalId.includes(':')) return globalId
  return globalId.split(':').slice(1).join(':') || globalId
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
      <h3>Continue Exploring</h3>

      {isDeadEnd ? (
        <p className="he-continue-hint">
          No direct threads from here — try a different direction:
        </p>
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
                  aria-label={`Continue to ${localName(gid)}`}
                  onClick={() => onNodeClick?.(gid)}
                >
                  <span className="he-continue-name">{localName(gid)}</span>
                  {seen && (
                    <span className="he-continue-seen" aria-hidden="true">
                      seen
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
            return (
              <li key={`${gid}-${idx}`} className="he-continue-item">
                <button
                  type="button"
                  className={seen ? 'he-continue-node is-seen' : 'he-continue-node'}
                  aria-label={`Continue to ${c.name || localName(gid)}`}
                  onClick={() => onNodeClick?.(gid)}
                >
                  <span className="he-continue-name">{c.name || localName(gid)}</span>
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
          {fallbackTopics.map((t, idx) => (
            <li key={`${t.topic}-${idx}`}>
              <button
                type="button"
                className="he-continue-topic-chip"
                aria-label={`Explore ${formatTopicLabel(t.topic)}`}
                onClick={() => onTopicClick?.(t.topic)}
              >
                {formatTopicLabel(t.topic)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default ContinueExploringPanel
