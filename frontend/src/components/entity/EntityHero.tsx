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
import { getEntityLabel, getEntityIcon } from '../../data/entity/entityLabels'
import { getEntityInsight, type AIEvidence } from '../../data/aiClient'
import { AI_SUGGESTIONS_ENABLED } from '../../data/aiFeatureFlag'
import { EvidenceList } from '../ai/TrustDisplay'
import { Icon } from '../ui/Icon'
import type { IconName } from '../ui/Icon'

interface EntityHeroProps {
  identity: EntityViewModel['identity']
  /** 实体全局 id，用于 AI 生成「历史见解」；为空则隐藏见解区 */
  globalId?: string
  /** M59-016: AI Companion entry — hidden in M60 (mock AI is a liability) */
  onAskAI?: () => void
  /** M59-016: Research entry */
  onResearch?: () => void
  /** M59-016: Compare entry */
  onCompare?: () => void
}

export function EntityHero({ identity, globalId, onResearch, onCompare }: EntityHeroProps) {
  const { name, type, timeLabel, locationLabel, keyFacts } = identity
  const label = getEntityLabel(type)
  const icon = getEntityIcon(type)

  // M90.x: 历史见解 = 后台固化的内容（AI 基于证据生成一次后存储，前端只读）。
  // 挂载读 GET /api/v1/insights/{globalId}；无固化内容 → 占位"待后台生成"。
  const [insight, setInsight] = useState<string | null>(null)
  const [evidence, setEvidence] = useState<AIEvidence[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!AI_SUGGESTIONS_ENABLED || !globalId) return
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

  const showInsight = AI_SUGGESTIONS_ENABLED && globalId && loaded

  return (
    <section className="eh surf-card" aria-label={`${name} — ${label}`}>
      {/* Badge */}
      <div className="eh-badge">
        <Icon name={icon as IconName} size={20} className="eh-badge-icon" />
        <span className="eh-badge-label">{label}</span>
      </div>

      {/* Name */}
      <h1 className="eh-name">{name}</h1>

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
