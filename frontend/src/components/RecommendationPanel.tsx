// M9-002 (M9-002.2): RecommendationPanel — surfaces the already-shipped
// deterministic Next-Node Recommendation Engine (M9-001.2 / v0.11.0) as a
// "where to go next, and why" discovery zone in the entity view.
//
// Strictly frontend-only and additive:
//   - consumes GET /entity/{id}/recommendations (no new endpoint, no backend)
//   - never re-ranks / re-scores / re-orders the engine's output
//   - App owns all navigation; this panel only calls the supplied onNodeClick
//   - pure presentational view + a pure fetch helper, so it is testable under
//     vitest's node environment (no jsdom) via renderToStaticMarkup + mock fetch
//
// Layering (required for testability without a DOM):
//   fetchRecommendations()      -> pure async helper (mockable in node)
//   RecommendationPanelView     -> pure presentational (renderToStaticMarkup)
//   RecommendationPanel         -> container: useState/useEffect + 3 states

import { useState, useEffect, useCallback } from 'react'
import LoadingSkeleton from './LoadingSkeleton'
import ErrorCard, { ErrorKind } from './ErrorCard'

// Same externalized base URL contract as App.tsx (L54) — inlined to avoid
// widening App's export surface and to keep this file self-contained.
const API_BASE: string = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

// --- Types (mirror backend RecommendationResult.to_dict() contract) ---

export type RelationPathStep = {
  from: string
  to: string
  relationship: string
  direction: string
  weight: number
}

export type RecommendationItem = {
  target_entity: {
    global_id: string
    name: string
    type: string
  }
  score: number
  score_breakdown: Record<string, number>
  reasons: string[]
  relation_path: RelationPathStep[]
  metadata: {
    depth: number
    candidate_source: string
    entity_type: string
  }
}

export type RecommendationResult = {
  current_entity: { global_id: string; name: string; type: string }
  recommendations: RecommendationItem[]
  algorithm_version: string
  parameters: { limit: number; seen: string[] }
  metadata: Record<string, unknown>
}

// Typed error so the container can map it to the right ErrorCard kind.
class RecommendationError extends Error {
  kind: ErrorKind
  constructor(kind: ErrorKind, message: string) {
    super(message)
    this.kind = kind
    this.name = 'RecommendationError'
  }
}

// --- Pure fetch helper ---

export async function fetchRecommendations(
  entityId: string,
  seenGlobalIds: Set<string>,
  limit: number,
): Promise<RecommendationResult> {
  const seen = [...seenGlobalIds].join(',')
  const url =
    `${API_BASE}/entity/${encodeURIComponent(entityId)}/recommendations` +
    `?limit=${limit}&seen=${encodeURIComponent(seen)}`

  let resp: Response
  try {
    resp = await fetch(url)
  } catch {
    throw new RecommendationError('network', 'Unable to reach the backend.')
  }

  if (resp.status === 404) {
    throw new RecommendationError('notfound', 'Entity not found.')
  }
  if (!resp.ok) {
    throw new RecommendationError('parse', `Unexpected response status ${resp.status}.`)
  }

  try {
    return (await resp.json()) as RecommendationResult
  } catch {
    throw new RecommendationError('parse', 'Response could not be read.')
  }
}

// --- Pure helpers ---

function localName(globalId: string): string {
  if (!globalId || !globalId.includes(':')) return globalId
  return globalId.split(':').slice(1).join(':') || globalId
}

// --- Pure presentational view ---

type RecommendationPanelViewProps = {
  recommendations: RecommendationItem[]
  seenGlobalIds?: Set<string>
  onNodeClick?: (globalId: string) => void
}

export function RecommendationPanelView({
  recommendations,
  seenGlobalIds,
  onNodeClick,
}: RecommendationPanelViewProps) {
  return (
    <div className="result-section he-recommend">
      <h3>下一站探索</h3>
      <ul className="he-recommend-list">
        {recommendations.map((rec, idx) => {
          const gid = rec.target_entity.global_id
          const name = rec.target_entity.name || localName(gid)
          const type = rec.target_entity.type
          const seen = seenGlobalIds?.has(gid) ?? false
          return (
            <li key={`${gid}-${idx}`} className="he-recommend-item">
              <button
                type="button"
                className={seen ? 'he-recommend-node is-seen' : 'he-recommend-node'}
                aria-label={`Explore ${name}`}
                onClick={() => onNodeClick?.(gid)}
              >
                <span className="he-recommend-name">{name}</span>
                {type ? <span className="he-recommend-type">{type}</span> : null}
                {seen ? (
                  <span className="he-recommend-seen" aria-hidden="true">
                    seen
                  </span>
                ) : null}
              </button>

              {rec.reasons.length > 0 ? (
                <ul className="he-recommend-reasons">
                  {rec.reasons.map((reason, i) => (
                    <li key={i}>{reason}</li>
                  ))}
                </ul>
              ) : null}

              {rec.relation_path.length > 0 ? (
                <div className="he-recommend-path">
                  {rec.relation_path.map((step, i) => (
                    <span
                      key={i}
                      className="he-recommend-path-step"
                      title={`${step.direction} · weight ${step.weight}`}
                    >
                      <span className="he-recommend-path-from">{localName(step.from)}</span>
                      <span className="he-recommend-path-arrow" aria-hidden="true">
                        →
                      </span>
                      <span className="he-recommend-path-rel">{step.relationship}</span>
                      <span className="he-recommend-path-arrow" aria-hidden="true">
                        →
                      </span>
                      <span className="he-recommend-path-to">{localName(step.to)}</span>
                    </span>
                  ))}
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// --- Container (owns local 3-state; navigation delegated to App) ---

export type RecommendationPanelProps = {
  entityId: string
  seenGlobalIds?: Set<string>
  max?: number
  onNodeClick?: (globalId: string) => void
}

function RecommendationPanel({
  entityId,
  seenGlobalIds,
  max = 5,
  onNodeClick,
}: RecommendationPanelProps) {
  const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading')
  const [data, setData] = useState<RecommendationResult | null>(null)
  const [errorKind, setErrorKind] = useState<ErrorKind>('network')

  const load = useCallback(() => {
    setStatus('loading')
    fetchRecommendations(entityId, seenGlobalIds ?? new Set(), max)
      .then((result) => {
        setData(result)
        setStatus('success')
      })
      .catch((e) => {
        setErrorKind(e instanceof RecommendationError ? e.kind : 'network')
        setStatus('error')
      })
  }, [entityId, seenGlobalIds, max])

  useEffect(() => {
    load()
  }, [load])

  if (status === 'loading') {
    return (
      <div className="result-section he-recommend">
        <LoadingSkeleton label="推荐探索路径…" />
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="result-section he-recommend">
        <ErrorCard kind={errorKind} onRetry={load} />
      </div>
    )
  }

  if (!data || data.recommendations.length === 0) {
    return null
  }

  return (
    <RecommendationPanelView
      recommendations={data.recommendations}
      seenGlobalIds={seenGlobalIds}
      onNodeClick={onNodeClick}
    />
  )
}

export default RecommendationPanel
