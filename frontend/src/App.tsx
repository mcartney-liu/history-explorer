import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useNavigationHistory } from './hooks/useNavigationHistory'
import { usePackageContext } from './hooks/usePackageContext'
import SearchBox from './components/SearchBox'
import EntitySearchBox from './components/EntitySearchBox'
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
  canBack,
  canForward,
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
import { resolveEntryQuery, resolveTopic } from './data/topicResolver'
import { ExplorerShell } from './components/shell/ExplorerShell'
import { GlobalBar } from './components/shell/GlobalBar'
import { QuestionHeader } from './components/shell/QuestionHeader'
import { ModeBar } from './components/shell/ModeBar'
import { LandingTabs } from './components/shell/LandingTabs'
import { ProductIntro } from './components/shell/ProductIntro'
import { UnderstandingStatus } from './components/shell/UnderstandingStatus'
import { ModeCanvas } from './components/shell/ModeCanvas'
import { UnderstandingCanvas } from './components/shell/UnderstandingCanvas'
import { UnderstandingWorkspace } from './pages/m89/UnderstandingWorkspace'
import { CompanionShell } from './components/ai/CompanionShell'
import RelationshipContext from './components/RelationshipContext'
import { WorkspacePanel, type WorkspaceItem } from './components/workspace/WorkspacePanel'
import { getCausalObjectName } from './data/causalObjectNames'
import GraphViewPanel from './components/GraphViewPanel'
import StorySection from './components/exploration/StorySection'
import WhyImportantPanel from './components/exploration/WhyImportantPanel'
import DiscoverPage from './pages/DiscoverPage'
import { addJourneyEntry, entryFromNode } from './lib/journey'
import FeedbackWidget from './components/FeedbackWidget'

// M86.1 — Explorer Runtime Context（Experience Runtime 单一语义核心）
import {
  ExplorerRuntimeContext,
  EMPTY_CONTEXT,
  type ExplorerRuntimeContextValue,
  type CreateContextInput,
  type UpdateAnchorInput,
  type Anchor,
} from './next/ExplorerRuntimeContext'

  // M86.1 Batch 3 — Understanding Projection Runtime
import {
  computeUnderstandingProjection,
  EMPTY_PROJECTION,
  type UnderstandingProjection,
  type ContextSnapshot,
  type UnderstandingTemplate,
} from './next/UnderstandingProjection'

// M90.3 Stage E — ExplorationPolicy wiring (previously backend-only, now UI-visible)
import { evaluateExploration, type ExplorationAction } from './next/exploration/ExplorationPolicy'
import { buildExplorationState, type ExplorationState, EMPTY_EXPLORATION_STATE } from './next/exploration/ExplorationState'
import type { Decision, PolicyContext } from './runtime/evaluation/Decision'

// M90.3 Stage E-3 — ExplorationMetrics + Memory wiring
import { computeExplorationMetrics, type ExplorationMetrics } from './next/exploration/ExplorationMetrics'

// M86.1 — Evaluation Runtime

// M86.2 — Memory Module（Evaluation Runtime 的第二个 Domain Module）
import {
  evaluateMemory,
  type ProjectionDelta,
  type MemoryPersistencePayload,
  type ExistingMemoryState,
} from './next/memory/MemoryPolicy'
import {
  GrowthGraphStore,
  type GrowthSnapshot,
} from './next/memory/GrowthGraphStore'

// M69 — Exploration Package page
import ExplorationPackagePage from './pages/ExplorationPackagePage'

// M85.8 — CausalObject Explorer Experience
import CausalObjectDetailPage from './components/causal/CausalObjectDetailPage'
import type { CausalObjectData } from './data/causalStatement'
import causalObjectsRaw from '../../data/causal_objects.json'

// M85.9.3 — Explorer Path Instrumentation
import { recordVisit, completePath } from './data/ExplorerPath'

