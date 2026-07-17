// M3.5-004: render the multi-hop exploration narrative from the backend's
// additive `connections_explained[].path` / `connections_explained[].steps`.
//
// Each explained connection becomes a left-to-right chain of node chips
// (global_ids) joined by relationship edges, e.g. for Rome -> Silk Road ->
// Han:  rome —[traded_with outgoing]→ silk_road —[...]→ han. Every chip is
// cross-topic clickable: it already carries a full `global_id`, so we pass it
// straight to onNodeClick WITHOUT re-prefixing (unlike RelationshipView, which
// deals in local ids and prefixes them). Strictly additive: renders nothing
// when the field is absent or a path is empty, so legacy UI is untouched.
import { Fragment } from 'react'
import { ConnectionExplained } from './ConnectionsExplainedPanel'

type PathStep = {
  from_global_id: string
  to_global_id: string
  relationship: string
  direction: string
  weight?: number
}

type ExplorationPathsPanelProps = {
  connections?: ConnectionExplained[]
  onNodeClick?: (globalId: string) => void
}

function localName(globalId: string): string {
  if (!globalId || !globalId.includes(':')) return globalId
  return globalId.split(':').slice(1).join(':') || globalId
}

function ExplorationPathsPanel({ connections, onNodeClick }: ExplorationPathsPanelProps) {
  if (!connections || connections.length === 0) return null

  return (
    <div className="result-section">
      <h3>Exploration Paths</h3>
      <div className="ep-list">
        {connections.map((item, idx) => {
          const path = Array.isArray(item.path) ? (item.path as string[]) : []
          const steps = Array.isArray(item.steps) ? (item.steps as PathStep[]) : []
          if (path.length === 0) return null

          return (
            <div className="main-entity ep-item" key={idx}>
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
                        aria-label={`Open ${localName(node)}`}
                        onClick={() => onNodeClick?.(node)}
                      >
                        {localName(node)}
                      </button>
                      {i < path.length - 1 && (
                        <span className="ep-edge" aria-hidden="true">
                          {edge ? (
                            <>
                              {isIncoming ? '←' : '—'}
                              <span className="ep-edge-label">
                                [{edge.relationship} {edge.direction}]
                              </span>
                              {isIncoming ? '—' : '→'}
                            </>
                          ) : (
                            '→'
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
    </div>
  )
}

export default ExplorationPathsPanel
