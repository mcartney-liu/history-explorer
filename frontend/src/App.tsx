import { useState, useEffect } from 'react'
import SearchBox from './components/SearchBox'
import EntitySearchBox from './components/EntitySearchBox'
import SummaryPanel from './components/SummaryPanel'
import MainEntityCard, { MainEntity } from './components/MainEntityCard'
import RelatedEntityList, { RelatedEntity } from './components/RelatedEntityList'
import RelationshipView from './components/RelationshipView'
import TimelinePanel, { TimelineItem } from './components/TimelinePanel'
import ConnectionsPanel, { ConnectionItem } from './components/ConnectionsPanel'
import ConnectionsExplainedPanel from './components/ConnectionsExplainedPanel'
import ExplorationPathsPanel from './components/ExplorationPathsPanel'
import ThemesPanel from './components/ThemesPanel'
import InterpretationPanel from './components/InterpretationPanel'
import TemporalComparisonPanel from './components/TemporalComparisonPanel'
import MultiEntityTimeline from './components/MultiEntityTimeline'
import CrossTopicTopicList from './components/CrossTopicTopicList'
import CrossTopicConnectionsPanel from './components/CrossTopicConnectionsPanel'
import ContinueExploringPanel from './components/ContinueExploringPanel'
import RecommendationPanel from './components/RecommendationPanel'
import ExplorationTrail from './components/ExplorationTrail'
import ExplorationJourney from './components/ExplorationJourney'
import type { JourneyWhyPayload } from './components/ExplorationJourney'
import ExplorationPathTree from './components/ExplorationPathTree'
import { loadPath, savePath, loadReasons, saveReasons } from './utils/explorationPersistence'
import TopicComparisonPanel from './components/TopicComparisonPanel'
import { RelatedTopic, CrossTopicRelated } from './components/crossTopic'
import SearchResults, {
  SearchResultItem,
  orderSearchResults,
  resolveSearchResultTarget,
} from './components/SearchResults'
import EntityPage, { EntityDetail, EntityRelationship } from './components/EntityPage'
import { ConnectionExplained } from './components/ConnectionsExplainedPanel'
import { nextSelectionIndex } from './components/searchNav'
import {
  NavNode,
  pushHistory,
  canBack,
  canForward,
  backCursor,
  forwardCursor,
  crumbCursor,
  buildBreadcrumb,
} from './components/navigation'
import { loadRecent, pushRecent, saveRecent } from './components/recentStore'
import Breadcrumb from './components/Breadcrumb'
import HistoryBar from './components/HistoryBar'
import LoadingSkeleton from './components/LoadingSkeleton'
import ErrorCard, { ErrorKind } from './components/ErrorCard'
import LandingPage, { TopicSummary } from './components/LandingPage'
import FirstExplorationGuide from './components/FirstExplorationGuide'
import { resolveStarters, resolveEntityStarters } from './data/explorationStarters'
import { toInterpretationViewModels } from './data/interpretationFormatter'
import { buildUnderstandingsFromConnectionsExplained } from './data/understandingRules'
import { buildEntityTimeMap } from './data/temporalUtils'

// Backend base URL is externalized via Vite env (config, M3-002). Falls back
// to the local dev backend when VITE_API_BASE is unset, so behavior is unchanged.
const API_BASE: string = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

// M5-A-3: curated "start here" topics. Editorially chosen, REAL slugs only
// (must match the backend topic registry — see JsonTopicRepository.list_topics
// over data/examples/*_example.json). This is purely frontend curation; the
// underlying data is still fetched from GET /topics. Slugs absent from the
// catalog are dropped at render time, so the list stays safe if a topic is
// later renamed or removed.
const FEATURED_SLUGS = [
  'roman_empire',
  'greek_philosophy',
  'persian_empire',
  'ancient_india',
]

type ExplorationResult = {
  topic: string
  title: string
  summary: string
  entities: MainEntity[]
  timeline: TimelineItem[]
  connections: ConnectionItem[]
  connections_explained?: ConnectionExplained[]
  relationships?: EntityRelationship[]
  related_topics?: RelatedTopic[]
  exploration: {
    main_entity: MainEntity
    related_entities: RelatedEntity[]
    cross_topic_related?: CrossTopicRelated[]
  }
}

