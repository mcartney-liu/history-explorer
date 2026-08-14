import { useState, useEffect, useMemo } from 'react'
import { useNavigationHistory } from './hooks/useNavigationHistory'
import { usePackageContext } from './hooks/usePackageContext'
import SummaryPanel from './components/SummaryPanel'
import MainEntityCard, { MainEntity } from './components/MainEntityCard'
import RelatedEntityList, { RelatedEntity } from './components/RelatedEntityList'
import RelationshipView from './components/RelationshipView'
import TimelinePanel, { TimelineItem } from './components/TimelinePanel'
import type { ConnectionItem } from './components/ConnectionsPanel'
import ThemesPanel from './components/ThemesPanel'
import DisputesPanel from './components/DisputesPanel'
import InterpretationPanel from './components/InterpretationPanel'
import TemporalComparisonPanel from './components/TemporalComparisonPanel'
import MultiEntityTimeline from './components/MultiEntityTimeline'
import CrossTopicView from './components/CrossTopicView'
import ContinueExploringPanel from './components/ContinueExploringPanel'
import NextStepPanel from './components/NextStepPanel'
import AIExplanationPanel from './components/AIExplanationPanel'
import MultiEntityContextPanel from './components/MultiEntityContextPanel'
import EntityPickerPanel from './components/EntityPickerPanel'
import type { Candidate } from './data/candidateUtils'
import ExplorationPath from './components/ExplorationPath'
import type { JourneyWhyPayload } from './components/ExplorationJourney'
import { loadReasons, saveReasons } from './utils/explorationPersistence'
import TopicComparisonPanel from './components/TopicComparisonPanel'
import { RelatedTopic, CrossTopicRelated } from './components/crossTopic'
import type { SearchResultItem } from './components/SearchResults'
import EntityPage, { EntityDetail, EntityRelationship } from './components/EntityPage'
import { ConnectionExplained } from './components/ConnectionsExplainedPanel'
import {
  NavNode,
  canBack,
  canForward,
} from './components/navigation'
import { loadRecent, pushRecent } from './components/recentStore'
import Breadcrumb from './components/Breadcrumb'
import { getEvents, recordEvent } from './data/UserBehaviorEvent'
import { analyzeProductUsage } from './data/ProductUsageAnalysis'
import type { ExplorationContextIntelligence } from './components/ai/CompanionContext'
import LoadingSkeleton from './components/LoadingSkeleton'
import ErrorCard, { ErrorKind } from './components/ErrorCard'
import { useSiteConfigRevision } from './data/siteConfig'
import LandingPage, { TopicSummary } from './components/LandingPage'
import TopicExploreStarters from './components/TopicExploreStarters'
import { resolveEntityStarters } from './data/explorationStarters'
import { toInterpretationViewModels } from './data/interpretationFormatter'
import { buildUnderstandingsFromConnectionsExplained } from './data/understandingRules'
import { useLocale } from './data/locale'
import { resolveEntryQuery } from './data/topicResolver'
import { ExplorerShell } from './components/shell/ExplorerShell'
import { GlobalBar } from './components/shell/GlobalBar'
import { QuestionHeader } from './components/shell/QuestionHeader'
import { ModeBar } from './components/shell/ModeBar'
import { LandingTabs } from './components/shell/LandingTabs'
import { ProductIntro } from './components/shell/ProductIntro'
import { UnderstandingStatus } from './components/shell/UnderstandingStatus'
import { MirrorPanel } from './components/shell/MirrorPanel'
import { ModeCanvas } from './components/shell/ModeCanvas'
import { UnderstandingCanvas } from './components/shell/UnderstandingCanvas'
import { UnderstandingOverview } from './components/shell/UnderstandingOverview'
import { UnderstandingActions } from './components/shell/UnderstandingActions'
import { UnderstandingWorkspace } from './pages/m89/UnderstandingWorkspace'
import { hasUnderstandingData } from './next/exploration/topicUnderstandingState'
import { CompanionShell } from './components/ai/CompanionShell'
import RelationshipContext from './components/RelationshipContext'
import { WorkspacePanel, type WorkspaceItem } from './components/workspace/WorkspacePanel'
import { getCausalObjectName } from './data/causalObjectNames'
import GraphViewPanel from './components/GraphViewPanel'
import StorySection from './components/exploration/StorySection'
import WhyImportantPanel from './components/exploration/WhyImportantPanel'
import DiscoverPage from './pages/DiscoverPage'
import { MyExplorationPanel } from './components/discover/MyExplorationPanel'
import { addJourneyEntry, entryFromNode } from './lib/journey'
import FeedbackWidget from './components/FeedbackWidget'

