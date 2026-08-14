import { useState } from 'react'
import {
  getPackageBySlug,
  getEntityDisplayName,
  getEvidenceWithSources,
} from '../../data/explorationPackages'
import { takePackageOrigin } from './packageOrigin'

interface ConnectionCardProps {
  /** global id of the entity currently shown on the page (may be absent). */
  entityGlobalId: string | undefined
  /** display name of the entity currently shown on the page. */
  entityName: string
}

// Frozen relationship-type enum → Chinese label. Falls back to the raw token
// (via formatRelationship-style prettify) for any type not listed here, so the
// UI never shows a bare snake_case token and never invents a meaning.
const REL_LABELS: Record<string, string> = {
  before: '早于',
  after: '晚于',
  caused: '导致',
  resulted_in: '促成',
  participated_in: '参与',
  related_to: '关联于',
  practiced: '信奉',
  influenced: '影响',
  influenced_by: '受……影响',
  inherited: '继承',
  traded_with: '贸易往来',
  ruled: '统治',
  founded: '创立',
  succeeded: '继任',
  part_of: '属于',
  located_in: '位于',
  born_in: '生于',
  died_in: '卒于',
  wrote: '著述',
  spread_to: '传播至',
}

function relLabel(type: string): string {
  return REL_LABELS[type] ?? type.replace(/_/g, ' ')
}

// 探索剧本化 ③（治 D3）：实体页顶部"你为什么在这里"——
// 回答"这一站跟我进来的探索包有啥关系"。纯前端编排现有包数据
// （relationship_paths + evidence），图 grounded、零编造、零新字段。
export default function ConnectionCard({ entityGlobalId, entityName }: ConnectionCardProps) {
  // 一次性消费来源包：仅当暂存的实体与当前实体匹配时才显示，避免跨站串卡。
  const [originSlug] = useState(() => takePackageOrigin(entityGlobalId))
  if (!originSlug || !entityGlobalId) return null

  const pkg = getPackageBySlug(originSlug)
  if (!pkg) return null

  const pkgTitle = pkg.title.zh
  const pkgGoal = pkg.exploration_goals.zh

  const inTimeline = pkg.timeline_slices.some((s) => s.entity === entityGlobalId)
  const rels = pkg.relationship_paths.filter(
    (p) => p.from === entityGlobalId || p.to === entityGlobalId,
  )

  // 收集把本实体"锚"在包里的证据叙述（真实 claim 文本，非生成）。
  const evidenceIds = Array.from(new Set(rels.flatMap((r) => r.evidence ?? [])))
  const evidence = getEvidenceWithSources(evidenceIds).filter((e) => e.claim)

  return (
    <aside className="connection-card" aria-label="你为什么在这里">
      <div className="connection-card-head">
        <span className="connection-card-kicker">来自探索包</span>
        <h2 className="connection-card-title">{pkgTitle}</h2>
      </div>
      <p className="connection-card-goal">{pkgGoal}</p>

      <div className="connection-card-role">
        <span className="connection-card-dot" aria-hidden="true" />
        <span>
          这一站 <strong>{entityName}</strong>
          {inTimeline ? ' 是这条时间旅程上的一个节点' : ' 在这条探索线里'}
          {rels.length > 0 ? '，通过下面的关系串进整段旅程：' : '。'}
        </span>
      </div>

      {rels.length > 0 && (
        <ul className="connection-card-rels">
          {rels.map((r, i) => {
            const isFrom = r.from === entityGlobalId
            const other = isFrom ? r.to : r.from
            return (
              <li
                key={`${r.from}-${r.to}-${r.type}-${i}`}
                className="connection-card-rel"
              >
                <span className="connection-card-rel-type">{relLabel(r.type)}</span>
                <span className="connection-card-rel-text">
                  {isFrom
                    ? `${entityName} → ${getEntityDisplayName(other)}`
                    : `${getEntityDisplayName(other)} → ${entityName}`}
                </span>
              </li>
            )
          })}
        </ul>
      )}

      {evidence.length > 0 && (
        <div className="connection-card-evidence">
          <span className="connection-card-evidence-label">依据</span>
          {evidence.slice(0, 2).map((e) => (
            <p key={e.claimId} className="connection-card-evidence-text">
              {e.claim}
            </p>
          ))}
        </div>
      )}
    </aside>
  )
}
