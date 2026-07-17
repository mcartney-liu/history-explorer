// History navigation bar (M2-003, requirement 2).
// Browser-style Back / Forward over the app's own exploration history
// (not the URL). Buttons disable themselves when there is nowhere to go.
// Pure presentational component; App owns the handlers.

type HistoryBarProps = {
  canBack: boolean
  canForward: boolean
  onBack: () => void
  onForward: () => void
}

function HistoryBar({ canBack, canForward, onBack, onForward }: HistoryBarProps) {
  return (
    <div className="he-history-bar" role="group" aria-label="History navigation">
      <button
        type="button"
        className="he-history-btn"
        onClick={onBack}
        disabled={!canBack}
        aria-label="Go back"
      >
        {'‹ Back'}
      </button>
      <button
        type="button"
        className="he-history-btn"
        onClick={onForward}
        disabled={!canForward}
        aria-label="Go forward"
      >
        {'Forward ›'}
      </button>
    </div>
  )
}

export default HistoryBar
