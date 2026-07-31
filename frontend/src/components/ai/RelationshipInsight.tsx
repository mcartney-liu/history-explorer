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
import { TrustDisplay } from './TrustDisplay'

interface RelationshipInsightProps {
  /** Current entity global id (EntityPage.entityId). */
  entityGlobalId: string
}

export function RelationshipInsight({ entityGlobalId }: RelationshipInsightProps) {
  const [response, setResponse] = useState<AIResponse | null>(null)
  const [failed, setFailed] = useState(false)
  const requestSeq = useRef(0)

  useEffect(() => {
    const seq = ++requestSeq.current
    const controller = new AbortController()
    setResponse(null)
    setFailed(false)

    exploreSuggestions([entityGlobalId], controller.signal)
      .then((res) => {
        if (seq === requestSeq.current) setResponse(res)
      })
      .catch(() => {
        if (seq === requestSeq.current) setFailed(true)
      })

    return () => controller.abort()
  }, [entityGlobalId])

  if (failed || !response) return null

  return (
    <section className="relationship-insight" data-testid="relationship-insight">
      {response.answer && <p className="relationship-insight-answer">{response.answer}</p>}
      <TrustDisplay
        evidence={response.evidence}
        nextExploration={response.next_exploration}
        engine={response.engine}
      />
    </section>
  )
}

export default RelationshipInsight
