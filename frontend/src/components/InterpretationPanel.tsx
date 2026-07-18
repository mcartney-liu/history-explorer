type InterpretationPanelProps = {
  // Props establish the future integration boundary. The panel is a pure
  // presentational component driven entirely by what it is given — no AI logic,
  // no API calls, no provider wiring, no prompt system lives here. It is the
  // designated seam for the future interpretation layer (the planned AI-assisted
  // guidance), which does not yet exist; until then it stays a static
  // placeholder so the UI contract / layout position remain stable.
  title?: string
  message?: string
}

function InterpretationPanel({
  title = 'Interpretation Guide',
  message = 'Interpretation guidance (the future AI layer) will be available in a future version.',
}: InterpretationPanelProps) {
  return (
    <div className="result-section interpretation-panel">
      <h3>{title}</h3>
      <p className="interpretation-panel-message">{message}</p>
    </div>
  )
}

export default InterpretationPanel
