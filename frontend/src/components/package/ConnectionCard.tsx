import { useState } from 'react'
import {
  getPackageBySlug,
  getEntityDisplayName,
  getEvidenceWithSources,
} from '../../data/explorationPackages'
import { takePackageOrigin, setPackageOrigin } from './packageOrigin'
import { buildStations } from './JourneyRail'

interface ConnectionCardProps {
  /** global id of the entity currently shown on the page (may be absent). */
  entityGlobalId: string | undefined
  /** display name of the entity currently shown on the page. */
  entityName: string
  /** jump to a sibling station in the same package journey (carries origin forward). */
  onEntityClick?: (gid: string) => void
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
//
// 探索剧本化 续（治 D2/D3 后半段"断线"）：实体页也要能看见"探索行程"的连续性——
// 显示本实体在包行程中的第几站，并提供上一站/下一站跳转。行程排序复用
// JourneyRail.buildStations（同一份策划好的里程），跳转时把来源包顺延给下一站，
// 让 banner 在包内前后跳时不丢。不破红线、不新增字段、不重新进入包上下文。
export default function ConnectionCard({
  entityGlobalId,
  entityName,
  onEntityClick,
}: ConnectionCardProps) {
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

  // 探索剧本化 续：本实体在包行程中的位置（同一份 buildStations 里程）。
  const stations = buildStations(pkg)
  const idx = stations.findIndex((s) => s.gid === entityGlobalId)
  const prev = idx > 0 ? stations[idx - 1] : null
  const next = idx >= 0 && idx < stations.length - 1 ? stations[idx + 1] : null
  // 跳转同包下一站：先把来源包顺延给目标实体，再走既有 onEntityClick → openEntity。
  // 单一来源、零新状态，banner 在包内前后跳时不丢。
  const jump = (gid: string) => {
    if (!originSlug) return
    setPackageOrigin(originSlug, gid)
    onEntityClick?.(gid)
  }

  return (
    <aside className="connection-card" aria-label="你为什么在这里">
      <div className="connection-card-head">
        <span className="connection-card-kicker">来自探索包</span>
        <h2 className="connection-card-title">{pkgTitle}</h2>
      </div>
      <p className="connection-card-goal">{pkgGoal}</p>

      {idx >= 0 && (
        <div className="connection-card-journey">
          <span className="connection-card-position">
            探索行程 · 第 {idx + 1} / {stations.length} 站
          </span>
          <div className="connection-card-nav">
            {prev ? (
              <button type="button" className="connection-card-nav-btn" onClick={() => jump(prev.gid)}>
                <span className="connection-card-nav-dir">← 上一站</span>
                <span className="connection-card-nav-name">{prev.name}</span>
              </button>
            ) : (
              <span className="connection-card-nav-btn is-disabled" aria-disabled="true">
                ← 上一站
              </span>
            )}
            {next ? (
              <button type="button" className="connection-card-nav-btn" onClick={() => jump(next.gid)}>
                <span className="connection-card-nav-dir">下一站 →</span>
                <span className="connection-card-nav-name">{next.name}</span>
              </button>
            ) : (
              <span className="connection-card-nav-btn is-disabled" aria-disabled="true">
                下一站 →
              </span>
            )}
          </div>
        </div>
      )}

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