// M86.1 — Explorer Runtime Context（Experience Runtime 单一语义核心）
import { ExplorerRuntimeContext } from './next/ExplorerRuntimeContext'

// P1-② (Engineering Health, 2026-08-14): runtime state relocated into useExplorerRuntime()
import { useExplorerRuntime } from './runtime/explorerRuntime'

// P1-② (Engineering Health, 2026-08-14): view-derived maps + node-open helpers
// relocated into buildExplorationDerived() — pure relocation, call sites unchanged.
import { buildExplorationDerived } from './runtime/explorationDerived'

// P1-② (Engineering Health, 2026-08-14): projection → state → policy effect
// relocated into useExplorationProjection() — pure relocation, deps & logic
// unchanged. App passes the same inputs + setters it previously closed over.
import { useExplorationProjection } from './runtime/explorationProjection'

// P1-② (Engineering Health, 2026-08-14): pure-derived causal-object maps +
// featured-topic filter relocated into buildCausalObjectMaps() /
// buildFeaturedTopics() — pure relocation, call sites unchanged.
import { buildCausalObjectMaps, buildFeaturedTopics } from './runtime/causalObjectMaps'

// P1-② (Engineering Health, 2026-08-14): navigation / package adapter
// functions relocated into useExplorationNavigation() — pure relocation,
// same `nav` / `pkg` / setters passed, call sites unchanged.
import { useExplorationNavigation } from './runtime/explorationNavigation'
import { useExplorationSearch } from './runtime/explorationSearch'

// M69 — Exploration Package page
import ExplorationPackagePage from './pages/ExplorationPackagePage'

// M85.8 — CausalObject Explorer Experience
import CausalObjectDetailPage from './components/causal/CausalObjectDetailPage'
import type { CausalObjectData } from './data/causalStatement'
import { causalObjectsRaw } from './data/DataSource'

// M85.9.3 — Explorer Path Instrumentation
import { completePath } from './data/ExplorerPath'

// M90.3 Stage A — unified Router (single URL truth source)
import { useRouter, runLegacyRedirect } from './routing'
import { API_BASE } from './config/api'


// M5-A-3: curated "start here" topics. The ordered slug list now lives in the
// site-config layer (backend `topic_ordering` + frontend compiled default), so
// an operator can reorder / curate the landing "featured" strip without a code
// change. Slugs absent from the catalog are dropped at render time, so the
// list stays safe if a topic is later renamed or removed.