// M90.3 Stage A — unified Router (single URL truth source)
import { useRouter, runLegacyRedirect } from './routing'

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

// M86.2 — computeDelta: 对比两次 Projection 生成 ProjectionDelta
function computeDelta(
  previous: UnderstandingProjection | null,
  current: UnderstandingProjection,
  sessionRef: string,
): ProjectionDelta {
  const delta: ProjectionDelta = {
    deltaId: `delta-${Date.now()}`,
    sessionRef,
    timestamp: Date.now(),
    cause: 'user_progress',
  }

  if (!previous || previous.topicRef !== current.topicRef) {
    // 首次 Projection——无对比
    return delta
  }

  // stage 变化
  if (previous.stage !== current.stage) {
    delta.stageChanged = { previous: previous.stage, current: current.stage }
  }

  // coverage 变化
  const prevCov = previous.coverageState.coverageRatio
  const currCov = current.coverageState.coverageRatio
  if (Math.abs(currCov - prevCov) > 0.01) {
    delta.coverageChanged = { previous: prevCov, current: currCov }
  }

  // 新维度覆盖
  const prevDims = new Set(previous.coverageState.coveredDimensions)
  const newDims = current.coverageState.coveredDimensions.filter((d) => !prevDims.has(d))
  if (newDims.length > 0) {
    delta.dimensionsCompleted = newDims
  }

  // missingLinks 减少
  const prevMissing = previous.missingLinks.length
  const currMissing = current.missingLinks.length
  if (currMissing < prevMissing) {
    delta.missingLinksResolved = current.missingLinks
      .filter((m) => !previous.missingLinks.some((pm) => pm.fromRef === m.fromRef && pm.toRef === m.toRef))
      .map((m) => `${m.fromRef}→${m.toRef}`)
  }

  return delta
}

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

  // =========================================================================
  // M86.1 — Explorer Runtime Context（Experience Runtime 单一语义核心）
  // 宿主：App() = ExplorePage 层。所有 Experience Layer 通过同一个 Context
  // 实例读写——不创建副本，不独立推断，不各自维护。
  // Batch 2: Anchor/Relation 语义数据模型 + anchorChain/relationChain
  // =========================================================================
  const [runtimeContext, setRuntimeContext] = useState<ExplorerRuntimeContextValue>(EMPTY_CONTEXT)

  const createContext = useCallback((input: CreateContextInput) => {
    // EP-009: user_question 和 understanding_goal 来自 Curator 预写数据，
    // 不由 AI 生成，不由开发者硬编码。来源由调用方保证。
    setRuntimeContext({
      explorationId: input.explorationId,
      userQuestion: input.userQuestion,
      understandingGoal: input.understandingGoal,
      currentAnchor: null,
      previousAnchor: null,
      activeRelation: null,
      anchorChain: [],
      relationChain: [],
      cognitiveStage: 'FACT',
      unresolvedGap: null,
    })
  }, [])

  const updateAnchor = useCallback((input: UpdateAnchorInput) => {
    // Batch 2: 接收 Anchor 对象 + 可选 Relation。
    // EP-007: Anchor 存的是理解锚点（用户概念），不是 Entity 数据副本。
    // activeRelation 来源 = Causal Layer 已有关系数据（EP-009）。
    // cognitive_stage 不由 Navigation 写入——由 Understanding Layer 判定（M86.1.2）。
    setRuntimeContext((prev) => ({
      ...prev,
      currentAnchor: input.anchor,
      previousAnchor: prev.currentAnchor,
      activeRelation: input.relation ?? null,
      // 累积锚点链和关系链
      anchorChain: [...prev.anchorChain, input.anchor],
      relationChain: input.relation
        ? [...prev.relationChain, input.relation]
        : prev.relationChain,
    }))
  }, [])

  const clearContext = useCallback(() => {
    // Batch 2 note: 当前为销毁语义。M86.2 应演进为 completeContext()
    // → Workspace Snapshot（保留理解记忆）。
    setRuntimeContext(EMPTY_CONTEXT)
  }, [])

  const contextApi = useMemo(() => ({
    context: runtimeContext,
    createContext,
    updateAnchor,
    clearContext,
  }), [runtimeContext, createContext, updateAnchor, clearContext])
  // =========================================================================

  // =========================================================================
  // M86.1 Batch 3 — Understanding Projection Runtime
  // Understanding Layer = Analysis Runtime。独立于 Context，单向依赖。
  // 读取 Context 快照 + UnderstandingTemplate → 输出 UnderstandingProjection。
  // =========================================================================
  const [projection, setProjection] = useState<UnderstandingProjection>(EMPTY_PROJECTION)

  // =========================================================================
  // M86.2 — Memory Module（Evaluation Runtime 的第二个 Domain Module）
  // Memory 是 Evaluation Runtime 的 Consumer，不是参与者。
  // 消费 ProjectionDelta → MemoryPolicy → Decision<MemoryPersistencePayload>
  // =========================================================================
  const [lastProjection, setLastProjection] = useState<UnderstandingProjection | null>(null)
  const [, setMemoryDecision] = useState<Decision<MemoryPersistencePayload> | null>(null)

  // M90.3 Stage E — ExplorationPolicy live state (wired from projection)
  const [policyAction, setPolicyAction] = useState<ExplorationAction | null>(null)
  const [explorationState, setExplorationState] = useState<ExplorationState>(EMPTY_EXPLORATION_STATE)

  // M90.3 Stage E-3 — ExplorationMetrics (before → after delta)
  const [explorationMetrics, setExplorationMetrics] = useState<ExplorationMetrics | null>(null)
  const previousExplorationState = useRef<ExplorationState>(EMPTY_EXPLORATION_STATE)

  // M86.2 Phase 2 — GrowthGraphStore（Append Only 认知成长图）
  const [graphStore] = useState(() => new GrowthGraphStore('graph-default', 'unit-default'))

  // 当 Projection 变化时，计算 Delta → 调用 MemoryPolicy → 驱动 GrowthGraphStore
  useEffect(() => {
    if (!projection.topicRef) {
      setMemoryDecision(null)
      return
    }

    const delta: ProjectionDelta = computeDelta(lastProjection, projection, runtimeContext.explorationId!)
    setLastProjection(projection)

    const existingState: ExistingMemoryState = {
      currentStage: lastProjection?.stage ?? 'FACT',
      currentCoverageRatio: lastProjection?.coverageState.coverageRatio ?? 0,
      lastMilestoneAt: null,
      growthNodeCount: graphStore.getGraph().nodes.length,
    }

    const decision = evaluateMemory(delta, existingState, {
      timestamp: Date.now(),
      policyVersion: '1.0',
      engineProtocolVersion: '1.0',
    })
    setMemoryDecision(decision)

    // Phase 2: 基于 Decision 驱动 GrowthGraphStore
    const snapshot: GrowthSnapshot = {
      stage: projection.stage,
      coverageRatio: projection.coverageState.coverageRatio,
      missingLinkCount: projection.missingLinks.length,
      dimensionCount: projection.coverageState.coveredDimensions.length,
    }
    graphStore.applyDecision(decision, delta, snapshot)
  }, [projection])
  // =========================================================================

  const [topic, setTopic] = useState('')
  const [result, setResult] = useState<ExplorationResult | null>(null)
  const [error, setError] = useState('') // topic-input validation only
  const [loading, setLoading] = useState(false)
  // P5-S3 ②: 首屏 LandingTabs 激活态（受控），供 DiscoverPage 的「我想研究…」跳到研究 tab。
  const [landingTab, setLandingTab] = useState<'understand' | 'research' | 'expand'>('understand')
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
  const causalObjectsById = useMemo(
    () => Object.fromEntries(causalObjects.map((o) => [o.id, o])),
    [],
  )
  const causalObjectTitleMap = useMemo(
    () =>
      Object.fromEntries(
        causalObjects.map((o) => {
          // Derive a human-readable title from cause_id + effect_id
          // TODO M85.8+: resolve Entity GID → display name from KG data
          const causeLabel = o.cause_id.includes(':') ? o.cause_id.split(':').pop() ?? o.cause_id : o.cause_id
          const effectLabel = o.effect_id.includes(':') ? o.effect_id.split(':').pop() ?? o.effect_id : o.effect_id
          return [o.id, `${causeLabel} → ${effectLabel}`]
        }),
      ),
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

  // M60 type-debt fix: NavNode is a union; derive topic/id strings narrowly so
  // the projection useEffect can read them without `current?.topic`/`current?.id`
  // (which only exist on the topic / entity variants). Preserves prior runtime
  // behaviour (undefined → '' fallback).
  const currentTopic = current?.type === 'topic' ? current.topic : ''
  const currentRef = current?.type === 'entity' ? current.id : ''

  // =========================================================================
  // M90.3 Stage E — Projection → ExplorationState → ExplorationPolicy
  // Re-compute when anchorChain or relationChain changes. Moved after
  // `current` declaration to avoid TDZ.
  // =========================================================================
  useEffect(() => {
    console.log('[Projection useEffect] TRIGGERED', {
      hasResult: !!result,
      entityCount: result?.entities?.length,
      anchorChainLen: runtimeContext.anchorChain?.length,
    })
    // Compute projection for ALL topics as soon as data is available.
    const hasTopicData = result && result.entities && result.entities.length > 0
    if (!hasTopicData && runtimeContext.anchorChain.length === 0) {
      console.log('[Projection useEffect] SKIPPED — no topic data and no anchor chain')
      setProjection(EMPTY_PROJECTION)
      return
    }

    const effectiveExplorationId = runtimeContext.explorationId || 'exploration-default'

    const snapshot: ContextSnapshot = {
      explorationId: effectiveExplorationId,
      anchorChain: runtimeContext.anchorChain,
      relationChain: runtimeContext.relationChain,
    }

    // Build UnderstandingTemplate from topic data.
    const entityTypes = result?.entities
      ? [...new Set(result.entities.map((e) => e.type).filter(Boolean))]
      : []
    const dimensionMapping: Record<string, string[]> = {}
    if (result?.entities) {
      for (const e of result.entities) {
        if (!e.type) continue
        if (!dimensionMapping[e.type]) dimensionMapping[e.type] = []
        dimensionMapping[e.type].push(e.id)
      }
    }
    const template: UnderstandingTemplate = {
      templateId: 'auto-generated-from-topic-data',
      version: '1.0',
      topic: runtimeContext.userQuestion ?? currentTopic ?? '',
      goal: runtimeContext.understandingGoal ?? '',
      requiredDimensions: entityTypes,
      dimensionMapping,
      expectedRelations: (result?.relationships || result?.exploration?.related_entities || []).map((r: any) => ({
        from: r.source || r.from_entity_id || '',
        to: r.target || r.to_entity_id || '',
        type: r.relation_type || r.relationship || 'related_to',
      })),
    }

    const newProjection = computeUnderstandingProjection(snapshot, template)
    console.log('[Understanding] Projection computed:', {
      stage: newProjection.stage,
      coverageRatio: newProjection.coverageState?.coverageRatio,
      requiredDimensions: newProjection.coverageState?.requiredDimensions,
      coveredDimensions: newProjection.coverageState?.coveredDimensions,
      missingLinks: newProjection.missingLinks?.length,
      templateDims: template.requiredDimensions,
      entityCount: result?.entities?.length,
    })
    setProjection(newProjection)

    // Projection → Context (stage + primaryGap)
    setRuntimeContext((prev) => ({
      ...prev,
      cognitiveStage: newProjection.stage,
      unresolvedGap: newProjection.missingLinks.length > 0
        ? `Missing connection: ${newProjection.missingLinks[0].fromRef} → ${newProjection.missingLinks[0].toRef}`
        : null,
    }))

    // Build ExplorationState → run ExplorationPolicy
    const eState = buildExplorationState({
      explorationId: runtimeContext.explorationId || '',
      currentTopic: currentTopic,
      currentAnchorRef: currentRef,
      understandingProjection: {
        stage: newProjection.stage,
        coverageState: {
          requiredDimensions: newProjection.coverageState.requiredDimensions || [],
          coveredDimensions: newProjection.coverageState.coveredDimensions || [],
          coverageRatio: newProjection.coverageState.coverageRatio || 0,
        },
        missingLinks: newProjection.missingLinks,
        basedOn: newProjection.basedOn || { projectionVersion: '1.0' },
      },
      memoryProjection: {
        totalNodes: history.length,
        daysSinceStart: 0,
        activeBranches: [],
      },
      sessionHistory: {
        exploredAnchors: runtimeContext.anchorChain.map((a) => a.entityId),
        exploredRelations: runtimeContext.relationChain.map((r) => r.relationId),
        activeQuestions: runtimeContext.userQuestion ? [runtimeContext.userQuestion] : [],
      },
    })
    setExplorationState(eState)

    // M90.3 Stage E-3 — Compute ExplorationMetrics (before → after delta)
    const prev = previousExplorationState.current
    if (prev.explorationId && prev.explorationId !== eState.explorationId) {
      // Topic changed — treat as new session, metrics show growth from empty
      const metrics = computeExplorationMetrics(EMPTY_EXPLORATION_STATE, eState, prev.missingDimensions)
      setExplorationMetrics(metrics)
    } else if (prev.coverageRatio !== eState.coverageRatio || prev.missingDimensions.length !== eState.missingDimensions.length) {
      // Same topic, cognitive state changed — compute delta
      const metrics = computeExplorationMetrics(prev, eState, prev.missingDimensions)
      setExplorationMetrics(metrics)
    }
    previousExplorationState.current = eState

    const policyContext: PolicyContext = {
      policyVersion: '1.0',
      timestamp: Date.now(),
      engineProtocolVersion: '1.0',
    }
    const decision = evaluateExploration(eState, policyContext)
    console.log('[ExplorationPolicy] Decision:', {
      actionType: decision.output?.type,
      reason: decision.output?.reason,
      coverageRatio: eState.coverageRatio,
      missingDimensions: eState.missingDimensions,
    })
    setPolicyAction(decision.output)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtimeContext.explorationId, runtimeContext.anchorChain, runtimeContext.relationChain, currentTopic, currentRef])

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

  // ---- M73 Phase1: navigation / package functions now delegate to the hooks.
  // App keeps the same function names so call sites / render tree stay stable;
  // the state-machine + hash + telemetry logic lives in the hooks.

  // Push a node onto the history and load it (hook state machine + onNavigate).
  function navigateTo(node: NavNode) {
    nav.navigateTo(node)
  }

  // M85.8 — Open a CausalObject by id
  function openCausalObject(objectId: string) {
    // M85.9.3 — Record visit on current exploration path
    recordVisit(objectId)
    navigateTo({ type: 'causal_object', objectId })
  }

  // Open an entity by id (with a display name for the breadcrumb).
  // M86.1 Batch 2 — Navigation Context Layer：每次跳转构造 Anchor 对象并更新。
  // EP-007: Anchor 存的是理解锚点（用户概念），不是 Entity 数据副本。
  // activeRelation 来源 = Causal Layer 已有关系数据（EP-009）。
  // cognitive_stage 不由 Navigation 写入——由 Understanding Layer 判定（M86.1.2）。
  function openEntity(
    id: string,
    name?: string,
    // T1: which EntityPage tab to land on (research bookmarks open 'research').
    tab: 'info' | 'research' | 'extensions' = 'info',
  ) {
    const displayName = name || id
    setEntityInitialTab(tab)
    // 只有当 Context 已创建时才更新锚点（用户在一条 Exploration 内）
    if (runtimeContext.explorationId) {
      // Batch 2: 构造 Anchor 对象（entityProvenance + selectionContext 分离）
      const anchor: Anchor = {
        entityId: id,
        entityType: guessEntityType(id, displayName),
        displayName,
        entityProvenance: { source: 'knowledge_layer' },
        selectionContext: {
          source: runtimeContext.currentAnchor ? 'knowledge_layer' : 'curator_layer',
          reason: runtimeContext.currentAnchor
            ? `Related Entity: ${runtimeContext.currentAnchor.displayName} → ${displayName}`
            : '探索包入口',
        },
      }
      // Batch 2: activeRelation 暂为 null——Causal Layer 关系数据接入在 Batch 3
      updateAnchor({ anchor, relation: null })
    }
    navigateTo({ type: 'entity', id, name: displayName })
  }

  // M86.1 Batch 2: 辅助——从 entity id/name 推断类型（暂时简化，未来从 Knowledge Layer 查询）
  function guessEntityType(_id: string, _name: string): string {
    // Batch 2 简化版：后续可从 Entity 数据中获取准确类型
    return 'concept'
  }

  function goTo(newCursor: number) {
    nav.goTo(newCursor)
  }

  function goBack() {
    nav.goBack()
  }

  function goForward() {
    nav.goForward()
  }

  // goHome lives in the hook (resets history/cursor/errorKind + persists +
  // fires onHomeExit=closePackage); view-state resets were folded into
  // onCrumbClick's Home branch via the hook's onHomeExit wiring.

  function onCrumbClick(index: number) {
    // M72 Line1 (finding C) preserved: hook's Home branch (index 0) fires
    // onHomeExit → closePackage, so breadcrumb Home exits the package context.
    nav.onCrumbClick(index)
  }

  function handleExplore(topicValue?: string) {
    const raw = topicValue ?? topic
    const trimmed = typeof raw === 'string' ? raw.trim() : ''
    if (!trimmed) {
      setError('Please enter a historical topic.')
      return
    }
    setError('')

    // T3: Chinese (and any non-slug) input is NO LONGER rejected.
    // Backend TOPIC_PATTERN = ^[a-z0-9_-]+$, so a non-slug query cannot be a
    // topic id — but it can still be resolved. Route it through the
    // deterministic resolver first (package / entity), then fall back to
    // full-text search. Only a truly unresolvable query surfaces a message.
    if (!/^[a-z0-9_-]+$/.test(trimmed)) {
      const resolved = resolveTopic(trimmed)
      if (resolved?.kind === 'package') {
        openPackage(resolved.slug)
        return
      }
      if (resolved?.kind === 'entity') {
        openEntity(resolved.globalId)
        return
      }
      handleSearch(trimmed)
      return
    }

    navigateTo({ type: 'topic', topic: trimmed, title: prettifyTopic(trimmed) })
  }

  // M5-A-2: a catalog topic click reuses the existing exploration flow.
  // Same node shape as SearchResults / CrossTopicTopicList topic clicks, so
  // there is exactly one navigation path (navigateTo) — no duplicated logic,
  // no second navigation mechanism.
  function handleTopicClick(t: string) {
    // T3: a normal topic click must also open an Explorer Runtime Context.
    // Previously only openPackage() called createContext(), so anchorChain
    // never grew for topic navigation and UnderstandingStatus (Projection)
    // progress stayed permanently hidden.
    createContext({
      explorationId: `exp-${t}-${Date.now()}`,
      userQuestion: prettifyTopic(t),
      understandingGoal: '',
    })
    navigateTo({ type: 'topic', topic: t, title: prettifyTopic(t) })
  }

  // M69 — Open an Exploration Package page (overlays Discover/home).
  // M73 Phase1 — lifecycle + #/package/ hash + open_package telemetry now live
  // in usePackageContext (telemetry injected via onOpenPackage callback).
  // M86.1 — 用户选择探索包时创建 Explorer Runtime Context（Curiosity Entry）
  function openPackage(slug: string) {
    pkg.openPackage(slug)
    // EP-009: user_question 和 understanding_goal 来自 Curator 预写数据。
    // 动态 import 避免循环依赖——getPackageBySlug 仅在 openPackage 时调用。
    import('./data/explorationPackages').then(({ getPackageBySlug }) => {
      const pkgData = getPackageBySlug(slug)
      if (pkgData) {
        createContext({
          explorationId: `exp-${slug}-${Date.now()}`,
          userQuestion: (pkgData.seed_topic as any)?.zh
            || (typeof pkgData.seed_topic === 'string' ? pkgData.seed_topic : pkgData.title?.zh || slug),
          understandingGoal: pkgData.exploration_goals?.zh || pkgData.summary?.zh || '',
        })
      }
    })
  }

  function closePackage() {
    pkg.closePackage()
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
          <WorkspacePanel
            current={workspaceItems[0] ?? null}
            history={workspaceHistory}
            onEntityClick={(id, name) => openEntity(id, name)}
          />
        </div>
      }
      companionDock={<CompanionShell workspaceContext={workspaceContext} onNavigateEntity={openNode} actions={policyAction ? [policyAction] : []} />}
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
            narrativeSection={
              <>
                <SummaryPanel title={result.title} summary={result.summary} />
                <FirstExplorationGuide topic={current.topic} title={result.title} starters={resolveStarters(current.topic)} onStarterClick={(t) => navigateTo(t)} />
                <StorySection narrativeKey={current.topic} />
                <WhyImportantPanel narrativeKey={current.topic} />
                <MainEntityCard mainEntity={result.exploration.main_entity} />
              </>
            }
            interpretationSection={
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
              </>
            }
            supportingSection={
              <>
                <CrossTopicView connections={result.exploration.cross_topic_related} relatedTopics={result.related_topics} focusedId={focusedEntityId ?? undefined} onEntityClick={(gid) => openEntity(gid)} onTopicClick={handleTopicClick} />
                <RelatedEntityList relatedEntities={result.exploration.related_entities} nameById={exploreNameById} mainEntityName={result.exploration.main_entity.name} onEntityClick={(id) => openEntity(`${exploreTopic}:${id}`, exploreNameById[id])} />
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
                <RelationshipContext connections={result.connections} connectionsExplained={result.connections_explained} onNodeClick={openNodeNamed} candidates={pickedCandidates} relationships={exploreThemesRelationships} timeMap={exploreEntityTimeByName} mainGlobalId={exploreEntityGlobalById[result.exploration.main_entity.id]} mainEntityName={result.exploration.main_entity.name} nameByGlobalId={exploreNameByGlobalId} />
                <InterpretationPanel interpretations={toInterpretationViewModels(result.connections_explained)} understandings={buildUnderstandingsFromConnectionsExplained(result.connections_explained, result.exploration.main_entity.name, Object.fromEntries((result.entities ?? []).map((e) => [e.global_id ?? exploreEntityGlobalById[e.id] ?? `${exploreTopic}:${e.id}`, e.name])), exploreEntityTimeByName)} onNodeClick={openNodeNamed} />
                <DisputesPanel
                  relationships={result.relationships ?? []}
                  nameById={exploreNameById}
                  globalIdById={exploreEntityGlobalById}
                  onNodeClick={openNodeNamed}
                />
                <ThemesPanel relationships={exploreThemesRelationships} onNodeClick={openNodeNamed} />
                <ContinueExploringPanel connections={result.connections_explained} crossTopicRelated={result.exploration.cross_topic_related} relatedTopics={result.related_topics} seenGlobalIds={seenGlobalIds} onNodeClick={openNodeNamed} onTopicClick={handleTopicClick} />
                <TopicComparisonPanel key={result?.topic ?? current.topic} crossTopicRelated={result.exploration.cross_topic_related} onNodeClick={openNode} onTopicClick={handleTopicClick} />
                <AIExplanationPanel contextGlobalIds={aiContextIds} onCitationClick={(gid) => openEntity(gid)} />
                <EntityPickerPanel onCandidatesChange={setPickedCandidates} />
                <MultiEntityContextPanel candidates={pickedCandidates} candidateGids={Object.values(exploreEntityGlobalById)} onCitationClick={(gid) => openEntity(gid)} />
              </>
            }
          />
        ) : null}
        entityDetail={!loading && !errorKind && current?.type === 'entity' && entityData && !packageSlug ? (
          <>
            <EntityPage key={`${current.id}:${entityInitialTab}`} entity={entityData} entityId={current.id} entityName={entityData.name} entityStarters={resolveEntityStarters(current.id)} onStarterClick={(t) => navigateTo(t)} onEntityClick={(id) => openEntity(entityGlobalIdById[id] ?? id, entityNameById[id])} onNodeClick={openNode} onTopicClick={handleTopicClick} initialTab={entityInitialTab} />
            <ExplorationPath view="journey" history={history} cursor={cursor} journeyReasons={journeyReasons} onStepClick={goTo} />
            <NextStepPanel actions={policyAction ? [policyAction] : []} seenGlobalIds={seenGlobalIds} onNodeClick={(gid, ctx) => { if (ctx) { setJourneyReasons((prev) => { const next = new Map(prev); next.set(gid, { fromGlobalId: current.id, fromName: entityData?.name ?? current.id, reasons: ctx.reason ? [ctx.reason] : [], actionType: ctx.actionType, narrativeHook: ctx.narrativeHook, confidence: ctx.confidence, capturedAt: new Date().toISOString() }); saveReasons(next); return next }) } openNode(gid) }} />
            <ContinueExploringPanel connections={entityData.connections_explained} relatedTopics={entityData.related_topics} seenGlobalIds={seenGlobalIds} onNodeClick={openNode} onTopicClick={handleTopicClick} />
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
            understand={
              <>
                <DiscoverPage topics={topics} onTopicClick={handleTopicClick} onPackageClick={openPackage} onCausalObjectClick={(objectId) => openCausalObject(objectId)} onResearchStart={() => setLandingTab('research')} onOpenResearch={(gid, name) => openEntity(gid, name, 'research')} behavioralSignals={discoverSignals} />
                <FeedbackWidget page="discover" />
              </>
            }
            research={
              <LandingPage topics={topics} loading={topicsLoading} error={topicsError} onTopicClick={handleTopicClick} featured={featuredTopics} recent={recent} onRecentSelect={navigateTo} onRecentClear={clearRecent} onQuickStart={(q) => { const { resolution, intent } = resolveEntryQuery(q); if (resolution?.kind === 'topic') { router.navigate({ topic: resolution.slug, mode: 'understanding', focus: null }); return } if (resolution?.kind === 'package') { if (intent === 'understanding') { router.navigate({ topic: resolution.slug, mode: 'understanding', focus: null }) } else { openPackage(resolution.slug) } } else if (resolution?.kind === 'entity') { openEntity(resolution.globalId) } else { setTopic(q); handleSearch(q) } }} />
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
        understandingMode={
          router.route?.mode === 'understanding' && !packageSlug ? <UnderstandingWorkspace topic={router.route?.topic ?? null} /> : null
        }
        devCatalog={null}
        isDevCatalog={false}
        isUnderstandingRoute={router.route?.mode === 'understanding'}
        hasPackage={!!packageSlug}
      />
    </ExplorerShell>
    </ExplorerRuntimeContext.Provider>
  )
}

export default App
