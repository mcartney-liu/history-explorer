// M74-003 (C3-2): RelationshipInsight (T2) — Entity page AI exploration
// touchpoint.
//
// Responsibilities ONLY (Exploration First + Trust Boundary First):
//  1. receive the current entity global_id
//  2. call exploreSuggestions([entityGlobalId]) (backend runs ClaimGraph →
//     EvidenceSelection → EvidenceValidation → deterministic grounded response)
//  3. render response.answer (explanation) + evidence + next_exploration
//     THROUGH TrustDisplay
//
// The component NEVER reads entityData.relationships and NEVER assembles
// "A --relationship--> B" locally — every relation comes from the backend's
// validated evidence. Mounting rule (PO): the parent renders
// `AI_SUGGESTIONS_ENABLED && <RelationshipInsight/>`, so OFF = zero request.
import { useEffect, useRef, useState } from 'react'
import { exploreSuggestions, type AIResponse } from '../../data/aiClient'
import { visitedFromEvents } from '../../data/explorationGuide'
import { getEvents } from '../../data/UserBehaviorEvent'
import { useLocale } from '../../data/locale'
import { TrustDisplay } from './TrustDisplay'

interface RelationshipInsightProps {
  /** Current entity global id (EntityPage.entityId). */
  entityGlobalId: string
  /** 2026-08-11 (PO): 推荐项点击导航——由消费方接到既有 openEntity 路径。
   *  参数为 next_exploration 的 global_id（如 hellenistic_world:civ-greek）。 */
  onNextClick?: (globalId: string) => void
}

export function RelationshipInsight({ entityGlobalId, onNextClick }: RelationshipInsightProps) {
  const { t } = useLocale()
  const [response, setResponse] = useState<AIResponse | null>(null)
  const [failed, setFailed] = useState(false)
  const [loading, setLoading] = useState(false)
  const requestSeq = useRef(0)

  useEffect(() => {
    const seq = ++requestSeq.current
    const controller = new AbortController()
    setResponse(null)
    setFailed(false)
    setLoading(true)

    // M74-004-002 (P2): frontend supplies only raw visited ids from the
    // existing event stream — backend Planner owns filtering.
    const visited = visitedFromEvents(getEvents())

    exploreSuggestions([entityGlobalId], { signal: controller.signal, visited })
      .then((res) => {
        if (seq === requestSeq.current) {
          setResponse(res)
          setLoading(false)
        }
      })
      .catch(() => {
        if (seq === requestSeq.current) {
          setFailed(true)
          setLoading(false)
        }
      })

    return () => controller.abort()
  }, [entityGlobalId])

  // M90.x (方案 A 归位): 历史见解 + 支撑证据已移至身份卡（EntityHero），
  // 探索建议卡瘦身为"下一步推荐"导航——不渲染 AI 回答（与历史见解重复）、
  // 不渲染证据（归位），只呈现 next_exploration（确定性推荐）。
  if (failed) return null
  if (loading && !response) {
    return (
      <section className="relationship-insight relationship-insight--loading" data-testid="relationship-insight">
        <p className="relationship-insight-loading">正在生成探索建议…</p>
      </section>
    )
  }
  if (!response) return null

  const nextList = response.next_exploration ?? []
  if (nextList.length === 0) {
    return (
      <section className="relationship-insight" data-testid="relationship-insight">
        <p className="relationship-insight-loading">{t('ai.trust_no_next')}</p>
      </section>
    )
  }

  return (
    <section className="relationship-insight" data-testid="relationship-insight">
      {/* 2026-08-11 (PO)：推荐列表为确定性 Planner 产物（图谱+证据模板），
          非 AI 生成——引擎徽标显式覆盖为"知识库推荐"，不再错绑 AI answer 的
          engine/confidence（"AI 生成"+"可信度低"是 answer 的属性，此处不渲染）。 */}
      <TrustDisplay
        nextExploration={nextList}
        onNextClick={onNextClick}
        engineBadgeLabel={t('ai.trust_engine_knowledge')}
      />
    </section>
  )
}

export default RelationshipInsight
