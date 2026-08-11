import { useState } from 'react'
import {
  CrossTopicRelated,
  formatTopicLabel,
  formatRelationship,
} from './crossTopic'
import {
  pickComparisonTargets,
  deriveBridgedEntities,
  extractTopicFromGlobalId,
} from '../data/comparison'

type TopicComparisonPanelProps = {
  crossTopicRelated: CrossTopicRelated[] | undefined
  onNodeClick: (globalId: string) => void
  onTopicClick: (topic: string) => void
}

// C-1 (Cross-Topic Comparison Panel) + C-3 (bridge navigation continuity).
//
// Renders a structured "compare A with B" view purely from the current
// topic's existing `cross_topic_related` payload — NO extra fetch, NO second
// navigation mechanism. Clicking a bridging entity calls `onNodeClick`
// (wired to `openEntity`, the single navigation entry). The "Explore" action
// calls `onTopicClick` (wired to `navigateTo`), keeping the user in the
// existing continuous-discovery loop.
export default function TopicComparisonPanel({
  crossTopicRelated,
  onNodeClick,
  onTopicClick,
}: TopicComparisonPanelProps) {
  const targets = pickComparisonTargets(crossTopicRelated)
  const [selected, setSelected] = useState<string | null>(null)

  // Keep the active target valid: fall back to the first target when the
  // user has not chosen, or when the chosen one no longer exists for this
  // topic. Effect-free; no ranking / recommendation applied.
  const activeTarget =
    selected && targets.includes(selected)
      ? selected
      : targets.length > 0
        ? targets[0]
        : null

  if (targets.length === 0) {
    return (
      <section
        className="he-comparison"
        data-panel="topic-comparison"
        aria-label="Cross-topic comparison"
      >
        <h2 className="he-comparison-title">Compare Across Topics</h2>
        <p className="he-comparison-empty">
          This topic has no cross-topic connections yet.
        </p>
      </section>
    )
  }

  const bridges = deriveBridgedEntities(crossTopicRelated, activeTarget)

  return (
    <section
      className="he-comparison"
      data-panel="topic-comparison"
      aria-label="Cross-topic comparison"
    >
      <h2 className="he-comparison-title">Compare With</h2>

      <div className="he-comparison-targets" role="group" aria-label="Comparison targets">
        {targets.map((t) => (
          <button
            key={t}
            type="button"
            className={`he-comparison-target${t === activeTarget ? ' is-active' : ''}`}
            data-node={t}
            aria-pressed={t === activeTarget}
            onClick={() => setSelected(t)}
          >
            {formatTopicLabel(t)}
          </button>
        ))}
      </div>

      {activeTarget && (
        <div className="he-comparison-body">
          <div className="he-comparison-actions">
            <button
              type="button"
              className="he-comparison-explore"
              data-node={`explore:${activeTarget}`}
              onClick={() => onTopicClick(activeTarget)}
            >
              Explore {formatTopicLabel(activeTarget)}
            </button>
          </div>

          <h3 className="he-comparison-subtitle">
            Bridging entities ({bridges.length})
          </h3>
          {bridges.length === 0 ? (
            <p className="he-comparison-empty">
              No bridging entities with {formatTopicLabel(activeTarget)}.
            </p>
          ) : (
            <ul className="he-comparison-bridges">
              {bridges.map((b, i) => {
                const gid = b.global_id ?? ''
                const ownerTopic = extractTopicFromGlobalId(gid) ?? activeTarget
                return (
                  <li key={b.id ?? gid ?? i} className="he-comparison-bridge-item">
                    <button
                      type="button"
                      className="he-comparison-bridge"
                      data-node={gid}
                      aria-label={`Open ${b.name ?? gid} in ${formatTopicLabel(ownerTopic)}`}
                      onClick={() => gid && onNodeClick(gid)}
                    >
                      {b.name ?? gid}
                    </button>
                    {b.relationship && (
                      <span className="he-comparison-rel">
                        {formatRelationship(b.relationship)}
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}
