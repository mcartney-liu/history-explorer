import { useState } from 'react'
import SearchBox from './components/SearchBox'
import SummaryPanel from './components/SummaryPanel'
import MainEntityCard, { MainEntity } from './components/MainEntityCard'
import RelatedEntityList, { RelatedEntity } from './components/RelatedEntityList'
import RelationshipView from './components/RelationshipView'
import TimelinePanel, { TimelineItem } from './components/TimelinePanel'
import ConnectionsPanel, { ConnectionItem } from './components/ConnectionsPanel'

const API_BASE = 'http://localhost:8000'

type ExplorationResult = {
  topic: string
  title: string
  summary: string
  // Full entity list is already provided by the existing API response.
  // We now consume it (no API change) to resolve related-entity names.
  entities: MainEntity[]
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
          <SearchBox
            topic={topic}
            loading={loading}
            error={error}
            onTopicChange={setTopic}
            onExplore={handleExplore}
          />

          {result && (
            <div className="result">
              <SummaryPanel title={result.title} summary={result.summary} />
              <MainEntityCard mainEntity={result.exploration.main_entity} />
              <RelationshipView
                mainEntity={result.exploration.main_entity}
                relatedEntities={result.exploration.related_entities}
                nameById={Object.fromEntries(
                  (result.entities ?? []).map((e) => [e.id, e.name]),
                )}
              />
              <RelatedEntityList
                relatedEntities={result.exploration.related_entities}
                nameById={Object.fromEntries(
                  (result.entities ?? []).map((e) => [e.id, e.name]),
                )}
                mainEntityName={result.exploration.main_entity.name}
              />
              <TimelinePanel timeline={result.timeline} />
              <ConnectionsPanel connections={result.connections} />
            </div>
          )}
        </div>
      </section>
    </main>
  )
}

export default App
