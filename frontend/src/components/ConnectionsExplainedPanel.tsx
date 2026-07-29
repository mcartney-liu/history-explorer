// M3.5-004: render the backend's additive `connections_explained` field.
//
// The backend (M3.5-003) now returns, for GET /entity/{id} and GET /explore/{topic},
// a top-level `connections_explained: ConnectionExplained[]`. This panel is
// strictly additive: when the field is absent it renders nothing, so the legacy
// UI (and the legacy <ConnectionsPanel/>) is untouched.
//
// M61: merged ExplorationPathsPanel's path-chain rendering into this component.
// When onNodeClick is provided and a connection has path data, a clickable
// node chain is rendered below the explanation row.
import { Fragment } from 'react'
import { useLocale } from '../data/locale'
export type ConnectionExplained = {
  global_id: string
  depth: number
  path: unknown[]
  steps: unknown[]
  score: number
  score_breakdown: Record<string, unknown>
  explanation: string
}

type PathStep = {
  from_global_id: string
  to_global_id: string
  relationship: string
  direction: string
  weight?: number
}

type ConnectionsExplainedPanelProps = {
  connections?: ConnectionExplained[]
  onNodeClick?: (globalId: string) => void
}

function resolveLocalName(globalId: string): string {
  if (!globalId || !globalId.includes(':')) return globalId
  return globalId.split(':').slice(1).join(':') || globalId
}

function ConnectionsExplainedPanel({ connections, onNodeClick }: ConnectionsExplainedPanelProps) {
  const { t } = useLocale()
  if (!connections || connections.length === 0) return null

  return (
    <div className="result-section">
      <h3>{t('common.explainableConnections')}</h3>
      <div className="ce-list">
        {connections.map((item, idx) => (
          <div className="main-entity ce-item" key={idx}>
            <div className="ce-head">
              <span className="re-name">{resolveLocalName(item.global_id)}</span>
              {item.depth != null && (
                <span className="me-type">{t('common.depthLabel', { n: String(item.depth) })}</span>
              )}
              {typeof item.score === 'number' && (
                <span className="me-type">{t('common.scoreLabel', { n: String(item.score) })}</span>
              )}
            </div>
            <span className="re-rel">{item.explanation || item.global_id}</span>
          </div>
        ))}
      </div>
      {onNodeClick && (
        <div className="ep-list">
          {connections.map((item, idx) => {
            const path = Array.isArray(item.path) ? (item.path as string[]) : []
            const steps = Array.isArray(item.steps) ? (item.steps as PathStep[]) : []
            if (path.length === 0) return null
            return (
              <div className="main-entity ep-item" key={`path-${idx}`}>
                <div className="ep-chain">
                  {path.map((node, i) => {
                    const edge =
                      i < path.length - 1
                        ? steps.find(
                            (s) =>
                              s.from_global_id === node &&
                              s.to_global_id === path[i + 1],
                          )
                        : undefined
                    const isIncoming = edge?.direction === 'incoming'
                    return (
                      <Fragment key={`${node}-${i}`}>
                        <button
                          type="button"
                          className="ep-node is-clickable"
                          aria-label={t('common.openLabel', { name: resolveLocalName(node) })}
                          onClick={() => onNodeClick(node)}
                        >
                          {resolveLocalName(node)}
                        </button>
                        {i < path.length - 1 && (
                          <span className="ep-edge" aria-hidden="true">
                            {edge ? (
                              <>
                                {isIncoming ? '\u2190' : '\u2014'}
                                <span className="ep-edge-label">
                                  [{edge.relationship} {edge.direction}]
                                </span>
                                {isIncoming ? '\u2014' : '\u2192'}
                              </>
                            ) : (
                              '\u2192'
                            )}
                          </span>
                        )}
                      </Fragment>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ConnectionsExplainedPanel
