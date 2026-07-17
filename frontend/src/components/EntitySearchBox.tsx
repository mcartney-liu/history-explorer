import { useState } from 'react'

type EntitySearchBoxProps = {
  onSearch: (query: string) => void
  loading?: boolean
  error?: string
  // M2-002.5 keyboard navigation: when results are visible, Arrow keys move
  // the selection, Enter opens the selected entity, Esc closes the results.
  // The box only forwards the key intents; App owns the selection state.
  resultsActive?: boolean
  onArrow?: (direction: 'up' | 'down') => void
  onEnterSelect?: () => void
  onEscape?: () => void
}

// M2-002 search bar: queries GET /search?q= for an entity (person, place,
// event, technology, religion, ...) and surfaces ranked results. Pure UI —
// the actual matching/ranking lives in the backend, no AI or client logic.
function EntitySearchBox({
  onSearch,
  loading,
  error,
  resultsActive = false,
  onArrow,
  onEnterSelect,
  onEscape,
}: EntitySearchBoxProps) {
  const [value, setValue] = useState('')

  function submit() {
    const q = value.trim()
    if (q) onSearch(q)
  }

  return (
    <>
      <div className="explorer-controls">
        <input
          className="topic-input"
          type="text"
          value={value}
          placeholder="Search entities (e.g. Augustus, Rome, papyrus)"
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              onArrow?.('down')
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              onArrow?.('up')
            } else if (e.key === 'Enter') {
              // With results open, Enter selects the highlighted entity;
              // otherwise it submits a fresh search.
              if (resultsActive) {
                e.preventDefault()
                onEnterSelect?.()
              } else {
                submit()
              }
            } else if (e.key === 'Escape') {
              e.preventDefault()
              onEscape?.()
            }
          }}
        />
        <button className="explore-button" onClick={submit} disabled={loading}>
          {loading ? 'Searching…' : 'Search'}
        </button>
      </div>

      {error && <p className="explorer-error">{error}</p>}
    </>
  )
}

export default EntitySearchBox
