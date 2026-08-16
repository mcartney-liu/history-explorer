// ============================================================
// M59-006 — EntityHero
// Layer 1 of Entity Experience v2: the Identity Layer.
// Museum-grade entity entry point. Consumes EntityViewModel.identity.
// M59-016: added onAskAI prop — AI Companion entry point.
// M90.x: AI oneliner 落地 —— 历史见解由 /api/v1/ai/explain 生成；
//       无 globalId / AI 关闭 / 请求失败 → 整块隐藏（fail-soft）。
// ============================================================

import { useEffect, useState } from 'react'
import type { EntityViewModel } from '../../data/entity/entityTypes'
import { type EntityInsight, stripMarkdown } from '../../data/entity/EntityInsightModel'
import { getEntityLabel, getEntityIcon, entityTypeFromGlobalId } from '../../data/entity/entityLabels'
import { getEntityInsight, type AIEvidence } from '../../data/aiClient'
import { EvidenceList } from '../ai/TrustDisplay'
import { Icon } from '../ui/Icon'
import type { IconName } from '../ui/Icon'
import { slotImageName, slotImageFocus, useContentRevision } from '../../data/contentRuntime'
import { mediaUrl } from '../../data/contentApi'

interface EntityHeroProps {
  identity: EntityViewModel['identity']
  /** 实体全局 id，用于 AI 生成「历史见解」；为空则隐藏见解区 */
  globalId?: string
  /** 简版历史见解（本地 buildInsight）—— 并入身份卡顶部，作「先总后分」的总览 */
  insightSummary?: EntityInsight
  /** 点击关联实体徽章时跳转 */
  onEntityClick?: (id: string) => void
  /** M59-016: AI Companion entry — hidden in M60 (mock AI is a liability) */
  onAskAI?: () => void
  /** M59-016: Research entry */
  onResearch?: () => void
  /** M59-016: Compare entry */
  onCompare?: () => void
}

export function EntityHero({ identity, globalId, insightSummary, onEntityClick, onResearch, onCompare }: EntityHeroProps) {
  const { name, type, timeLabel, locationLabel, keyFacts } = identity
  const label = getEntityLabel(type)
  const icon = getEntityIcon(type)

  // 实体身份图（后台 entity_identity.{globalId} slot，PO 2026-08-15 B 类）：
  // 后台配的图优先渲染到身份卡顶部；未配则整块不渲染，回退到上方类型图标。
  // useContentRevision 订阅后台改动，配图后无需刷新整页即更新。
  useContentRevision()
  const artName = globalId ? slotImageName(`entity_identity.${globalId}`) : null
  const artSrc = artName ? mediaUrl(artName) : null
  const artFocus = globalId ? slotImageFocus(`entity_identity.${globalId}`) : null

  // M90.x: 历史见解 = 后台固化的内容（AI 基于证据生成一次后存储，前端只读）。
  // 挂载读 GET /api/v1/insights/{globalId}；无固化内容 → 占位"待后台生成"。
  const [insight, setInsight] = useState<string | null>(null)
  const [evidence, setEvidence] = useState<AIEvidence[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    // 2026-08-12 (PO 修复)：历史见解是后台固化内容（GET 只读，与 AI 运行时
    // 无关），不再被 AI_SUGGESTIONS_ENABLED（探索建议开关，默认 OFF）误门控——
    // 此前该开关关闭时整个"历史见解"区块消失。
    if (!globalId) return
    let cancelled = false
    setLoading(true)
    setLoaded(false)
    getEntityInsight(globalId)
      .then((rec) => {
        if (cancelled) return
        setInsight(rec?.insight ?? null)
        setEvidence(rec?.evidence ?? [])
        setLoading(false)
        setLoaded(true)
      })
      .catch(() => {
        if (cancelled) return
        setLoading(false)
        setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [globalId])

  const showInsight = globalId && loaded

  return (
    <section className="eh surf-card" aria-label={`${name} — ${label}`}>
      {/* 身份图（后台 entity_identity.{globalId} 配置；未配则不渲染） */}
      {artSrc && (
        <div className="eh-art">
          <img src={artSrc} alt={`${name} 身份图`} style={{ objectPosition: artFocus ?? '50% 50%' }} />
        </div>
      )}

      {/* Badge */}
      <div className="eh-badge">
        <Icon name={icon as IconName} size={20} className="eh-badge-icon" />
        <span className="eh-badge-label">{label}</span>
      </div>

      {/* Name */}
      <h1 className="eh-name">{name}</h1>

      {/* 简版历史见解（总览）—— 并入身份卡、置于详细描述之上，形成先总后分 */}
      {insightSummary && (
        <div className="eh-insight">
          <div className="eic-header">
            <span className="eic-label">历史见解</span>
          </div>
          <p className="eic-perspective">一句话讲清：这个实体是什么</p>
          <p className="eic-text">{stripMarkdown(insightSummary.text)}</p>
          {insightSummary.keyNames.length > 0 && (
            <div className="eic-badges">
              {insightSummary.keyNames.map((k) => (
                <button
                  key={k.id}
                  type="button"
                  className="eic-badge eic-badge--link"
                  onClick={() => onEntityClick?.(k.id)}
                  title={`查看 ${k.name}`}
                >
                  <Icon name={getEntityIcon(entityTypeFromGlobalId(k.id)) as IconName} size={16} className="eic-badge-icon" />
                  {k.name}
                </button>
              ))}
            </div>
          )}
          {insightSummary.timelineHighlights.length > 0 && (
            <div className="eic-timeline-chips">
              {insightSummary.timelineHighlights.map((event, i) => (
                <span key={i} className="eic-chip"><Icon name="time-period" size={16} /> {event}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Meta */}
      <div className="eh-meta">
        {timeLabel && (
          <span className="eh-meta-item">
            <Icon name="time-period" size={16} className="eh-meta-icon" />
            {timeLabel}
          </span>
        )}
        {locationLabel && (
          <span className="eh-meta-item">
            <Icon name="location" size={16} className="eh-meta-icon" />
            {locationLabel}
          </span>
        )}
      </div>

      {/* M90.x: 历史见解（后台固化内容，前端只读）+ 支撑证据（EvidenceList） */}
      {showInsight && (
        <>
          <div className="eh-ai">
            {loading ? (
              <span className="eh-ai-label">加载中…</span>
            ) : insight ? (
              <p className="eh-ai-text">{insight}</p>
            ) : (
              <span className="eh-ai-label">历史见解待后台生成</span>
            )}
          </div>
          {evidence.length > 0 && <EvidenceList items={evidence} />}
        </>
      )}

      {/* M59-016: Quick actions（深入研究/加入对比 为占位桩，标注"未开放"待规划） */}
      <div className="eh-actions">
        {onResearch && (
          <button type="button" className="eh-action eh-action-research btn" onClick={onResearch}>
            <Icon name="research" size={16} /> 深入研究
            <span className="eh-action-tag">未开放</span>
          </button>
        )}
        {onCompare && (
          <button type="button" className="eh-action eh-action-compare btn" onClick={onCompare}>
            <span>⇔</span> 加入对比
            <span className="eh-action-tag">未开放</span>
          </button>
        )}
      </div>

      {/* Key Facts */}
      {keyFacts.length > 0 && (
        <div className="eh-facts">
          {keyFacts.slice(0, 3).map((fact, i) => (
            <div key={i} className="eh-fact-card">
              {fact}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export default EntityHero
