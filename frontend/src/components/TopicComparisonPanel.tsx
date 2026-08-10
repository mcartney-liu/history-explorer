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
//
// P5-S4 rethought: the PRIMARY view is now the bridge (shared-thread) pattern
// instead of a Venn diagram. The Venn's overlap region was too small to
// communicate anything; the bridge view states plainly "current topic — N
// shared bridging entities — target topic" and lists each bridge as a clickable
// pill connected to both sides (the "mutual connections" metaphor). A 图/列表
// toggle keeps the original list as fallback.

function ComparisonBridge({
  currentLabel,
  targetLabel,
  bridges,
  onNodeClick,
}: {
  currentLabel: string
  targetLabel: string
  bridges: CrossTopicRelated[]
  onNodeClick: (globalId: string) => void
}) {
  return (
    <div className="comparison-bridge">
      <div className="cb-head">
        <span className="cb-topic cb-topic--left">{currentLabel}</span>
        <span className="cb-link" aria-hidden="true" />
        <span className="cb-count">{bridges.length} 个共享桥接实体</span>
        <span className="cb-link" aria-hidden="true" />
        <span className="cb-topic cb-topic--right">{targetLabel}</span>
      </div>
      {bridges.length === 0 ? (
        <p className="he-comparison-empty">与 {targetLabel} 无桥接实体。</p>
      ) : (
        <ul className="cb-bridges">
          {bridges.map((b, i) => {
            const gid = b.global_id ?? ''
            const label = b.name ?? gid
            return (
              <li className="cb-row" key={b.id ?? gid ?? i}>
                <span className="cb-end cb-end--left" title={currentLabel} aria-hidden="true" />
                <button
                  type="button"
                  className="cb-bridge"
                  data-node={gid}
                  aria-label={`打开 ${label}`}
                  onClick={() => gid && onNodeClick(gid)}
                >
                  {label}
                </button>
                <span className="cb-end cb-end--right" title={targetLabel} aria-hidden="true" />
                {b.relationship && (
                  <span className="cb-rel">{formatRelationship(b.relationship)}</span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default function TopicComparisonPanel({
  crossTopicRelated,
  onNodeClick,
  onTopicClick,
}: TopicComparisonPanelProps) {
  const targets = pickComparisonTargets(crossTopicRelated)
  const [selected, setSelected] = useState<string | null>(null)
  const [view, setView] = useState<'bridge' | 'list'>('bridge')

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
        aria-label="跨主题对比"
      >
        <h2 className="he-comparison-title">跨主题对比</h2>
        <p className="he-comparison-empty">
          该主题暂无跨主题关联。
        </p>
      </section>
    )
  }

  const bridges = deriveBridgedEntities(crossTopicRelated, activeTarget)
  const currentLabel = '当前主题'

  return (
    <section
      className="he-comparison"
      data-panel="topic-comparison"
      aria-label="跨主题对比"
    >
      <div className="result-section-head">
        <h2 className="he-comparison-title">与…对比</h2>
        <div className="viz-toggle" role="group" aria-label="对比视图切换">
          <button type="button" className={view === 'bridge' ? 'active' : ''} aria-pressed={view === 'bridge'} onClick={() => setView('bridge')}>图</button>
          <button type="button" className={view === 'list' ? 'active' : ''} aria-pressed={view === 'list'} onClick={() => setView('list')}>列表</button>
        </div>
      </div>

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

      {view === 'bridge' ? (
        <ComparisonBridge
          currentLabel={currentLabel}
          targetLabel={formatTopicLabel(activeTarget ?? '')}
          bridges={bridges}
          onNodeClick={onNodeClick}
        />
      ) : (
        activeTarget && (
          <div className="he-comparison-body">
            <div className="he-comparison-actions">
              <button
                type="button"
                className="he-comparison-explore"
                data-node={`explore:${activeTarget}`}
                onClick={() => onTopicClick(activeTarget)}
              >
                探索 {formatTopicLabel(activeTarget)}
              </button>
            </div>

            <h3 className="he-comparison-subtitle">
              桥接实体（{bridges.length}）
            </h3>
            {bridges.length === 0 ? (
              <p className="he-comparison-empty">
                与 {formatTopicLabel(activeTarget)} 无桥接实体。
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
                        aria-label={`在 ${formatTopicLabel(ownerTopic)} 中打开 ${b.name ?? gid}`}
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
        )
      )}
    </section>
  )
}
