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
  aggregateRelationshipTypes,
  buildRelationshipTypeMatrix,
  buildMultiEntityTimelineBand,
  type TimelineOverlapStatus,
} from '../data/relationshipUtils'

export type RelationshipInsightPanelProps = {
  candidates: Candidate[]
  relationships: EntityRelationship[]
  timeMap: Record<string, string>
  geoMap?: Record<string, GeoPoint>
  /** global_id of the current exploration's main entity (relationship source). */
  mainGlobalId?: string
  /** Friendly display name of the main entity; used only to label matrix source rows. */
  mainEntityName?: string
}

const STATUS_LABEL: Record<TimelineOverlapStatus, string> = {
  overlap: '时间重叠',
  gap: '时间无重叠',
  partial: '时间数据不足',
  unknown: '无时间数据',
}

// Local display helper (negative = BCE, positive = CE). Mirrors relationshipUtils.fmtYear.
function formatYear(v: number): string {
  const n = Math.round(v)
  return n < 0 ? `${Math.abs(n)} BC` : `${n} CE`
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
  mainEntityName,
}: RelationshipInsightPanelProps) {
  const pairs = pairEntities(candidates)

  // M17 analytics: pure summaries of EXISTING metadata only (no inference).
  const nameByGlobalId: Record<string, string> = {}
  for (const c of candidates ?? []) {
    if (c?.gid) nameByGlobalId[c.gid] = c.name
  }
  const typeCounts = aggregateRelationshipTypes(relationships)
  const matrixRows = buildRelationshipTypeMatrix(relationships, {
    mainGlobalId,
    sourceName: mainEntityName,
    nameByGlobalId,
  })
  const timelineBand = buildMultiEntityTimelineBand(candidates, timeMap)

  return (
    <div className="relationship-insight-panel" data-testid="relationship-insight-panel">
      <h4 className="rip-title">关系洞察（可视化既有元数据）</h4>

      {/* M17 — Relationship Type Summary (count only, no causal explanation). */}
      <details className="rip-block" open>
        <summary className="rip-block-summary">关系类型汇总</summary>
        {relationships.length === 0 ? (
          <p className="rip-muted">无既有关系元数据。</p>
        ) : (
          <ul className="rip-type-summary">
            {Object.entries(typeCounts).map(([type, count]) => (
              <li key={type} className="rip-type-summary-row">
                <span className="rip-type">{type}</span>
                <span className="rip-count">{count}</span>
              </li>
            ))}
          </ul>
        )}
      </details>

      {/* M17 — Relationship Type Matrix (source → type → target, no narrative). */}
      <details className="rip-block">
        <summary className="rip-block-summary">关系类型矩阵</summary>
        {matrixRows.length === 0 ? (
          <p className="rip-muted">无既有关系元数据。</p>
        ) : (
          <table className="rip-matrix">
            <thead>
              <tr>
                <th>源实体</th>
                <th>关系类型</th>
                <th>目标实体</th>
              </tr>
            </thead>
            <tbody>
              {matrixRows.map((row, i) => (
                <tr key={`${row.source}-${row.relationType}-${row.target}-${i}`}>
                  <td>{row.source}</td>
                  <td className="rip-type">{row.relationType}</td>
                  <td>{row.target}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </details>

      {/* M17 — Multi Entity Timeline Band (bounds + overlap only, no history). */}
      <details className="rip-block">
        <summary className="rip-block-summary">多实体时间线带</summary>
        {timelineBand.length === 0 ? (
          <p className="rip-muted">请选择实体以查看时间线带。</p>
        ) : (
          <ul className="rip-timeline-band">
            {timelineBand.map((e) => (
              <li key={e.gid ?? e.name} className="rip-band-row">
                <span className="rip-band-name">{e.name}</span>
                <span className="rip-band-range">
                  {e.start != null && e.end != null
                    ? `${formatYear(e.start)} – ${formatYear(e.end)}`
                    : '无时间数据'}
                </span>
                {e.overlaps.length > 0 && (
                  <span className="rip-band-overlap">时间重叠：{e.overlaps.join('、')}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </details>

      {pairs.length === 0 ? (
        <p className="rip-muted">请选择至少两个实体以查看逐对关系洞察。</p>
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
