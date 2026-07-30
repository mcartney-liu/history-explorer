// ============================================================
// M65 Phase 2A — QuickStartChips
// Shared presentational component for quick-start question buttons.
// Extracted from LandingPage (lines 62-75) for reuse in Discover.
// Zero business logic. Zero state.
// ============================================================

interface QuickStartChipsProps {
  questions: string[]
  onSelect: (query: string) => void
}

export function QuickStartChips({ questions, onSelect }: QuickStartChipsProps) {
  if (questions.length === 0) return null

  return (
    <div className="he-quick">
      <span className="he-quick-label">试试：</span>
      {questions.map((q) => (
        <button
          key={q}
          type="button"
          className="he-quick-btn"
          onClick={() => onSelect(q)}
        >
          {q}
        </button>
      ))}
    </div>
  )
}

export default QuickStartChips