function prettifyTopic(t: string): string {
  return t
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function App() {
  const [topic, setTopic] = useState('')
  const [result, setResult] = useState<ExplorationResult | null>(null)
  const [error, setError] = useState('') // topic-input validation only
  const [loading, setLoading] = useState(false)

  // M2-002: cross-dataset entity search.
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResultItem[] | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [searchSelected, setSearchSelected] = useState(-1)

  // M2-002: entity detail page (GET /entity/{id}).
  const [entityData, setEntityData] = useState<EntityDetail | null>(null)

  // M2-003: own exploration history (not the browser URL). The history stack
  // plus a cursor power back/forward; the derived `current` node drives what
  // we render. Recent explorations persist to localStorage.
  const [history, setHistory] = useState<NavNode[]>([])
  const [cursor, setCursor] = useState(-1)
  const [recent, setRecent] = useState<NavNode[]>([])
  const [errorKind, setErrorKind] = useState<ErrorKind | ''>('')

  // M9-003: per-target "why this node was suggested" annotations, captured when
  // the user follows a recommendation. This is an ANNOTATION map (gid ->
  // JourneyWhyPayload), NOT a navigation stack — it never enters navigation.ts
  // or pushHistory. Session-scoped: lost on refresh (see goHome reset below).
  const [journeyReasons, setJourneyReasons] = useState<Map<string, JourneyWhyPayload>>(new Map())

  // Load persisted recent explorations once on mount.
  useEffect(() => {
    setRecent(loadRecent())
  }, [])

  // M10-1: restore the persisted exploration trail (history + cursor +
  // journeyReasons) once on mount so a refresh resumes the user's path.
  // Single navigation truth stays in App (history/cursor/journeyReasons);
  // the persistence adapter only reads storage — no second state source.
  useEffect(() => {
    const p = loadPath()
    if (p && p.history.length > 0) {
      setHistory(p.history)
      setCursor(p.cursor)
      fetchNode(p.history[p.cursor], p.cursor)
    }
    const r = loadReasons()
    if (r) setJourneyReasons(r)
    // fetchNode is intentionally excluded: mount-only restore, not a reactive dep.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // M5-A-2: load the topic catalog from GET /topics to power the curated
  // landing page. Pure I/O; all loading / error state stays in App so the
  // LandingPage component stays presentational (and reusable / testable).
  const [topics, setTopics] = useState<TopicSummary[]>([])
  const [topicsLoading, setTopicsLoading] = useState(true)
  const [topicsError, setTopicsError] = useState<ErrorKind | ''>('')

  // M5-A-3: derive the curated "start here" subset from the loaded catalog.
  // No extra fetch / API / state — purely a filtered, order-preserving view of
  // `topics` keyed by FEATURED_SLUGS. Empty until the catalog loads.
  const featuredTopics: TopicSummary[] = FEATURED_SLUGS.map(
    (slug) => topics.find((t) => t.topic === slug),
  ).filter((t): t is TopicSummary => Boolean(t))

  useEffect(() => {
    const controller = new AbortController()
    setTopicsLoading(true)
    setTopicsError('')
    fetch(`${API_BASE}/topics`, { signal: controller.signal })
      .then((resp) => {
        if (!resp.ok) throw new Error(`status:${resp.status}`)
        return resp.json()
      })
      .then((data: { topics?: unknown }) => {
        setTopics(Array.isArray(data?.topics) ? (data.topics as TopicSummary[]) : [])
      })
      .catch(() => {
        if (controller.signal.aborted) return
        setTopicsError('network')
      })
      .finally(() => {
        if (!controller.signal.aborted) setTopicsLoading(false)
      })
    return () => {
      controller.abort()
    }
  }, [])

  const current: NavNode | null =
    cursor >= 0 && cursor < history.length ? history[cursor] : null

  // Fetch a node's data and update view state. Pure I/O; history navigation
  // decides *which* node, this decides *how* to load it.
  async function fetchNode(node: NavNode, targetCursor: number) {
    setLoading(true)
    setErrorKind('')
    setSearchResults(null)
    try {
      let data: unknown
      if (node.type === 'topic') {
        const resp = await fetch(`${API_BASE}/explore/${encodeURIComponent(node.topic)}`)
        if (!resp.ok) throw new Error(`status:${resp.status}`)
        data = await resp.json()
        setResult(data as ExplorationResult)
        setEntityData(null)
        // Refine the breadcrumb label with the real title.
        setHistory((h) =>
          h.map((n, i) => (i === targetCursor && n.type === 'topic' ? { ...n, title: (data as ExplorationResult).title } : n)),
        )
      } else {
        const resp = await fetch(`${API_BASE}/entity/${encodeURIComponent(node.id)}`)
        if (!resp.ok) throw new Error(`status:${resp.status}`)
        data = await resp.json()
        setEntityData(data as EntityDetail)
        setResult(null)
        setHistory((h) =>
          h.map((n, i) => (i === targetCursor && n.type === 'entity' ? { ...n, name: (data as EntityDetail).name } : n)),
        )
      }
      setRecent((r) => pushRecent(r, node))
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      const status = msg.includes(':') ? msg.split(':')[1] : ''
      setErrorKind(status === '404' ? 'notfound' : 'network')
      setResult(null)
      setEntityData(null)
    } finally {
      setLoading(false)
    }
  }

  // Push a node onto the history and load it.
  function navigateTo(node: NavNode) {
    const { history: h, cursor: c } = pushHistory(history, cursor, node)
    setHistory(h)
    setCursor(c)
    savePath(h, c)
    fetchNode(node, c)
  }

  // Open an entity by id (with a display name for the breadcrumb).
  function openEntity(id: string, name?: string) {
    navigateTo({ type: 'entity', id, name: name || id })
  }

  function goTo(newCursor: number) {
    if (newCursor < 0 || newCursor >= history.length) return
    setCursor(newCursor)
    savePath(history, newCursor)
    fetchNode(history[newCursor], newCursor)
  }

  function goBack() {
    if (canBack(cursor)) goTo(backCursor(cursor))
  }

  function goForward() {
    if (canForward(cursor, history.length)) goTo(forwardCursor(cursor, history.length))
  }

  function goHome() {
    setHistory([])
    setCursor(-1)
    setResult(null)
    setEntityData(null)
    setSearchResults(null)
    setErrorKind('')
    // Reset journey annotations with the exploration — they are session-scoped
    // and only meaningful within a single continuous exploration.
    setJourneyReasons(new Map())
    savePath([], -1)
    saveReasons(new Map())
    setLoading(false)
  }

  function onCrumbClick(index: number) {
    if (index <= 0) {
      goHome()
      return
    }
    goTo(crumbCursor(index))
  }

  function handleExplore(topicValue?: string) {
    const trimmed = (topicValue ?? topic).trim()
    if (!trimmed) {
      setError('Please enter a historical topic.')
      return
    }
    setError('')
    navigateTo({ type: 'topic', topic: trimmed, title: prettifyTopic(trimmed) })
  }

  // M5-A-2: a catalog topic click reuses the existing exploration flow.
  // Same node shape as SearchResults / CrossTopicTopicList topic clicks, so
  // there is exactly one navigation path (navigateTo) — no duplicated logic,
  // no second navigation mechanism.
  function handleTopicClick(t: string) {
    navigateTo({ type: 'topic', topic: t, title: prettifyTopic(t) })
  }

  function clearRecent() {
    setRecent([])
    saveRecent([])
  }

  async function handleSearch(q: string) {
    setSearchQuery(q)
    setSearchError('')
    setSearchLoading(true)
    setSearchSelected(-1)
    // A fresh search replaces any open entity page / explore result, but keeps
    // the history (the user can still go Back to where they were).
    setEntityData(null)
    setResult(null)

    try {
      const response = await fetch(`${API_BASE}/search?q=${encodeURIComponent(q)}`)
      if (!response.ok) {
        throw new Error(`Search failed (${response.status})`)
      }
      const data = await response.json()
      setSearchResults(data.results as SearchResultItem[])
    } catch (err) {
      setSearchError('Unable to search. Is the backend running?')
      setSearchResults([])
    } finally {
      setSearchLoading(false)
    }
  }

  function handleResultSelect(item: SearchResultItem) {
    const target = resolveSearchResultTarget(item)
    if (!target) return
    if (target.kind === 'topic') {
      navigateTo({
        type: 'topic',
        topic: target.topic,
        title: item.name || prettifyTopic(target.topic),
      })
    } else {
      openEntity(target.id, item.name)
    }
  }

  // M4-004: the unified list is rendered Topics-first, so keyboard navigation
  // must index against the same ordered view the UI renders.
  const orderedSearchResults = orderSearchResults(searchResults)

  // M2-002.5 keyboard navigation handlers (wired to the search box).
  function handleSearchNav(direction: 'up' | 'down') {
    if (orderedSearchResults.length === 0) return
    setSearchSelected((cur) =>
      nextSelectionIndex(
        cur,
        direction === 'down' ? 1 : -1,
        orderedSearchResults.length,
      ),
    )
  }

  function handleSearchEnterSelect() {
    if (orderedSearchResults.length === 0) return
    const idx = searchSelected >= 0 ? searchSelected : 0
    handleResultSelect(orderedSearchResults[idx])
  }

  function handleSearchEscape() {
    clearSearch()
    setSearchSelected(-1)
  }

  function clearSearch() {
    setSearchResults(null)
    setSearchQuery('')
    setSearchSelected(-1)
  }

  // Name lookups for the active exploration, so relationships / related
  // entities / timeline events can resolve and navigate to the right entity.
  const exploreNameById: Record<string, string> = result
    ? Object.fromEntries(result.entities.map((e) => [e.id, e.name]))
    : {}
  const exploreNameToId: Record<string, string> = result
    ? Object.fromEntries(result.entities.map((e) => [e.name, e.id]))
    : {}
  const entityNameById: Record<string, string> = entityData
    ? Object.fromEntries(entityData.relationships.map((r) => [r.other.id, r.other.name]))
    : {}

  // M3.5-004 cross-topic clickable (entity page): map each related entity's
  // local id to its cross-topic global_id ("topic:localid") when the backend
  // supplied one, so clicking a chip can open an entity from another topic.
  const entityGlobalIdById: Record<string, string> = entityData
    ? Object.fromEntries(
        entityData.relationships
          .filter((r) => r.other?.global_id || r.other?.topic)
          .map((r) => [
            r.other.id,
            r.other.global_id ?? `${r.other.topic}:${r.other.id}`,
          ]),
      )
    : {}

  // M3.5-004 cross-topic clickable (explore page): the explore result's
  // relationships are RAW {source, target, type} with no `other`, so the owning
  // topic comes from the main entity's global_id (falling back to result.topic).
  const exploreTopic: string =
    result?.exploration?.main_entity?.global_id?.split(':')[0] || result?.topic || ''

  // M3.5-004 (explore page): the raw `result.relationships` have no `other`, so
  // we project the main entity's direct neighbors (exploration.related_entities)
  // into EntityRelationship[] for the Themes panel, resolving names + global_ids
  // from the entity list. Each node already gets a full global_id so the new
  // panels pass it through WITHOUT re-prefixing (the legacy onEntityClick below
  // still prefixes local ids into `${exploreTopic}:${id}`).
  const exploreEntityGlobalById: Record<string, string> = result
    ? Object.fromEntries(
        result.entities.map((e) => [e.id, e.global_id ?? `${exploreTopic}:${e.id}`]),
      )
    : {}
  const exploreThemesRelationships: EntityRelationship[] = result
    ? result.exploration.related_entities.map((re) => ({
        type: re.relationship,
        source: result.exploration.main_entity.id,
        target: re.id,
        direction: 'outgoing',
        other: {
          id: re.id,
          name: exploreNameById[re.id] ?? re.id,
          type: re.type,
          global_id: exploreEntityGlobalById[re.id],
          topic: exploreEntityGlobalById[re.id]
            ? exploreEntityGlobalById[re.id].split(':')[0]
            : undefined,
        },
      }))
    : []

  // M6-P1 (Temporal Context Injection, explore path): build a name -> date-range
  // map from the current topic's entities. The backend returns the full entity
  // objects at runtime (including start_date/end_date), which the relationships
  // builder consumes via the target-name key. Pure frontend; no new API field.
  const exploreEntityTimeByName: Record<string, string> = result
    ? buildEntityTimeMap(result.entities)
    : {}

  const crumbs = buildBreadcrumb(history, cursor)

  // M5-B-1: global ids the user has already visited, derived from the recent
  // explorations list. Entity nodes carry a global_id in `.id` (that is what
  // openEntity is always called with), so this set lets the "Continue
  // Exploring" panel weakly mark already-seen next steps — WITHOUT reordering.
  const seenGlobalIds = new Set(
    recent.filter((n) => n.type === 'entity').map((n) => (n as { id: string }).id),
  )

  return (
    <main className="app">
      <section className="hero">
        <h1 className="title">History Explorer</h1>
        <p className="tagline">Explore History. Discover Civilization.</p>
        <p className="description">
          A data-driven global history exploration platform.
        </p>

        <div className="explorer">
          <SearchBox
            topic={topic}
            loading={loading}
            error={error}
            onTopicChange={setTopic}
            onExplore={handleExplore}
          />

          <EntitySearchBox
            onSearch={handleSearch}
            loading={searchLoading}
            error={searchError}
            resultsActive={!!searchResults && searchResults.length > 0}
            onArrow={handleSearchNav}
            onEnterSelect={handleSearchEnterSelect}
            onEscape={handleSearchEscape}
          />

          {searchResults && (
            <SearchResults
              query={searchQuery}
              results={orderedSearchResults}
              onSelectItem={handleResultSelect}
              onClear={clearSearch}
              selectedIndex={searchSelected}
            />
          )}

          {current && (
            <>
              <Breadcrumb crumbs={crumbs} onCrumbClick={onCrumbClick} />
              <HistoryBar
                canBack={canBack(cursor)}
                canForward={canForward(cursor, history.length)}
                onBack={goBack}
                onForward={goForward}
              />
              <ExplorationTrail history={history} cursor={cursor} onStepClick={goTo} />
              <ExplorationPathTree
                history={history}
                cursor={cursor}
                journeyReasons={journeyReasons}
                onStepClick={goTo}
              />
            </>
          )}

          {loading && (
            <LoadingSkeleton
              label={current?.type === 'entity' ? 'Loading entity…' : 'Loading exploration…'}
            />
          )}

          {!loading && errorKind && (
            <ErrorCard
              kind={errorKind}
              onRetry={current ? () => fetchNode(current, cursor) : undefined}
            />
          )}

          {!loading && !errorKind && current?.type === 'topic' && result && (
            <div className="result">
              <SummaryPanel title={result.title} summary={result.summary} />
              <FirstExplorationGuide
                topic={current.topic}
                title={result.title}
                starters={resolveStarters(current.topic)}
                onStarterClick={(t) => navigateTo(t)}
              />
              <MainEntityCard mainEntity={result.exploration.main_entity} />
              <RelationshipView
                mainEntity={result.exploration.main_entity}
                relatedEntities={result.exploration.related_entities}
                nameById={exploreNameById}
                onEntityClick={(id) => openEntity(`${exploreTopic}:${id}`, exploreNameById[id])}
              />
              <CrossTopicConnectionsPanel
                connections={result.exploration.cross_topic_related}
                onEntityClick={(gid) => openEntity(gid)}
              />
              <CrossTopicTopicList
                relatedTopics={result.related_topics}
                onTopicClick={(topic) => navigateTo({ type: 'topic', topic, title: prettifyTopic(topic) })}
              />
              <RelatedEntityList
                relatedEntities={result.exploration.related_entities}
                nameById={exploreNameById}
                mainEntityName={result.exploration.main_entity.name}
                onEntityClick={(id) => openEntity(`${exploreTopic}:${id}`, exploreNameById[id])}
              />
              <TimelinePanel
                timeline={result.timeline}
                nameToId={exploreNameToId}
                onEventClick={(id) => openEntity(id, exploreNameById[id])}
              />
              <TemporalComparisonPanel entities={result.entities} />
              <MultiEntityTimeline entities={result.entities} />
              <ConnectionsPanel connections={result.connections} />
              <ConnectionsExplainedPanel connections={result.connections_explained} />
              <InterpretationPanel
                interpretations={toInterpretationViewModels(result.connections_explained)}
                understandings={buildUnderstandingsFromConnectionsExplained(
                  result.connections_explained,
                  result.exploration.main_entity.name,
                  Object.fromEntries(
                    (result.entities ?? []).map((e) => [
                      e.global_id ?? exploreEntityGlobalById[e.id] ?? `${exploreTopic}:${e.id}`,
                      e.name,
                    ]),
                  ),
                  exploreEntityTimeByName,
                )}
                onNodeClick={(gid) =>
                  openEntity(gid, exploreNameById[gid.split(':').pop() ?? gid] ?? gid)
                }
              />
              <ExplorationPathsPanel
                connections={result.connections_explained}
                onNodeClick={(gid) =>
                  openEntity(gid, exploreNameById[gid.split(':').pop() ?? gid] ?? gid)
                }
              />
              <ThemesPanel
                relationships={exploreThemesRelationships}
                onNodeClick={(gid) =>
                  openEntity(gid, exploreNameById[gid.split(':').pop() ?? gid] ?? gid)
                }
              />
              <ContinueExploringPanel
                connections={result.connections_explained}
                crossTopicRelated={result.exploration.cross_topic_related}
                relatedTopics={result.related_topics}
                seenGlobalIds={seenGlobalIds}
                onNodeClick={(gid) =>
                  openEntity(gid, exploreNameById[gid.split(':').pop() ?? gid] ?? gid)
                }
                onTopicClick={(t) => navigateTo({ type: 'topic', topic: t, title: prettifyTopic(t) })}
              />
              <TopicComparisonPanel
                key={result?.topic ?? current.topic}
                crossTopicRelated={result.exploration.cross_topic_related}
                onNodeClick={(gid) =>
                  openEntity(gid, gid.includes(':') ? gid.split(':').slice(1).join(':') : gid)
                }
                onTopicClick={(t) => navigateTo({ type: 'topic', topic: t, title: prettifyTopic(t) })}
              />
            </div>
          )}

          {!loading && !errorKind && current?.type === 'entity' && entityData && (
            <>
              <EntityPage
                entity={entityData}
                entityId={current.id}
                entityName={entityData.name}
                entityStarters={resolveEntityStarters(current.id)}
                onStarterClick={(t) => navigateTo(t)}
                onEntityClick={(id) => openEntity(entityGlobalIdById[id] ?? id, entityNameById[id])}
                onNodeClick={(gid) =>
                  openEntity(gid, gid.includes(':') ? gid.split(':').slice(1).join(':') : gid)
                }
                onTopicClick={(topic) => navigateTo({ type: 'topic', topic, title: prettifyTopic(topic) })}
              />
              <ExplorationJourney
                history={history}
                cursor={cursor}
                journeyReasons={journeyReasons}
                onStepClick={goTo}
              />
              <RecommendationPanel
                entityId={current.id}
                seenGlobalIds={seenGlobalIds}
                max={5}
                onNodeClick={(gid, ctx) => {
                  // Capture the "why" only when the click came from a
                  // recommendation (ctx present). Direct navigation leaves the
                  // annotation null. This never creates navigation state — it
                  // only enriches the Journey view via the journeyReasons map.
                  if (ctx) {
                    setJourneyReasons((prev) => {
                      const next = new Map(prev)
                      next.set(gid, {
                        fromGlobalId: current.id,
                        fromName: entityData?.name ?? current.id,
                        relationPath: ctx.relation_path,
                        reasons: ctx.reasons,
                        score: ctx.score,
                        candidateSource: ctx.candidateSource,
                        capturedAt: new Date().toISOString(),
                      })
                      // Persist the annotation so the arrival reason survives a
                      // refresh. Idempotent write (adapter swallows quota errors).
                      saveReasons(next)
                      return next
                    })
                  }
                  openEntity(gid, gid.includes(':') ? gid.split(':').slice(1).join(':') : gid)
                }}
              />
              <ContinueExploringPanel
                connections={entityData.connections_explained}
                relatedTopics={entityData.related_topics}
                seenGlobalIds={seenGlobalIds}
                onNodeClick={(gid) =>
                  openEntity(gid, gid.includes(':') ? gid.split(':').slice(1).join(':') : gid)
                }
                onTopicClick={(topic) => navigateTo({ type: 'topic', topic, title: prettifyTopic(topic) })}
              />
            </>
          )}

          {!current && (
            <LandingPage
              topics={topics}
              loading={topicsLoading}
              error={topicsError}
              onTopicClick={handleTopicClick}
              featured={featuredTopics}
              recent={recent}
              onRecentSelect={navigateTo}
              onRecentClear={clearRecent}
            />
          )}
        </div>
      </section>
    </main>
  )
}

export default App
