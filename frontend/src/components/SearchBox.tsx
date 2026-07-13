type SearchBoxProps = {
  topic: string
  loading: boolean
  error: string
  onTopicChange: (value: string) => void
  onExplore: () => void
}

function SearchBox({ topic, loading, error, onTopicChange, onExplore }: SearchBoxProps) {
  return (
    <>
      <div className="explorer-controls">
        <input
          className="topic-input"
          type="text"
          value={topic}
          placeholder="Enter a historical topic"
          onChange={(e) => onTopicChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onExplore()
          }}
        />
        <button className="explore-button" onClick={onExplore} disabled={loading}>
          {loading ? 'Exploring…' : 'Explore'}
        </button>
      </div>

      {error && <p className="explorer-error">{error}</p>}
    </>
  )
}

export default SearchBox
