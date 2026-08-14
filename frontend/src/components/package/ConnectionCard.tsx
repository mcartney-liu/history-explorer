import { useState } from 'react'
import { useLocale } from '../../data/locale'
import {
  getPackageBySlug,
  getEntityDisplayName,
  getEvidenceWithSources,
} from '../../data/explorationPackages'
import { takePackageOrigin, setPackageOrigin } from './packageOrigin'
import { buildStations } from './JourneyRail'
import CollapsibleList from '../ui/CollapsibleList'
import { relLabel } from '../../data/relationshipLabels'
import { describeTransition } from '../../data/transition'
import { getEntityNeighbors } from '../../runtime/entityCache'

interface ConnectionCardProps {
  /** global id of the entity currently shown on the page (may be absent). */
  entityGlobalId: string | undefined
  /** display name of the entity currently shown on the page. */
  entityName: string
  /** jump to a sibling station in the same package journey (carries origin forward). */
  onEntityClick?: (gid: string) => void
  /** return to the originating exploration package page (full JourneyRail). */
  onOpenPackage?: (slug: string) => void
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
  onOpenPackage,
}: ConnectionCardProps) {
  // 一次性消费来源包：仅当暂存的实体与当前实体匹配时才显示，避免跨站串卡。
  const { t } = useLocale()
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

  // 站间衔接 (Transition Function v1+v2, 2026-08-15 PO 课题)：行程区一行
  // 「衔接叙述」，回答"为什么从上一站来到这一站"。过渡逻辑统一走
  // describeTransition（共享核心能力）：①中文 claim 叙述 ②关系短句
  // ③v2 共同邻居路径桥（无直接边但有共同邻居）④无边 → 不渲染（留白）。
  // 数据零新增。
  const edgeBetween = (a: string, b: string) =>
    pkg.relationship_paths.find(
      (r) => (r.from === a && r.to === b) || (r.from === b && r.to === a),
    ) ?? null
  const prevEdge = prev ? edgeBetween(prev.gid, entityGlobalId) : null
  // v2 多跳路径桥：无直接边时找共同邻居（上一站缓存邻居 ∩ 本站包内邻居）。
  const prevCommon = prev && !prevEdge
    ? (() => {
        const aN = getEntityNeighbors(prev.gid) ?? []
        const bGids = new Set(
          pkg.relationship_paths
            .filter((p) => p.from === entityGlobalId || p.to === entityGlobalId)
            .map((p) => (p.from === entityGlobalId ? p.to : p.from)),
        )
        return aN.find((n) => bGids.has(n.gid)) ?? null
      })()
    : null
  const prevTransition = prev
    ? describeTransition(prev.name, entityName, prevEdge
        ? { type: prevEdge.type, evidence: prevEdge.evidence }
        : null, prevCommon)
    : null

  return (
    <aside className="connection-card" aria-label="你为什么在这里">
      <div className="connection-card-head">
        <span className="connection-card-kicker">来自探索包</span>
        <h2 className="connection-card-title">{pkgTitle}</h2>
      </div>
      <p className="connection-card-goal">{pkgGoal}</p>

      {idx >= 0 && (
        <div className="connection-card-journey">
          <div className="connection-card-journey-head">
            <span className="connection-card-position">
              探索行程 · 第 {idx + 1} / {stations.length} 站
            </span>
            {onOpenPackage && (
              <button
                type="button"
                className="connection-card-return"
                onClick={() => onOpenPackage(originSlug)}
              >
                查看完整行程 →
              </button>
            )}
          </div>
          {prevTransition?.text && prev && (
            <div className="connection-card-transition">
              <span className="connection-card-transition-kicker">
                从上一站「{prev.name}」来
              </span>
              <p className="connection-card-transition-text">
                {prevTransition.text}
                {prevTransition.confidence && (
                  <span className={`transition-confidence transition-confidence--${prevTransition.confidence}`}>
                    {t(`transition.confidence_${prevTransition.confidence}`)}
                  </span>
                )}
              </p>
            </div>
          )}
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
        <CollapsibleList className="connection-card-rels" visible={3}>
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
        </CollapsibleList>
      )}

      {evidence.length > 0 && (
        <div className="connection-card-evidence">
          <span className="connection-card-evidence-label">依据</span>
          <CollapsibleList visible={2}>
            {evidence.map((e) => (
              <p key={e.claimId} className="connection-card-evidence-text">
                {e.claim}
              </p>
            ))}
          </CollapsibleList>
        </div>
      )}
    </aside>
  )
}
