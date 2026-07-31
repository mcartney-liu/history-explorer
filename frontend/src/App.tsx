import { useState, useEffect, useMemo } from 'react'
import SearchBox from './components/SearchBox'
import EntitySearchBox from './components/EntitySearchBox'
import SummaryPanel from './components/SummaryPanel'
import MainEntityCard, { MainEntity } from './components/MainEntityCard'
import RelatedEntityList, { RelatedEntity } from './components/RelatedEntityList'
import RelationshipView from './components/RelationshipView'
import TimelinePanel, { TimelineItem } from './components/TimelinePanel'
import type { ConnectionItem } from './components/ConnectionsPanel'
import ThemesPanel from './components/ThemesPanel'
import InterpretationPanel from './components/InterpretationPanel'
import TemporalComparisonPanel from './components/TemporalComparisonPanel'
import MultiEntityTimeline from './components/MultiEntityTimeline'
import CrossTopicView from './components/CrossTopicView'
import ContinueExploringPanel from './components/ContinueExploringPanel'
import RecommendationPanel from './components/RecommendationPanel'
import AIExplanationPanel from './components/AIExplanationPanel'
import MultiEntityContextPanel from './components/MultiEntityContextPanel'
import EntityPickerPanel from './components/EntityPickerPanel'
import type { Candidate } from './data/candidateUtils'
import ExplorationPath from './components/ExplorationPath'
import type { JourneyWhyPayload } from './components/ExplorationJourney'
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
import { getEvents, recordEvent } from './data/UserBehaviorEvent'
import { analyzeProductUsage } from './data/ProductUsageAnalysis'
import type { ExplorationContextIntelligence } from './components/ai/CompanionContext'
import HistoryBar from './components/HistoryBar'
import LoadingSkeleton from './components/LoadingSkeleton'
import ErrorCard, { ErrorKind } from './components/ErrorCard'
import LandingPage, { TopicSummary } from './components/LandingPage'
import FirstExplorationGuide from './components/FirstExplorationGuide'
import { resolveStarters, resolveEntityStarters } from './data/explorationStarters'
import { resolveNarrativeKey } from './data/narrative'
import { toInterpretationViewModels } from './data/interpretationFormatter'
import { buildUnderstandingsFromConnectionsExplained } from './data/understandingRules'
import { buildEntityTimeMap } from './data/temporalUtils'
import { ExplorationShell } from './components/shell/ExplorationShell'
import { CompanionShell } from './components/ai/CompanionShell'
import RelationshipContext from './components/RelationshipContext'
import { WorkspacePanel, type WorkspaceItem } from './components/workspace/WorkspacePanel'
import DevCatalog from './pages/DevCatalog'
import GraphViewPanel from './components/GraphViewPanel'
import StorySection from './components/exploration/StorySection'
import WhyImportantPanel from './components/exploration/WhyImportantPanel'
import DiscoverPage from './pages/DiscoverPage'
import { addJourneyEntry, entryFromNode, type JourneyEntry } from './lib/journey'
import FeedbackWidget from './components/FeedbackWidget'

