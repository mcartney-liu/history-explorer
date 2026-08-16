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
import { collectRelationEvidence } from '../../data/continuityEngine'
import {
  buildExplanationCandidates,
  selectBestExplanation,
  expressHonestNone,
} from '../../data/continuityExplanation'
import { getEntityNeighbors } from '../../runtime/entityCache'
import { takeOriginEntity } from '../../runtime/originEntity'
import type { EntityRelationship } from '../EntityPage'

interface ConnectionCardProps {
  /** global id of the entity currently shown on the page (may be absent). */
  entityGlobalId: string | undefined
  /** display name of the entity currently shown on the page. */
  entityName: string
  /** jump to a sibling station in the same package journey (carries origin forward). */
  onEntityClick?: (gid: string) => void
  /** return to the originating exploration package page (full JourneyRail). */
  onOpenPackage?: (slug: string) => void
  /** 实体直接来源（A→B 跳入）：只读，用于"从哪里来"区（无包上下文时整卡形态）。 */
  relationships?: EntityRelationship[]
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
  relationships,
}: ConnectionCardProps) {
  // 一次性消费来源包：仅当暂存的实体与当前实体匹配时才显示，避免跨站串卡。
  const { t } = useLocale()
  const [originSlug] = useState(() => takePackageOrigin(entityGlobalId))
  const [originGid] = useState(() => takeOriginEntity(entityGlobalId))
  if (!entityGlobalId) return null
  const pkg = originSlug ? getPackageBySlug(originSlug) : null
  // A1 来源优先级 Package→Direct→None：包与实体来源皆无则整卡不渲染（P4 渐进式呈现）
  if (!pkg && !originGid) return null

  const pkgTitle = pkg?.title.zh ?? ''
  const pkgGoal = pkg?.exploration_goals.zh ?? ''

  const inTimeline = pkg
    ? pkg.timeline_slices.some((s) => s.entity === entityGlobalId)
    : false
  const rels = pkg
    ? pkg.relationship_paths.filter(
        (p) => p.from === entityGlobalId || p.to === entityGlobalId,
      )
    : []

  // 收集把本实体"锚"在包里的证据叙述（真实 claim 文本，非生成）。
  const evidenceIds = Array.from(new Set(rels.flatMap((r) => r.evidence ?? [])))
  const evidence = getEvidenceWithSources(evidenceIds).filter((e) => e.claim)

  // 探索剧本化 续：本实体在包行程中的位置（同一份 buildStations 里程）。
  const stations = pkg ? buildStations(pkg) : []
  const idx = stations.findIndex((s) => s.gid === entityGlobalId)
  const prev = idx > 0 ? stations[idx - 1] : null
  // 跳转同包下一站：先把来源包顺延给目标实体，再走既有 onEntityClick → openEntity。
  // 单一来源、零新状态，banner 在包内前后跳时不丢。
  const jump = (gid: string) => {
    if (!originSlug) return
    setPackageOrigin(originSlug, gid)
    onEntityClick?.(gid)
  }

  // 站间衔接 (Phase B ContinuityEngine, 2026-08-15)：行程区一行「衔接叙述」，
  // 回答"为什么从上一站来到这一站"。统一走 ContinuityEngine + B 解释层：
  //   collectRelationEvidence（证据集合，不裁决）→ buildExplanationCandidates
  //   （素材数组）→ selectBestExplanation（B 选择器）→ 渲染；
  //   无关系（NONE）→ expressHonestNone 诚实陈述（C6：不静默、不编造）。
  const edgeBetween = (a: string, b: string) =>
    pkg
      ? pkg.relationship_paths.find(
          (r) => (r.from === a && r.to === b) || (r.from === b && r.to === a),
        ) ?? null
      : null
  const prevEdge = prev ? edgeBetween(prev.gid, entityGlobalId) : null
  // 多跳路径桥：无直接边时找共同邻居（上一站缓存邻居 ∩ 本站包内邻居）。
  const prevCommon = prev && !prevEdge && pkg
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
  const prevEvidence = prev
    ? collectRelationEvidence(
        { gid: prev.gid, name: prev.name },
        { gid: entityGlobalId, name: entityName },
        {
          edge: prevEdge
            ? { type: prevEdge.type, evidence: prevEdge.evidence }
            : null,
          commonNeighbor: prevCommon,
        },
      )
    : []
  const prevCandidates = prev
    ? buildExplanationCandidates(prevEvidence, prev.name, entityName)
    : []
  const prevExplanation = selectBestExplanation(prevCandidates)
  const prevHonest = prev && prevEvidence.some((e) => e.kind === 'NONE')
    ? expressHonestNone(prev.name, entityName)
    : null

  // A1 站间衔接合一：实体直接来源（A→B 跳入）"从哪里来"——复用同一套
  // ContinuityEngine 解释链（C5），便于与包上下文统一承接；禁另写 transition（防第三套逻辑）。
  const originFrom = (() => {
    if (!originGid || !entityGlobalId) return null
    const rels2 = relationships ?? []
    const rel = rels2.find(
      (r) => r.other.global_id === originGid || r.other.id === originGid,
    )
    const fromName = rel?.other.name ?? getEntityDisplayName(originGid)
    const aNeighbors = getEntityNeighbors(originGid) ?? []
    const bGids = new Set(rels2.map((r) => r.other.global_id ?? r.other.id))
    const common = aNeighbors.find((n) => bGids.has(n.gid)) ?? null
    const evidence = collectRelationEvidence(
      { gid: originGid, name: fromName },
      { gid: entityGlobalId, name: entityName },
      { edge: rel ? { type: rel.type } : null, commonNeighbor: common },
    )
    const candidates = buildExplanationCandidates(evidence, fromName, entityName)
    const selected = selectBestExplanation(candidates)
    const honest = evidence.some((e) => e.kind === 'NONE')
      ? expressHonestNone(fromName, entityName)
      : null
    return {
      fromName,
      bridge: selected?.fact ?? honest?.text ?? null,
      confidence: selected?.confidence ?? null,
    }
  })()

  return (
    <aside className="connection-card" aria-label="你为什么在这里">
      {pkg ? (
        <>
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
                onClick={() => originSlug && onOpenPackage(originSlug)}
              >
                查看完整行程 →
              </button>
            )}
          </div>
          {prevExplanation && prev && (
            <div className="connection-card-transition">
              <span className="connection-card-transition-kicker">
                从上一站「{prev.name}」来
              </span>
              <p className="connection-card-transition-text">
                {prevExplanation.fact}
                {prevExplanation.confidence && (
                  <span className={`transition-confidence transition-confidence--${prevExplanation.confidence}`}>
                    {t(`transition.confidence_${prevExplanation.confidence}`)}
                  </span>
                )}
              </p>
            </div>
          )}
          {prevHonest && (
            <div className="connection-card-transition connection-card-transition--honest">
              <span className="connection-card-transition-kicker">
                从上一站「{prev?.name}」来
              </span>
              <p className="connection-card-transition-text">
                {prevHonest.text}
                {prevHonest.actionHint && (
                  <span className="connection-card-transition-hint">
                    {prevHonest.actionHint}
                  </span>
                )}
              </p>
            </div>
          )}
          {/* A6：极简 ①→②→③ 行程轨（点击站跳转，jump 保留；"查看完整行程"在 head 区） */}
          <div className="connection-card-steps" role="list" aria-label="探索行程">
            {stations.map((s, i) => (
              <button
                key={s.gid}
                type="button"
                role="listitem"
                className={
                  'connection-card-step' +
                  (i === idx ? ' is-current' : i < idx ? ' is-past' : '')
                }
                aria-current={i === idx ? 'step' : undefined}
                title={s.name}
                onClick={() => i !== idx && jump(s.gid)}
                disabled={i === idx}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* A1 从哪里来（站间解释）：仅当实体直接来源与包 prev 站不同源时补一行，
          避免"上一站"与"从哪里来"重复叙述（防超级衔接卡）。 */}
      {originFrom && originFrom.fromName !== prev?.name && (
        <div className="connection-card-transition">
          <span className="connection-card-transition-kicker">
            {originFrom.bridge
              ? t('entity.origin_bridge_from', { name: originFrom.fromName })
              : t('entity.origin_bridge_fallback', { name: originFrom.fromName })}
          </span>
          {originFrom.bridge && (
            <p className="connection-card-transition-text">
              {originFrom.bridge}
              {originFrom.confidence && (
                <span className={`transition-confidence transition-confidence--${originFrom.confidence}`}>
                  {t(`transition.confidence_${originFrom.confidence}`)}
                </span>
              )}
            </p>
          )}
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
        </>
      ) : (
        <div className="connection-card-from">
          {originFrom && (
            <div className="connection-card-transition">
              <span className="connection-card-transition-kicker">
                {originFrom.bridge
                  ? t('entity.origin_bridge_from', { name: originFrom.fromName })
                  : t('entity.origin_bridge_fallback', { name: originFrom.fromName })}
              </span>
              {originFrom.bridge && (
                <p className="connection-card-transition-text">
                  {originFrom.bridge}
                  {originFrom.confidence && (
                    <span className={`transition-confidence transition-confidence--${originFrom.confidence}`}>
                      {t(`transition.confidence_${originFrom.confidence}`)}
                    </span>
                  )}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </aside>
  )
}
