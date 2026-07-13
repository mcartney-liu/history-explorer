import { useState } from 'react'

const API_BASE = 'http://localhost:8000'

type TimelineItem = {
  period: string
  event: string
}

type ConnectionItem = {
  type: string
  name: string
}

type MainEntity = {
  id: string
  type: string
  name: string
  description: string
}

type RelatedEntity = {
  id: string
  type: string
  relationship: string
}

type ExplorationResult = {
  topic: string
  title: string
  summary: string
  timeline: TimelineItem[]
  connections: ConnectionItem[]
  exploration: {
    main_entity: MainEntity
    related_entities: RelatedEntity[]
  }
}

function App() {
  const [topic, setTopic] = useState('')
  const [result, setResult] = useState<ExplorationResult | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleExplore() {
    const trimmed = topic.trim()
    if (!trimmed) {
      setError('Please enter a historical topic.')
      setResult(null)
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const response = await fetch(`${API_BASE}/explore/${encodeURIComponent(trimmed)}`)
      if (!response.ok) {
        throw new Error(`Request failed (${response.status})`)
      }
      const data: ExplorationResult = await response.json()
      setResult(data)
    } catch (err) {
      setError('Unable to load exploration result. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="app">
      <section className="hero">
        <h1 className="title">History Explorer</h1>
        <p className="tagline">Explore History. Discover Civilization.</p>
        <p className="description">
          An AI-powered global history exploration platform.
        </p>

        <div className="explorer">
          <div className="explorer-controls">
            <input
              className="topic-input"
              type="text"
              value={topic}
              placeholder="Enter a historical topic"
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleExplore()
              }}
            />
            <button className="explore-button" onClick={handleExplore} disabled={loading}>
              {loading ? 'Exploring…' : 'Explore'}
            </button>
          </div>

          {error && <p className="explorer-error">{error}</p>}

          {result && (
            <div className="result">
              <h2 className="result-title">{result.title}</h2>
              <p className="result-summary">{result.summary}</p>

              {result.exploration?.main_entity?.id && (
                <div className="result-section">
                  <h3>Main Entity</h3>
                  <div className="main-entity">
                    <span className="me-name">{result.exploration.main_entity.name}</span>
                    <span className="me-type">{result.exploration.main_entity.type}</span>
                    <p className="me-desc">{result.exploration.main_entity.description}</p>
                  </div>
                </div>
              )}

              <div className="result-section">
                <h3>Related Entities</h3>
                {result.exploration.related_entities.length > 0 ? (
                  <ul className="related-list">
                    {result.exploration.related_entities.map((item) => (
                      <li key={item.id}>
                        <span className="re-name">{item.id}</span>
                        <span className="re-type">{item.type}</span>
                        <span className="re-rel">{item.relationship}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="empty">No related entities.</p>
                )}
              </div>

              <div className="result-section">
                <h3>Timeline</h3>
                {result.timeline.length > 0 ? (
                  <ul className="timeline-list">
                    {result.timeline.map((item, idx) => (
                      <li key={idx}>
                        <span className="period">{item.period}</span>
                        <span className="event">{item.event}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="empty">No timeline data.</p>
                )}
              </div>

              <div className="result-section">
                <h3>Connections</h3>
                {result.connections.length > 0 ? (
                  <ul className="connections-list">
                    {result.connections.map((item, idx) => (
                      <li key={idx}>
                        <span className="conn-type">{item.type}</span>
                        <span className="conn-name">{item.name}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="empty">No connections.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}

export default App
