// M3.5-004: render the backend's additive `connections_explained` field.
//
// The backend (M3.5-003) now returns, for GET /entity/{id} and GET /explore/{topic},
// a top-level `connections_explained: ConnectionExplained[]`. This panel is
// strictly additive: when the field is absent it renders nothing, so the legacy
// UI (and the legacy <ConnectionsPanel/>) is untouched.
export type ConnectionExplained = {
  global_id: string
  depth: number
  path: unknown[]
  steps: unknown[]
  score: number
  score_breakdown: Record<string, unknown>
  explanation: string
}

type ConnectionsExplainedPanelProps = {
  connections?: ConnectionExplained[]
}

function resolveLocalName(globalId: string): string {
  if (!globalId || !globalId.includes(':')) return globalId
  return globalId.split(':').slice(1).join(':') || globalId
}

function ConnectionsExplainedPanel({ connections }: ConnectionsExplainedPanelProps) {
  if (!connections || connections.length === 0) return null

  return (
    <div className="result-section">
      <h3>Explainable Connections</h3>
      <div className="ce-list">
        {connections.map((item, idx) => (
          <div className="main-entity ce-item" key={idx}>
            <div className="ce-head">
              <span className="re-name">{resolveLocalName(item.global_id)}</span>
              {item.depth != null && (
                <span className="me-type">{`depth ${item.depth}`}</span>
              )}
              {typeof item.score === 'number' && (
                <span className="me-type">{`score ${item.score}`}</span>
              )}
            </div>
            <span className="re-rel">{item.explanation || item.global_id}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ConnectionsExplainedPanel
