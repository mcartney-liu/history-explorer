type ExplorationStateProps = {
  current: string
  previous?: string
}

function ExplorationState({ current, previous }: ExplorationStateProps) {
  return (
    <div className="result-section exploration-state">
      <h3>Exploration</h3>
      {previous && (
        <div className="exp-state-row">
          <span className="exp-state-label">Previous Exploration</span>
          <span className="exp-state-topic">{previous}</span>
        </div>
      )}
      <div className="exp-state-row">
        <span className="exp-state-label">Current Exploration</span>
        <span className="exp-state-topic exp-state-current">{current}</span>
      </div>
    </div>
  )
}

export default ExplorationState
