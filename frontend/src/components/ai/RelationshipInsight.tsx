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
}

export function RelationshipInsight({ entityGlobalId }: RelationshipInsightProps) {
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
      <TrustDisplay
        nextExploration={nextList}
        engine={response.engine}
        confidence={response.confidence}
      />
    </section>
  )
}

export default RelationshipInsight