// M69 — Exploration Package page
import ExplorationPackagePage from './pages/ExplorationPackagePage'

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

  // M14: candidates hand-picked in the cross-topic EntityPickerPanel. This is a
  // plain selection list (name/type/topic + gid), NOT AI state — the grounded
  // reasoning selection still lives locally inside MultiEntityContextPanel.
  const [pickedCandidates, setPickedCandidates] = useState<Candidate[]>([])

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

  // M10-2: cross-panel FOCUS — a lightweight, session-scoped highlight that
  // links the Relationship / Timeline / Cross-Topic panels around one entity.
  // Deliberately VIEW STATE only: it lives in this useState alone, is a
  // global_id ("topic:localid"), and NEVER enters navigation.ts, history,
  // journeyReasons, or explorationPersistence/localStorage. It is cleared on
  // every navigation (fetchNode) and on goHome, so it never leaks across pages.
  const [focusedEntityId, setFocusedEntityId] = useState<string | null>(null)

  // M69 — Package page state (renders instead of Discover when set)
  const [packageSlug, setPackageSlug] = useState<string | null>(null)

  // M62 W3: relationship / timeline view toggles (no panel deletion — both
  // views stay reachable; only one renders at a time to cut panel density).
  const [relView, setRelView] = useState<'list' | 'spatial'>('list')
  const [timeView, setTimeView] = useState<'single' | 'multi'>('single')

  // M65 Phase 3A: controlled timeline strip index (click a dot → parent state flows back)
  const [selectedTimelineIndex, setSelectedTimelineIndex] = useState<number>(0)

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
    // M10-2: focus refers to entities on the page being left, so reset it on
    // every navigation. Keeps focus a per-page VIEW STATE that never leaks.
    setFocusedEntityId(null)
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
    // M35 Feature D: record every navigation in the journey trace (localStorage).
    // Single unified entry point => complete path coverage with no second mechanism.
    addJourneyEntry(entryFromNode(node))
    fetchNode(node, c)
  }

  // M35 Feature D: re-open a journey entry from the JourneyPanel.
  function handleJourneyClick(entry: JourneyEntry) {
    if (entry.kind === 'topic') {
      navigateTo({ type: 'topic', topic: entry.globalId, title: entry.label })
    } else {
      navigateTo({ type: 'entity', id: entry.globalId, name: entry.label })
    }
  }

  // Open an entity by id (with a display name for the breadcrumb).
  function openEntity(id: string, name?: string) {
    navigateTo({ type: 'entity', id, name: name || id })
  }

  // M65 Phase 3D-2: timeline dot → entity navigation. Reuses the exact resolve
  // chain that TimelinePanel's onEventClick uses (event name → local id →
  // openEntity), so the bottom strip and the TimelinePanel stay semantically
  // aligned. Dots whose event name does not match an entity stay inert — no
  // error, no navigation.
  function handleTimelineSelect(index: number) {
    setSelectedTimelineIndex(index)
    const item = result?.timeline?.[index]
    if (!item) return
    const localId = exploreNameToId[item.event]
    if (localId) {
      openEntity(localId, exploreNameById[localId] ?? item.event)
    }
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
    // M10-2: clear the cross-panel focus when leaving the exploration entirely.
    setFocusedEntityId(null)
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
    const raw = topicValue ?? topic
    const trimmed = typeof raw === 'string' ? raw.trim() : ''
    if (!trimmed) {
      setError('Please enter a historical topic.')
      return
    }
    // Backend TOPIC_PATTERN = ^[a-z0-9_-]+$ — reject non-ASCII early
    // so the user gets a clear message instead of a misleading 400 / "无法连通后端服务器".
    if (!/^[a-z0-9_-]+$/.test(trimmed)) {
      setError('请输入英文主题名（如 roman_empire、ancient_civilizations）。当前不支持中文搜索。')
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

  // M69 — Open an Exploration Package page (overlays Discover/home)
  function openPackage(slug: string) {
    recordEvent({ action: 'open_package' as any, entityType: slug })
    setPackageSlug(slug)
    if (typeof window !== 'undefined') {
      window.location.hash = `#/package/${encodeURIComponent(slug)}`
    }
  }

  function closePackage() {
    setPackageSlug(null)
    if (
      typeof window !== 'undefined' &&
      window.location.hash.startsWith('#/package/')
    ) {
      window.location.hash = ''
    }
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
      // M35.1: reconstruct the entity global_id (the /search response strips
      // global_id, leaving only topic + id) so StorySection / WhyImportantPanel
      // inside EntityPage can match the curated narrative.
      openEntity(resolveNarrativeKey(item), item.name)
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

  // M19: derive a global_id -> display name map so the RelationshipInsightPanel
  // can label target entities that are NOT in the candidate set (e.g. edges
  // pointing at entities outside the current selection). Pure frontend; built
  // only from already-fetched exploration metadata. No new API field.
  const exploreNameByGlobalId: Record<string, string> = result
    ? Object.fromEntries(
        Object.entries(exploreEntityGlobalById)
          .filter(([, gid]) => Boolean(gid))
          .map(([localId, gid]) => [gid, exploreNameById[localId] ?? gid]),
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

  // M12-1: grounded AI exploration context — built strictly from the existing
  // exploration graph (main entity + related entities' resolved global ids),
  // reusing the same exploreEntityGlobalById map as the rest of the topic view.
  // No new ids are invented; no business logic is added (Freeze Pack).
  const aiContextIds: string[] = result
    ? [
        result.exploration.main_entity.global_id,
        ...result.exploration.related_entities.map((re) => exploreEntityGlobalById[re.id]),
      ].filter((gid): gid is string => Boolean(gid))
    : []

  // M34-A1: single source of truth for the navigation-following callbacks that
  // were previously duplicated inline across the topic and entity views (TD-1).
  //   openNode      — cross-topic / entity-view nodes whose display name is
  //                   derived from the global id itself.
  //   openNodeNamed — topic-view panels that resolve a display name from the
  //                   current topic's entity map (exploreNameById).
  // Bodies are byte-for-byte identical to the inline arrows they replace, so
  // navigation behavior is unchanged.
  const openNode = (gid: string) =>
    openEntity(gid, gid.includes(':') ? gid.split(':').slice(1).join(':') : gid)
  const openNodeNamed = (gid: string) =>
    openEntity(gid, exploreNameById[gid.split(':').pop() ?? gid] ?? gid)

  const crumbs = buildBreadcrumb(history, cursor)

  // M5-B-1: global ids the user has already visited, derived from the recent
  // explorations list. Entity nodes carry a global_id in `.id` (that is what
  // openEntity is always called with), so this set lets the "Continue
  // Exploring" panel weakly mark already-seen next steps — WITHOUT reordering.
  const seenGlobalIds = new Set(
    recent.filter((n) => n.type === 'entity').map((n) => (n as { id: string }).id),
  )

  // M34-A1: the search cluster and the navigation cluster are hoisted into
  // AppShell slots. AppShell wraps the nav cluster in a semantic <nav
  // class="nav-shell"> (fixes TD-nav) and renders the same hero + .explorer
  // chrome the monolith rendered, so the smoke tests stay green.
  const searchSlot = (
    <>
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
    </>
  )

  const navSlot = current ? (
    <>
      <Breadcrumb crumbs={crumbs} onCrumbClick={onCrumbClick} />
      <HistoryBar
        canBack={canBack(cursor)}
        canForward={canForward(cursor, history.length)}
        onBack={goBack}
        onForward={goForward}
      />
      {/* M10-2 trail convergence: ExplorationPathTree is the single
          full-journey view here (it supersedes the earlier
          ExplorationTrail, which is retained but no longer rendered by
          default). ExplorationJourney still renders on the entity page. */}
      <ExplorationPath
        view="tree"
        history={history}
        cursor={cursor}
        journeyReasons={journeyReasons}
        onStepClick={goTo}
      />
    </>
  ) : undefined

  // M59-020: Workspace — build current + history from navigation stack
  const workspaceItems: WorkspaceItem[] = useMemo(() => {
    const items: WorkspaceItem[] = []
    if (current && result) {
      // NavNode is a discriminated union: `topic` lives on the topic branch,
      // `id` on the entity branch. The original `current.topic` read silently
      // worked at runtime (when the field was always present in the M2 era)
      // but the type guard makes the entity branch explicit.
      const fallbackName =
        current.type === 'entity' ? current.id : current.topic
      const title = result.title || (entityData?.name ?? fallbackName)
      items.push({
        id: current.type === 'entity' ? current.id : current.topic,
        title,
        subtitle: '',
        icon: current.type === 'entity' ? 'book' : 'globe',
      })
    }
    return items
  }, [current, result, entityData])

  // M59-020: Workspace history — from navigation stack
  const workspaceHistory: WorkspaceItem[] = useMemo(() => {
    return history
      .filter((n) => n.type === 'entity')
      .map((n) => ({
        id: n.id,
        title: n.name || n.id,
        subtitle: '',
        icon: 'book',
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      }))
      .reverse()
      .slice(0, 8)
  }, [history])

  // M66: read-only exploration context intelligence (narrow projection of
  // ProductDecisionInsight). Recomputed on exploration activity; safe because
  // the Companion panel is the only consumer. Falls back to null on any error.
  const [intelTick, setIntelTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setIntelTick((n) => n + 1), 20000)
    return () => clearInterval(t)
  }, [])
  const workspaceIntelligence = useMemo<ExplorationContextIntelligence | null>(() => {
    try {
      const analysis = analyzeProductUsage(getEvents())
      const di = analysis.decisionInsight
      const km = di.evidence.keyMetrics
      return {
        explorationDepth: typeof km.maxDepth === 'number' ? km.maxDepth : 0,
        explorationPattern: String(km.dominantPattern ?? 'unknown'),
        knowledgeCoverage: typeof km.entityCoverage === 'number' ? km.entityCoverage : 0,
        knowledgeConnectionAvailable: km.relationshipDataAvailable === 'yes',
        explorationActivityCount: typeof km.totalEvents === 'number' ? km.totalEvents : 0,
        evidenceCompleteness: typeof di.confidence === 'number' ? di.confidence : 0,
        evidenceQuality: typeof di.evidenceQuality === 'number' ? di.evidenceQuality : 0,
        explorationSignals: Array.isArray(di.counterSignals) ? di.counterSignals : [],
      }
    } catch {
      return null
    }
  }, [history.length, intelTick])

  // M65 Phase 3B: read-only workspace context for AI Companion
  // M65 Phase 3C-2: extended with entityType + multi-entity contextGlobalIds
  const workspaceContext = useMemo(() => ({
    currentEntityId: current?.type === 'entity' ? current.id : undefined,
    currentEntityName: current?.type === 'entity' ? current.name : current?.title,
    entityType: current?.type === 'entity' ? entityData?.type ?? null : null,
    contextGlobalIds: aiContextIds,
    recentEntityIds: workspaceHistory.map((h) => h.id),
    pinnedEntityIds: workspaceItems.map((w) => w.id),
    explorationPathLength: history.length,
    intelligence: workspaceIntelligence,
  }), [current, workspaceHistory, workspaceItems, history.length, entityData?.type, aiContextIds, workspaceIntelligence])

  // M59-021: Dev catalog route — hash-based, dev only
  if (typeof window !== 'undefined' && window.location.hash === '#/dev/catalog') {
    return <DevCatalog />
  }

  return (
    <ExplorationShell
      workspace={
        <WorkspacePanel
          current={workspaceItems[0] ?? null}
          history={workspaceHistory}
          onEntityClick={(id, name) => openEntity(id, name)}
        />
      }
      companion={<CompanionShell workspaceContext={workspaceContext} onNavigateEntity={openNode} />}
      timelineItems={result?.timeline}
      timelineActiveLabel={result?.title || (current?.type === 'entity' ? current.id : current?.title)}
      timelineActiveIndex={selectedTimelineIndex}
      onTimelineSelect={handleTimelineSelect}
    >
      {searchSlot}
      {navSlot}
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
              <section data-tier="narrative">
              <SummaryPanel title={result.title} summary={result.summary} />
              <FirstExplorationGuide
                topic={current.topic}
                title={result.title}
                starters={resolveStarters(current.topic)}
                onStarterClick={(t) => navigateTo(t)}
              />
              {/* M35.1: restore the curated narrative for the active topic.
                  StorySection / WhyImportantPanel render null when no copy
                  exists, so topics without curated narrative are unaffected. */}
              <StorySection narrativeKey={current.topic} />
              <WhyImportantPanel narrativeKey={current.topic} />
              <MainEntityCard mainEntity={result.exploration.main_entity} />
              </section>
              <section data-tier="interpretation">
              <div className="m62-view-toggle" role="group" aria-label="关系视图切换">
                <button
                  type="button"
                  className={relView === 'list' ? 'active' : ''}
                  aria-pressed={relView === 'list'}
                  onClick={() => setRelView('list')}
                >列表</button>
                <button
                  type="button"
                  className={relView === 'spatial' ? 'active' : ''}
                  aria-pressed={relView === 'spatial'}
                  onClick={() => setRelView('spatial')}
                >图谱</button>
              </div>
              {relView === 'list' ? (
              <RelationshipView
                mainEntity={result.exploration.main_entity}
                relatedEntities={result.exploration.related_entities}
                nameById={exploreNameById}
                onEntityClick={(id) => openEntity(`${exploreTopic}:${id}`, exploreNameById[id])}
                globalIdById={exploreEntityGlobalById}
                focusedId={focusedEntityId ?? undefined}
                onEntityFocus={(gid) => setFocusedEntityId(gid)}
              />
              ) : (
              <GraphViewPanel
                mainEntity={result.exploration.main_entity}
                relatedEntities={result.exploration.related_entities}
                nameById={exploreNameById}
                onEntityClick={(id) => openEntity(`${exploreTopic}:${id}`, exploreNameById[id])}
              />
              )}
              </section>
              <section data-tier="supporting">
              <CrossTopicView
                connections={result.exploration.cross_topic_related}
                relatedTopics={result.related_topics}
                focusedId={focusedEntityId ?? undefined}
                onEntityClick={(gid) => openEntity(gid)}
                onTopicClick={handleTopicClick}
              />
              <RelatedEntityList
                relatedEntities={result.exploration.related_entities}
                nameById={exploreNameById}
                mainEntityName={result.exploration.main_entity.name}
                onEntityClick={(id) => openEntity(`${exploreTopic}:${id}`, exploreNameById[id])}
              />
              <div className="m62-view-toggle" role="group" aria-label="时间线视图切换">
                <button
                  type="button"
                  className={timeView === 'single' ? 'active' : ''}
                  aria-pressed={timeView === 'single'}
                  onClick={() => setTimeView('single')}
                >单线</button>
                <button
                  type="button"
                  className={timeView === 'multi' ? 'active' : ''}
                  aria-pressed={timeView === 'multi'}
                  onClick={() => setTimeView('multi')}
                >多线</button>
              </div>
              {timeView === 'single' ? (
              <>
              <TimelinePanel
                timeline={result.timeline}
                nameToId={exploreNameToId}
                onEventClick={(id) => openEntity(id, exploreNameById[id])}
                globalIdById={exploreEntityGlobalById}
                focusedId={focusedEntityId ?? undefined}
              />
              <TemporalComparisonPanel entities={result.entities} />
              </>
              ) : (
              <MultiEntityTimeline entities={result.entities} />
              )}
              <RelationshipContext
                connections={result.connections}
                connectionsExplained={result.connections_explained}
                onNodeClick={openNodeNamed}
                candidates={pickedCandidates}
                relationships={exploreThemesRelationships}
                timeMap={exploreEntityTimeByName}
                mainGlobalId={exploreEntityGlobalById[result.exploration.main_entity.id]}
                mainEntityName={result.exploration.main_entity.name}
                nameByGlobalId={exploreNameByGlobalId}
              />
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
                onNodeClick={openNodeNamed}
              />
              <ThemesPanel
                relationships={exploreThemesRelationships}
                onNodeClick={openNodeNamed}
              />
              <ContinueExploringPanel
                connections={result.connections_explained}
                crossTopicRelated={result.exploration.cross_topic_related}
                relatedTopics={result.related_topics}
                seenGlobalIds={seenGlobalIds}
                onNodeClick={openNodeNamed}
                onTopicClick={handleTopicClick}
              />
              <TopicComparisonPanel
                key={result?.topic ?? current.topic}
                crossTopicRelated={result.exploration.cross_topic_related}
                onNodeClick={openNode}
                onTopicClick={handleTopicClick}
              />

              <AIExplanationPanel
                contextGlobalIds={aiContextIds}
                onCitationClick={(gid) => openEntity(gid)}
              />
              <EntityPickerPanel onCandidatesChange={setPickedCandidates} />
              <MultiEntityContextPanel
                candidates={pickedCandidates}
                candidateGids={Object.values(exploreEntityGlobalById)}
                onCitationClick={(gid) => openEntity(gid)}
              />
              </section>
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
                onNodeClick={openNode}
                onTopicClick={handleTopicClick}
              />
              <ExplorationPath
                view="journey"
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
                  openNode(gid)
                }}
              />
              <ContinueExploringPanel
                connections={entityData.connections_explained}
                relatedTopics={entityData.related_topics}
                seenGlobalIds={seenGlobalIds}
                onNodeClick={openNode}
                onTopicClick={handleTopicClick}
              />
            </>
          )}

          {!current && (
            packageSlug ? (
              <ExplorationPackagePage
                slug={packageSlug}
                onEntityClick={(gid) => openEntity(gid)}
                onOpenPackage={(s) => openPackage(s)}
                onBack={closePackage}
              />
            ) : (
            <>
            {/* M35: Discover experience — presentational; both callbacks reuse
                the single navigation truth (navigateTo via handleTopicClick). */}
            <DiscoverPage
              onTopicClick={handleTopicClick}
              onStarterClick={(t) => navigateTo(t)}
              onPackageClick={(s) => openPackage(s)}
            />
            <LandingPage
              topics={topics}
              loading={topicsLoading}
              error={topicsError}
              onTopicClick={handleTopicClick}
              featured={featuredTopics}
              recent={recent}
              onRecentSelect={navigateTo}
              onRecentClear={clearRecent}
              onQuickStart={(q) => {
                setTopic(q)
                // navigateTo requires a NavNode (topic | entity). The
                // quick-start is a topic search; wrap the string into the
                // topic branch with the query itself as the title.
                navigateTo({ type: 'topic', topic: q, title: q })
              }}
            />
            {/* M35 Feature D: exploration journey trace — localStorage only,
                reuses the single navigateTo entry via handleJourneyClick. */}
            <ExplorationPath view="panel" onNavigate={handleJourneyClick} />
            {/* M35 Feature E: lightweight feedback — localStorage only, no API. */}
            <FeedbackWidget page="discover" />
            </>
          ))}
    </ExplorationShell>
  )
}

export default App
