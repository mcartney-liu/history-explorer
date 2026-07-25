// M16 (Relationship Insight Visualization Layer): presentation-only panel.
//
// SCOPE (frozen): this component is a PURE VIEW over data that already exists
// in the client. It holds NO AI state, performs NO fetch (it never loads
// /entity/{id} or any other endpoint), introduces NO causal inference, and
// invents NO edges or KG semantics.
//
// Data flow (per M16 corrections):
//   selectedCandidates -> relationshipUtils pure functions -> this panel.
//
// The only local "state" is the native <details> open/closed toggle, which is
// browser-managed and requires no React state. Everything rendered is derived
// deterministically from props.

import type { Candidate } from '../data/candidateUtils'
import type { EntityRelationship } from './EntityPage'
import type { GeoPoint } from '../data/relationshipUtils'
import {
  pairEntities,
  findExistingRelationships,
  timelineOverlap,
  geoComparison,
  type TimelineOverlapStatus,
} from '../data/relationshipUtils'

export type RelationshipInsightPanelProps = {
  candidates: Candidate[]
  relationships: EntityRelationship[]
  timeMap: Record<string, string>
  geoMap?: Record<string, GeoPoint>
  /** global_id of the current exploration's main entity (relationship source). */
  mainGlobalId?: string
}

const STATUS_LABEL: Record<TimelineOverlapStatus, string> = {
  overlap: '时间重叠',
  gap: '时间无重叠',
  partial: '时间数据不足',
  unknown: '无时间数据',
}

function RelationshipPairRow({
  a,
  b,
  relationships,
  timeMap,
  geoMap,
  mainGlobalId,
}: {
  a: Candidate
  b: Candidate
  relationships: EntityRelationship[]
  timeMap: Record<string, string>
  geoMap?: Record<string, GeoPoint>
  mainGlobalId?: string
}) {
  const pair: [Candidate, Candidate] = [a, b]
  const rels = findExistingRelationships(pair, relationships, mainGlobalId)
  const overlap = timelineOverlap(pair, timeMap)
  const geo = geoComparison(pair, geoMap)

  return (
    <details className="rip-pair" open>
      <summary className="rip-pair-summary">
        {a.name} ↔ {b.name}
      </summary>

      <section className="rip-section rip-relationships" aria-label="existing-relationships">
        <h5 className="rip-section-title">既有关系元数据</h5>
        {rels.length === 0 ? (
          <p className="rip-muted">无既有关系元数据（仅展示已存在的关系，不做推断）。</p>
        ) : (
          <ul className="rip-rel-list">
            {rels.map((rel, idx) => (
              <li className="rip-rel-card" key={`${rel.type}-${rel.other.global_id}-${idx}`}>
                <span className="rip-rel-type">{rel.type}</span>
                <span className="rip-rel-label">
                  {a.name} 与 {b.name}：关系类型「{rel.type}」
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rip-section rip-timeline" aria-label="timeline-overlap">
        <h5 className="rip-section-title">时间线对比</h5>
        <span className={`rip-status rip-status-${overlap.status}`}>
          {STATUS_LABEL[overlap.status]}
        </span>
        <p className="rip-note">{overlap.note}</p>
      </section>

      <section className="rip-section rip-geo" aria-label="geographic-comparison">
        <h5 className="rip-section-title">地理对比</h5>
        <p className="rip-note">{geo.note}</p>
      </section>
    </details>
  )
}

export default function RelationshipInsightPanel({
  candidates,
  relationships,
  timeMap,
  geoMap,
  mainGlobalId,
}: RelationshipInsightPanelProps) {
  const pairs = pairEntities(candidates)

  return (
    <div className="relationship-insight-panel" data-testid="relationship-insight-panel">
      <h4 className="rip-title">关系洞察（可视化既有元数据）</h4>
      {pairs.length === 0 ? (
        <p className="rip-muted">请选择至少两个实体以查看关系洞察。</p>
      ) : (
        <div className="rip-pairs">
          {pairs.map(([a, b]) => (
            <RelationshipPairRow
              key={`${a.gid}|${b.gid}`}
              a={a}
              b={b}
              relationships={relationships}
              timeMap={timeMap}
              geoMap={geoMap}
              mainGlobalId={mainGlobalId}
            />
          ))}
        </div>
      )}
    </div>
  )
}
