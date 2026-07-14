type AIGuidePanelProps = {
  // Props establish the future integration boundary: the panel is a pure
  // presentational component driven entirely by what it is given. No AI logic,
  // no API calls, no provider wiring lives here.
  title?: string
  message?: string
}

function AIGuidePanel({
  title = 'AI Guide',
  message = 'AI exploration guidance will be available in a future version.',
}: AIGuidePanelProps) {
  return (
    <div className="result-section ai-guide">
      <h3>{title}</h3>
      <p className="ai-guide-message">{message}</p>
    </div>
  )
}

export default AIGuidePanel
