// M74-003 (C3-2): ExplorationSuggestions (T1) — Package page AI exploration
// touchpoint.
//
// Responsibilities ONLY (Exploration First + Trust Boundary First):
//  1. take the package anchor global_id
//  2. call exploreSuggestions([anchorGlobalId]) (backend runs ClaimGraph →
//     EvidenceSelection → EvidenceValidation → deterministic grounded response)
//  3. consume response.next_exploration / evidence / confidence / engine
//  4. render the suggestions through TrustDisplay
//
// The component NEVER generates relationship/claim/source explanations —
// every fact comes from the backend response. Navigation reuses the EXISTING
// onEntityClick(global_id) path (no new navigation logic).
//
// Mounting rule (PO): the parent renders `AI_SUGGESTIONS_ENABLED && <Cmp/>`,
// so when the flag is OFF this component never mounts and no request is made.
import { useEffect, useRef, useState } from 'react'
import { exploreSuggestions, type AIResponse } from '../../data/aiClient'
import { visitedFromEvents } from '../../data/explorationGuide'
import { getEvents } from '../../data/UserBehaviorEvent'
import { TrustDisplay } from './TrustDisplay'

interface ExplorationSuggestionsProps {
  /** Package anchor entity global id (from pkg.entity_references[0]). */
  anchorGlobalId: string
  /** Existing entity navigation path — wired by the page, never recreated. */
  onEntityClick?: (globalId: string) => void
}

export function ExplorationSuggestions({
  anchorGlobalId,
  onEntityClick,
}: ExplorationSuggestionsProps) {
  const [response, setResponse] = useState<AIResponse | null>(null)
  const [failed, setFailed] = useState(false)
  const requestSeq = useRef(0)

  useEffect(() => {
    const seq = ++requestSeq.current
    const controller = new AbortController()
    setResponse(null)
    setFailed(false)

    // M74-004-002 (P2): the frontend ONLY supplies raw visited entity ids
    // (from the existing event stream — no new collection). The backend
    // Planner owns filtering and recommendation logic.
    const visited = visitedFromEvents(getEvents())

    exploreSuggestions([anchorGlobalId], { signal: controller.signal, visited })
      .then((res) => {
        if (seq === requestSeq.current) setResponse(res)
      })
      .catch(() => {
        if (seq === requestSeq.current) setFailed(true)
      })

    return () => controller.abort()
  }, [anchorGlobalId])

  // Failed request (backend unreachable) -> render nothing (deterministic
  // fallback already surfaced by the backend when it IS reachable).
  if (failed || !response) return null

  return (
    <section className="exploration-suggestions" data-testid="exploration-suggestions">
      <TrustDisplay
        evidence={response.evidence}
        nextExploration={response.next_exploration}
        engine={response.engine}
        onNextClick={onEntityClick}
      />
    </section>
  )
}

export default ExplorationSuggestions