export type ExplorationResult = {
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
  // M72 Line1 (2026-08-11 PO): UnderstandingCard sentences follow the UI
  // language — zh UI renders Chinese templates, en/ja keep their own.
  const { locale, t } = useLocale()

  // =========================================================================
  // M90.3 Stage A — legacy URL migration (one-shot, before any route read)
  // Must run before useRouter() initializes so the parsed route sees the
  // canonical URL, not the legacy hash.
  // =========================================================================
  runLegacyRedirect()

  // =========================================================================
  // M90.3 Stage A — unified Router (single URL truth source, K-1.4)
  // =========================================================================
  const router = useRouter()

  // Subscribe to runtime site-config so the landing "featured" strip re-renders
  // when the operator reorders topics in the admin console. The compiled default
  // keeps first paint identical to before this layer existed.
  useSiteConfigRevision()

  // =========================================================================

  // P1-② (Engineering Health, 2026-08-14): runtime state extracted into
  // useExplorerRuntime() — pure relocation, logic & call sites unchanged.
  const {
    runtimeContext,
    setRuntimeContext,
    createContext,
    updateAnchor,
    clearContext,
    contextApi,
    setProjection,
    policyAction,
    setPolicyAction,
    explorationState,
    setExplorationState,
    explorationMetrics,
    setExplorationMetrics,
    previousExplorationState,
    graphStore,
  } = useExplorerRuntime()

  const [result, setResult] = useState<ExplorationResult | null>(null)
  const [loading, setLoading] = useState(false)
  // P5-S4: 首屏 LandingTabs 激活态（受控）。初始化默认「了解」
  //（PO 2026-08-09：系统初始化从了解界面开始）。
  const [landingTab, setLandingTab] = useState<'mine' | 'understand' | 'research' | 'expand'>('understand')
  // T1: which EntityPage tab to land on. Set when navigation originates from a
  // research bookmark so the user arrives directly in the research tab.
  const [entityInitialTab, setEntityInitialTab] = useState<'info' | 'research' | 'extensions'>('info')

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
  // M73 Phase1: the navigation state machine + package lifecycle moved into
  // dedicated hooks (useNavigationHistory / usePackageContext) — App now only
  // wires the two together and keeps view-state (result/entityData/...) local.
  const nav = useNavigationHistory({
    onNavigate: (node, targetCursor) => {
      // M35 Feature D: record every navigation in the journey trace.
      addJourneyEntry(entryFromNode(node))
      fetchNode(node, targetCursor)
    },
    // Home exit (breadcrumb Home / goHome): exit package context AND reset
    // App's view state (result/entity/search/journey annotations/focus).
    onHomeExit: () => {
      // M85.9.3 — Complete current exploration path before resetting
      completePath()
      closePackage()
      // M86.1 — 探索结束时清除 Context
      clearContext()
      setResult(null)
      setEntityData(null)
      setCausalObjectData(null)
      setSearchResults(null)
      setJourneyReasons(new Map())
      setFocusedEntityId(null)
      setLoading(false)
    },
  })
  const pkg = usePackageContext({
    onOpenPackage: (slug) => recordEvent({ action: 'open_package', packageSlug: slug }),
  })
  const { history, cursor, recent, errorKind, setErrorKind, setRecent, setHistory } = nav

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

  // M85.8 — CausalObject Explorer Experience
  const causalObjects = causalObjectsRaw as CausalObjectData[]
  const { causalObjectsById, causalObjectTitleMap } = useMemo(
    () => buildCausalObjectMaps(causalObjects),
    [],
  )
  const [causalObjectData, setCausalObjectData] = useState<CausalObjectData | null>(null)

  // M69 — Package page state (renders instead of Discover when set).
  // M73 Phase1: lifecycle + hash ownership moved to usePackageContext (pkg).
  const packageSlug = pkg.packageSlug

  // M62 W3: relationship / timeline view toggles (no panel deletion — both
  // views stay reachable; only one renders at a time to cut panel density).
  const [relView, setRelView] = useState<'list' | 'spatial'>('list')
  const [timeView, setTimeView] = useState<'single' | 'multi'>('single')

  // Load persisted recent explorations once on mount.
  useEffect(() => {
    setRecent(loadRecent())
  }, [])

  // M10-1: restore the persisted exploration trail (history + cursor are
  // restored inside useNavigationHistory's initializer; here we re-fetch the
  // current node and restore journeyReasons). Mount-only, not reactive.
  useEffect(() => {
    if (history.length > 0 && cursor >= 0) {
      fetchNode(history[cursor], cursor)
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
  // `topics` keyed by the runtime `featuredSlugs()` (site-config topic_ordering,
  // falling back to the compiled default). Empty until the catalog loads.
  const featuredTopics: TopicSummary[] = buildFeaturedTopics(topics)

  useEffect(() => {
    let cancelled = false
    const attempt = (retriesLeft: number): void => {
      if (cancelled) return
      setTopicsLoading(true)
      const controller = new AbortController()
      fetch(`${API_BASE}/topics`, { signal: controller.signal })
        .then((resp) => {
          if (!resp.ok) throw new Error(`status:${resp.status}`)
          return resp.json()
        })
        .then((data: { topics?: unknown }) => {
          if (cancelled) return
          setTopics(Array.isArray(data?.topics) ? (data.topics as TopicSummary[]) : [])
          setTopicsError('')
          setTopicsLoading(false)
        })
        .catch(() => {
          if (cancelled || controller.signal.aborted) return
          if (retriesLeft > 0) {
            // M74: a single transient blip must not surface the scary
            // "无法连接后端" banner — the backend is usually fine, so retry
            // once before flagging a real connectivity problem.
            setTimeout(() => attempt(retriesLeft - 1), 600)
            return
          }
          setTopicsError('network')
          setTopicsLoading(false)
        })
    }
    attempt(1)
    return () => {
      cancelled = true
    }
  }, [])

  const current: NavNode | null =
    cursor >= 0 && cursor < history.length ? history[cursor] : null

  // M60 type-debt fix: NavNode is a union; derive topic/id strings narrowly so
  // the projection useEffect can read them without `current?.topic`/`current?.id`
  // (which only exist on the topic / entity variants). Preserves prior runtime
  // behaviour (undefined → '' fallback).
  const currentTopic = current?.type === 'topic' ? current.topic : ''
  const currentRef = current?.type === 'entity' ? current.id : ''

  // P1-② (Engineering Health, 2026-08-14): projection → state → policy effect
  // relocated into useExplorationProjection() — pure relocation, deps & logic
  // unchanged. App passes the same inputs + setters it previously closed over.
  useExplorationProjection({
    result,
    entityData,
    runtimeContext,
    currentTopic,
    currentRef,
    history,
    setProjection,
    setRuntimeContext,
    setExplorationState,
    setExplorationMetrics,
    previousExplorationState,
    setPolicyAction,
  })

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
      if (node.type === 'causal_object') {
        // M85.8 — CausalObject is static data (no backend API)
        const obj = causalObjectsById[node.objectId]
        if (!obj) {
          setErrorKind('notfound')
          setResult(null)
          setEntityData(null)
          setCausalObjectData(null)
          setLoading(false)
          return
        }
        setCausalObjectData(obj)
        setResult(null)
        setEntityData(null)
        setLoading(false)
        return
      }
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
      // M74 Phase1 (C3): 400 = backend rejected the topic format
      // (TOPIC_PATTERN). Classify it as 'invalid' (backend is online — the
      // input is wrong), NOT 'network' which misled users into checking the
      // backend. 404 stays 'notfound'; everything else stays 'network'.
      if (status === '400') setErrorKind('invalid')
      else if (status === '404') setErrorKind('notfound')
      else setErrorKind('network')
      setResult(null)
      setEntityData(null)
    } finally {
      setLoading(false)
    }
  }

  // ---- M73 Phase1: navigation / package functions now delegate to the hooks
  // (relocated into useExplorationNavigation). App keeps the same function
  // names so call sites / render tree stay stable; the state-machine + hash +
  // telemetry logic lives in the hooks.

  // P1-② (Engineering Health, 2026-08-14): navigation / package adapter
  // functions relocated into useExplorationNavigation() — pure relocation,
  // same `nav` / `pkg` / setters passed, call sites unchanged.
  const {
    navigateTo,
    openCausalObject,
    openEntity,
    goTo,
    goBack,
    goForward,
    onCrumbClick,
    handleTopicClick,
    openPackage,
    closePackage,
    clearRecent,
  } = useExplorationNavigation({
    nav,
    pkg,
    runtimeContext,
    createContext,
    updateAnchor,
    setEntityInitialTab,
    prettifyTopic,
  })

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
        throw new Error(`status:${response.status}`)
      }
      const data = await response.json()
      setSearchResults(data.results as SearchResultItem[])
    } catch (err) {
      // M74 C3 alignment (same classification as navigateTo): a 4xx means the
      // backend is ONLINE and rejected the input — surfacing that as
      // "Unable to search. Is the backend running?" misled users into
      // checking connectivity. 400 = invalid input, 404 = endpoint missing,
      // anything else (network / 5xx) = backend unreachable.
      const msg = err instanceof Error ? err.message : String(err)
      const status = msg.startsWith('status:') ? msg.slice('status:'.length) : ''
      if (status === '400') {
        setSearchError('搜索请求未通过校验（400），请换个说法试试')
      } else if (status === '404') {
        setSearchError('搜索接口不存在（404），请检查后端版本')
      } else {
        setSearchError('Unable to search. Is the backend running?')
      }
      setSearchResults([])
    } finally {
      setSearchLoading(false)
    }
  }

  // P1-② (Engineering Health, 2026-08-14): search behavior cluster relocated
  // into useExplorationSearch() — pure relocation, same state/setters passed,
  // call site (searchSlot) unchanged. handleSearch (async fetch + view-state
  // reset) stays in App and is forwarded in.
  const { searchSlot } = useExplorationSearch({
    searchQuery,
    searchResults,
    searchLoading,
    searchError,
    searchSelected,
    setSearchResults,
    setSearchQuery,
    setSearchSelected,
    handleSearch,
    navigateTo,
    openEntity,
    prettifyTopic,
  })

  // P1-② (Engineering Health, 2026-08-14): view-derived maps + node-open
  // helpers relocated into buildExplorationDerived() — pure relocation, logic
  // & call sites unchanged.
  const {
    exploreNameById,
    exploreNameToId,
    entityNameById,
    entityGlobalIdById,
    exploreTopic,
    exploreEntityGlobalById,
    exploreNameByGlobalId,
    exploreThemesRelationships,
    exploreEntityTimeByName,
    aiContextIds,
    openNode,
    openNodeNamed,
    crumbs,
    seenGlobalIds,
  } = buildExplorationDerived({ result, entityData, recent, history, cursor, t, locale, openEntity })


  const navSlot = current ? (
    <>
      <Breadcrumb
        crumbs={crumbs}
        onCrumbClick={onCrumbClick}
        onBack={goBack}
        canBack={canBack(cursor)}
        onForward={goForward}
        canForward={canForward(cursor, history.length)}
      />
      {/* M10-2 trail convergence: ExplorationPathTree is the single
          full-journey view here (it supersedes the earlier
          ExplorationTrail, which is retained but no longer rendered by
          default). ExplorationJourney still renders on the entity page.
          M90.x: HistoryBar's back/forward controls merged into Breadcrumb
          (single unified nav row) — see components/Breadcrumb.tsx. */}
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
      // M85.8 — NavNode now includes 'causal_object' type
      const fallbackName =
        current.type === 'entity' ? current.id : current.type === 'causal_object' ? getCausalObjectName(current.objectId) : current.topic
      const title = result.title || (entityData?.name ?? fallbackName)
      items.push({
        id: current.type === 'entity' ? current.id : current.type === 'causal_object' ? current.objectId : current.topic,
        title,
        subtitle: '',
        icon: current.type === 'entity' ? 'book' : 'globe',
      })
    }
    return items
  }, [current, result, entityData])

  // M59-020: Workspace history — from navigation stack
  // M90.3 fix: include ALL node types (topic/entity/causal_object), not just entity.
  // Before: only type==='entity' showed up. Users exploring topics and causal objects
  // saw an empty workspace.
  const workspaceHistory: WorkspaceItem[] = useMemo(() => {
    const typeLabels: Record<string, string> = {
      topic: '主题',
      entity: '实体',
      causal_object: '因果',
      package: '探索包',
    }
    const typeIcons: Record<string, string> = {
      topic: 'globe',
      entity: 'book',
      causal_object: 'graph',
      package: 'box',
    }
    return history
      .map((n) => {
        let id = ''
        let title = ''
        let subtitle = ''
        let icon = 'book'
        if (n.type === 'topic') {
          id = n.topic
          title = n.title
          subtitle = typeLabels.topic
          icon = typeIcons.topic
        } else if (n.type === 'entity') {
          id = n.id
          title = n.name || n.id
          subtitle = typeLabels.entity
          icon = typeIcons.entity
        } else if (n.type === 'causal_object') {
          id = n.objectId
          title = getCausalObjectName(n.objectId)
          subtitle = typeLabels.causal_object
          icon = typeIcons.causal_object
        }
        return { id, title, subtitle, icon }
      })
      .reverse()
      .slice(0, 12)
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

  // T2 — real behavioral signals for the Discover Cognitive Mirror.
  // Read-only projection of state App already owns. It is a MIRROR, never an
  // input to any recommendation engine.
  const discoverSignals = useMemo(() => {
    const titleOf = (n: NavNode): string =>
      n.type === 'topic' ? n.title : n.type === 'entity' ? n.name : n.objectId
    return {
      navTitles: history.map(titleOf),
      recentTitles: recent.map(titleOf),
      journeyReasons: [...journeyReasons.values()].flatMap((j) => j.reasons ?? []),
      growthLabels: graphStore.getGraph().nodes.map((n) => n.cause).filter(Boolean),
    }
  }, [history, recent, journeyReasons, graphStore])

  // M65 Phase 3B: read-only workspace context for AI Companion
  // M65 Phase 3C-2: extended with entityType + multi-entity contextGlobalIds
  const workspaceContext = useMemo(() => ({
    currentEntityId: current?.type === 'entity' ? current.id : undefined,
    currentEntityName: current?.type === 'entity' ? current.name : current?.type === 'topic' ? current.title : undefined,
    entityType: current?.type === 'entity' ? entityData?.type ?? null : null,
    contextGlobalIds: aiContextIds,
    recentEntityIds: workspaceHistory.map((h) => h.id),
    pinnedEntityIds: workspaceItems.map((w) => w.id),
    explorationPathLength: history.length,
    intelligence: workspaceIntelligence,
  }), [current, workspaceHistory, workspaceItems, history.length, entityData?.type, aiContextIds, workspaceIntelligence])

  // M65 第二批：Companion dock 折叠态提升到 App 层，供理解视角「直接发问」按钮跨组件展开。
  // companionCollapsed=true 表示 dock 收起（默认，PO 2026-08-09）。
  const [companionCollapsed, setCompanionCollapsed] = useState(true)
  // 仅「直接发问」打开时设为 'chat'，其余（含切换按钮）保持默认 explain。
  const [companionOpenMode, setCompanionOpenMode] = useState<'chat' | undefined>(undefined)
  const openCompanionForAsk = () => {
    setCompanionOpenMode('chat')
    setCompanionCollapsed(false)
  }
  // dock 收起后重置打开模式，保证下一次普通展开回到 explain。
  useEffect(() => {
    if (companionCollapsed) setCompanionOpenMode(undefined)
  }, [companionCollapsed])

  // M90.3 Stage A — legacy hash early-returns removed.
  // #/m89     → legacyRedirect rewrites to #/explore/french-revolution/understanding
  // #/causal/ → legacyRedirect rewrites to #/explore/:topic/explanation/:id
  // All route decisions now flow through useRouter().
  //
  // #/dev/catalog is preserved as a conditional inside the main return.
  // K-3: #/entity/:gid is dead — no code path generates it anymore.

  return (
    <ExplorerRuntimeContext.Provider value={contextApi}>
    <ExplorerShell
      companionCollapsed={companionCollapsed}
      onCompanionCollapseChange={setCompanionCollapsed}
      globalBar={<GlobalBar topic={router.route?.topic ?? null} mode={router.route?.mode ?? null} />}
      questionHeader={
        router.route?.topic ? (
          <QuestionHeader
            question={runtimeContext.userQuestion}
            goal={runtimeContext.understandingGoal}
          />
        ) : null
      }
      modeBar={
        router.route?.topic ? (
          <ModeBar
            currentMode={router.route?.mode ?? null}
            currentTopic={router.route?.topic ?? null}
            currentFocus={router.route?.focus ?? null}
            onModeChange={(state) => router.navigate(state)}
          />
        ) : null
      }
      contextRail={
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <UnderstandingStatus
            cognitiveStage={runtimeContext.cognitiveStage}
            unresolvedGap={runtimeContext.unresolvedGap}
            explorationState={explorationState}
            policyAction={policyAction}
            explorationMetrics={explorationMetrics}
            graphStore={graphStore}
          />
          <MirrorPanel graphStore={graphStore} cognitiveStage={runtimeContext.cognitiveStage} />
          <WorkspacePanel
            current={workspaceItems[0] ?? null}
            history={workspaceHistory}
            onEntityClick={(id, name) => openEntity(id, name)}
          />
        </div>
      }
      companionDock={<CompanionShell mode={companionOpenMode} workspaceContext={workspaceContext} onNavigateEntity={openNode} actions={policyAction ? [policyAction] : []} />}
      navigationBar={null}
    >
      <ModeCanvas
        mode={router.route?.mode ?? null}
        searchSlot={searchSlot}
        navSlot={navSlot}
        loadingSlot={loading ? <LoadingSkeleton label={current?.type === 'entity' ? 'Loading entity…' : 'Loading exploration…'} /> : null}
        errorSlot={!loading && errorKind ? <ErrorCard kind={errorKind} onRetry={current ? () => fetchNode(current, cursor) : undefined} /> : null}
        topicRoot={!loading && !errorKind && current?.type === 'topic' && result && !packageSlug ? (
          <UnderstandingCanvas
            cognitiveStage={runtimeContext.cognitiveStage}
            explorationState={explorationState}
            exploreSection={
              <div className="explore-a">
                <div className="explore-page-head">
                  <h1 className="explore-page-title">{result.title}</h1>
                  <p className="explore-page-sub">探索 · 主要信息</p>
                </div>
                <SummaryPanel title={result.title} summary={result.summary} />
                <div className="explore-hero">
                  <MainEntityCard mainEntity={result.exploration.main_entity} />
                </div>
                <StorySection narrativeKey={current.topic} />
                <WhyImportantPanel narrativeKey={current.topic} />
                <TopicExploreStarters topic={current.topic} title={result.title} onStarterClick={(t) => navigateTo(t)} />
              </div>
            }
            explainSection={
              <>
                <div className="m62-view-toggle" role="group" aria-label="时间线视图切换">
                  <button type="button" className={timeView === 'single' ? 'active' : ''} aria-pressed={timeView === 'single'} onClick={() => setTimeView('single')}>单线</button>
                  <button type="button" className={timeView === 'multi' ? 'active' : ''} aria-pressed={timeView === 'multi'} onClick={() => setTimeView('multi')}>多线</button>
                </div>
                {timeView === 'single' ? (
                <>
                <TimelinePanel timeline={result.timeline} nameToId={exploreNameToId} onEventClick={(id) => openEntity(id, exploreNameById[id])} globalIdById={exploreEntityGlobalById} focusedId={focusedEntityId ?? undefined} />
                <TemporalComparisonPanel entities={result.entities} />
                </>
                ) : (
                <MultiEntityTimeline entities={result.entities} />
                )}
                <InterpretationPanel interpretations={toInterpretationViewModels(result.connections_explained)} understandings={buildUnderstandingsFromConnectionsExplained(result.connections_explained, result.exploration.main_entity.name, Object.fromEntries((result.entities ?? []).map((e) => [e.global_id ?? exploreEntityGlobalById[e.id] ?? `${exploreTopic}:${e.id}`, e.name])), exploreEntityTimeByName, locale)} onNodeClick={openNodeNamed} />
                <DisputesPanel
                  relationships={result.relationships ?? []}
                  nameById={exploreNameById}
                  globalIdById={exploreEntityGlobalById}
                  onNodeClick={openNodeNamed}
                />
                <AIExplanationPanel contextGlobalIds={aiContextIds} onCitationClick={(gid) => openEntity(gid)} />
                <TopicComparisonPanel key={result?.topic ?? current.topic} crossTopicRelated={result.exploration.cross_topic_related} onNodeClick={openNode} onTopicClick={handleTopicClick} />
                <EntityPickerPanel onCandidatesChange={setPickedCandidates} />
                <MultiEntityContextPanel candidates={pickedCandidates} candidateGids={Object.values(exploreEntityGlobalById)} onCitationClick={(gid) => openEntity(gid)} />
              </>
            }
            relateSection={
              <>
                <div className="m62-view-toggle" role="group" aria-label="关系视图切换">
                  <button type="button" className={relView === 'list' ? 'active' : ''} aria-pressed={relView === 'list'} onClick={() => setRelView('list')}>列表</button>
                  <button type="button" className={relView === 'spatial' ? 'active' : ''} aria-pressed={relView === 'spatial'} onClick={() => setRelView('spatial')}>图谱</button>
                </div>
                {relView === 'list' ? (
                <RelationshipView mainEntity={result.exploration.main_entity} relatedEntities={result.exploration.related_entities} nameById={exploreNameById} onEntityClick={(id) => openEntity(`${exploreTopic}:${id}`, exploreNameById[id])} globalIdById={exploreEntityGlobalById} focusedId={focusedEntityId ?? undefined} onEntityFocus={(gid) => setFocusedEntityId(gid)} />
                ) : (
                <GraphViewPanel mainEntity={result.exploration.main_entity} relatedEntities={result.exploration.related_entities} nameById={exploreNameById} onEntityClick={(id) => openEntity(`${exploreTopic}:${id}`, exploreNameById[id])} />
                )}
                <CrossTopicView connections={result.exploration.cross_topic_related} relatedTopics={result.related_topics} focusedId={focusedEntityId ?? undefined} onEntityClick={(gid) => openEntity(gid)} onTopicClick={handleTopicClick} />
                <RelatedEntityList relatedEntities={result.exploration.related_entities} nameById={exploreNameById} mainEntityName={result.exploration.main_entity.name} onEntityClick={(id) => openEntity(`${exploreTopic}:${id}`, exploreNameById[id])} />
                <ThemesPanel relationships={exploreThemesRelationships} onNodeClick={openNodeNamed} />
                <RelationshipContext connections={result.connections} connectionsExplained={result.connections_explained} onNodeClick={openNodeNamed} candidates={pickedCandidates} relationships={exploreThemesRelationships} timeMap={exploreEntityTimeByName} mainGlobalId={exploreEntityGlobalById[result.exploration.main_entity.id]} mainEntityName={result.exploration.main_entity.name} nameByGlobalId={exploreNameByGlobalId} />
              </>
            }
            understandingSection={
              <>
                <UnderstandingOverview signals={discoverSignals} topicTitle={result.title} />
                <UnderstandingActions
                  mainEntityGlobalId={result.exploration.main_entity.global_id ?? ''}
                  mainEntityName={result.exploration.main_entity.name}
                  onDeepResearch={(gid, name) => openEntity(gid, name, 'research')}
                  onAskCompanion={openCompanionForAsk}
                />
                {hasUnderstandingData(current.topic) && <UnderstandingWorkspace topic={current.topic} />}
                <ContinueExploringPanel connections={result.connections_explained} crossTopicRelated={result.exploration.cross_topic_related} relatedTopics={result.related_topics} seenGlobalIds={seenGlobalIds} onNodeClick={openNodeNamed} onTopicClick={handleTopicClick} />
              </>
            }
          />
        ) : null}
        entityDetail={!loading && !errorKind && current?.type === 'entity' && entityData && !packageSlug ? (
          <>
            <EntityPage key={`${current.id}:${entityInitialTab}`} entity={entityData} entityId={current.id} entityName={entityData.name} entityStarters={resolveEntityStarters(current.id)} onStarterClick={(t) => navigateTo(t)} onEntityClick={(id) => openEntity(entityGlobalIdById[id] ?? id, entityNameById[id])} onNodeClick={openNode} onTopicClick={handleTopicClick} initialTab={entityInitialTab} />
            <ExplorationPath view="journey" history={history} cursor={cursor} journeyReasons={journeyReasons} onStepClick={goTo} />
            <div className="entity-exploration-footer">
              <NextStepPanel actions={policyAction ? [policyAction] : []} seenGlobalIds={seenGlobalIds} onNodeClick={(gid, ctx) => { if (ctx) { setJourneyReasons((prev) => { const next = new Map(prev); next.set(gid, { fromGlobalId: current.id, fromName: entityData?.name ?? current.id, reasons: ctx.reason ? [ctx.reason] : [], actionType: ctx.actionType, narrativeHook: ctx.narrativeHook, confidence: ctx.confidence, capturedAt: new Date().toISOString() }); saveReasons(next); return next }) } openNode(gid) }} />
              <ContinueExploringPanel connections={entityData.connections_explained} relatedTopics={entityData.related_topics} seenGlobalIds={seenGlobalIds} onNodeClick={openNode} onTopicClick={handleTopicClick} />
            </div>
          </>
        ) : null}
        causalDetail={!loading && !errorKind && current?.type === 'causal_object' && causalObjectData && !packageSlug ? (
          <CausalObjectDetailPage object={causalObjectData} objectTitleMap={causalObjectTitleMap} onEntityClick={(gid) => openEntity(gid)} onCausalObjectClick={(objectId) => openCausalObject(objectId)} onBack={goBack} />
        ) : null}
        packageDetail={packageSlug ? (
          <ExplorationPackagePage slug={packageSlug} onEntityClick={(gid) => openEntity(gid)} onOpenPackage={(s) => openPackage(s)} onBack={closePackage} />
        ) : null}
        landing={!current && !packageSlug ? (
          <LandingTabs
            activeTab={landingTab}
            onTabChange={setLandingTab}
            mine={
              <MyExplorationPanel
                behavioralSignals={discoverSignals}
                onTopicClick={handleTopicClick}
                onStarterClick={navigateTo}
                onOpenResearch={(gid, name) => openEntity(gid, name, 'research')}
              />
            }
            understand={
              <>
                <DiscoverPage topics={topics} onTopicClick={handleTopicClick} onPackageClick={openPackage} />
                <FeedbackWidget page="discover" />
              </>
            }
            research={
              <LandingPage topics={topics} loading={topicsLoading} error={topicsError} onTopicClick={handleTopicClick} featured={featuredTopics} recent={recent} onRecentSelect={navigateTo} onRecentClear={clearRecent} onCausalObjectClick={(objectId) => openCausalObject(objectId)} onQuickStart={(q) => { const { resolution } = resolveEntryQuery(q); if (resolution?.kind === 'topic') { handleTopicClick(resolution.slug); return } if (resolution?.kind === 'package') { openPackage(resolution.slug); return } else if (resolution?.kind === 'entity') { openEntity(resolution.globalId) } else { handleSearch(q) } }} />
            }
            expand={
              <div className="discover-expand">
                <h3 className="discover-section-heading">扩展功能</h3>
                <p className="discover-section-sub">更多功能即将推出。包括 AI 内容创作、教育模块和社交探索。</p>
                <p className="discover-expand-soon">敬请期待</p>
              </div>
            }
          />
        ) : null}
        productIntro={!current && !packageSlug ? <ProductIntro /> : null}
        understandingMode={null}
        devCatalog={null}
        isDevCatalog={false}
        isUnderstandingRoute={false}
        hasPackage={!!packageSlug}
      />
    </ExplorerShell>
    </ExplorerRuntimeContext.Provider>
  )
}

export default App
