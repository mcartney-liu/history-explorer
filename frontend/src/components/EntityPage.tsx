import SummaryPanel from './SummaryPanel'
import { MainEntity } from './MainEntityCard'
import { RelatedEntity } from '../data/entity/entityTypes'
import { ConnectionExplained } from './ConnectionsExplainedPanel'
import InterpretationPanel from './InterpretationPanel'
import { toInterpretationViewModels } from '../data/interpretationFormatter'
import { buildUnderstandingsFromRelationships } from '../data/understandingRules'
import { buildEntityTimeMap, type TimeValue } from '../data/temporalUtils'
import { TimelineEvent } from '../data/entity/entityTypes'
import EntityExplorationGuide from './EntityExplorationGuide'
import type { NavNode } from './navigation'
import type { StarterItem } from '../data/explorationStarters'
import { RelatedTopic } from './crossTopic'
import AIExplanationPanel from './AIExplanationPanel'
import ProvenancePanel from './ProvenancePanel'
import RelationshipInsight from './ai/RelationshipInsight'
import JourneyTrail from './ai/JourneyTrail'
import { AI_SUGGESTIONS_ENABLED } from '../data/aiFeatureFlag'
import EntityHeader from './EntityHeader'
import ConnectionCard from './package/ConnectionCard'
import EventCausalChain from './EventCausalChain'
import EventImpactPanel from './EventImpactPanel'
import EventNarrativeCard from './EventNarrativeCard'
import EventNarrativeJourney from './EventNarrativeJourney'
import HistorianChat from './HistorianChat'
import ResearchPanel, { type RestoreRequest } from './ResearchPanel'
import ResearchLibrary from './ResearchLibrary'
// 2026-08-11 (PO 方案B): 「我的」tab 收藏/最近 → 跳转后自动恢复研究
import { loadResearch, consumePendingRestore } from '../data/ResearchHistory'
import EntityRelatedList from './EntityRelatedList'
import EmptyState from './EmptyState'
import StorySection from './exploration/StorySection'
import WhyImportantPanel from './exploration/WhyImportantPanel'
import { getNarrative } from '../data/narrative'
import { entityContext } from '../data/aiContext'
import EntityPageShell from './EntityPageShell'
import type { EntityTab } from './EntityPageShell'
import { useLocale } from '../data/locale'
import { entitySectionVisible, flagEnabled, useSiteConfigRevision } from '../data/siteConfig'
// A5 (Phase 4): NextStepPanel 只读移入 L2——仅消费 App 经 props 透传的已算结果，不重算/不决策（HARD REDLINE，ADR-0025 A5）。
import NextStepPanel from './NextStepPanel'
import type { NextStepContext } from './NextStepPanel'
import type { ExplorationAction } from '../next/exploration/ExplorationPolicy'

export type EntityRelationship = {
  type: string
  source: string
  target: string
  direction: string
  other: { id: string; name: string; type: string; global_id?: string; topic?: string }
}

export type EntityDetail = {
  id: string
  type: string
  name: string
  summary: Record<string, unknown>
  timeline: TimelineEvent[]
  relationships: EntityRelationship[]
  connections_explained?: ConnectionExplained[]
  related_topics?: RelatedTopic[]
  exploration: {
    main_entity: MainEntity
    related_entities: RelatedEntity[]
  }
}

type EntityPageProps = {
  entity: EntityDetail
  onEntityClick: (id: string) => void
  // M3.5-004: cross-topic nodes already carry a full global_id (from
  // connections_explained.path / steps and relationships[].other.global_id),
  // so they are passed through WITHOUT re-prefixing (unlike onEntityClick,
  // which prefixes local ids into topic:localid).
  onNodeClick?: (globalId: string) => void
  onTopicClick?: (topic: string) => void
  // M5-A-5: Entity-level First Exploration Guide. `entityId` is the entity's
  // global_id (passed by App as current.id); `entityStarters` are already
  // resolved by App from data/explorationStarters.ts; `onStarterClick` is
  // wired by App to the SAME navigateTo used everywhere.
  entityId?: string
  entityStarters?: StarterItem[]
  onStarterClick?: (target: NavNode) => void
  /** T1: land directly on a tab (e.g. 'research' from a Discover bookmark). */
  initialTab?: EntityTab
  /** 2026-08-15 (PO): 实体页 ConnectionCard 的「查看完整行程」→ 返回来源探索包。 */
  onOpenPackage?: (slug: string) => void
  /** A5 (Phase 4): 只读透传——NextStepPanel 的已算结果由 App 经 props 搬运，
   *  EntityPage 不重算/不筛选/不排序/不决策（HARD REDLINE，ADR-0025 A5）。 */
  nextStepActions?: ExplorationAction[]
  seenGlobalIds?: Set<string>
  onNextStepClick?: (globalId: string, context?: NextStepContext) => void
}

// M2-002 entity page: renders the four sections the backend returns for
// GET /entity/{id} — summary, timeline, relationships, exploration. Every
// related entity stays clickable so the Explore -> Connect -> Continue loop
// keeps working from inside an entity page.
// M59-005: EntityViewModel integration.
// Build once per entity change. Panels still consume raw entity
// for backward compat. Future panels will use viewModel directly.
import { useMemo, useEffect, useState } from 'react'
import { buildEntityViewModel } from '../data/entity/EntityViewModel'
import { EntityHero } from './entity/EntityHero'
import { buildInsight } from '../data/entity/EntityInsightModel'
import { ConnectionExplorer } from './entity/ConnectionExplorer'
import { ExplorationGuide } from './entity/ExplorationGuide'
import { EntityExperienceHeader } from './entity/EntityExperienceHeader'

function EntityPage({
  entity,
  onEntityClick,
  onNodeClick,
  entityId,
  entityStarters,
  onStarterClick,
  initialTab,
  onOpenPackage,
  nextStepActions,
  seenGlobalIds,
  onNextStepClick,
}: EntityPageProps) {
  const { t, locale } = useLocale()
  // Subscribe to runtime site-config so feature-flag gates re-render when the
  // operator flips a switch in the admin console (defaults keep first paint
  // identical to before this layer existed).
  useSiteConfigRevision()
  // P5-S3 ③: 提升 tab 状态，使「了解→研究」可显式互跳（受控 EntityPageShell）。
  const [activeTab, setActiveTab] = useState<EntityTab>(initialTab ?? 'info')
  // T1: research restore/refresh state is LIFTED here so ResearchLibrary's
  // "打开" can drive ResearchPanel, and a save can refresh the library.
  const [restoreRequest, setRestoreRequest] = useState<RestoreRequest | null>(null)
  const [libraryRefreshKey, setLibraryRefreshKey] = useState(0)
  // M59-005: build ViewModel once per entity change.
  // Available for future EntityHero / AISidebar migration.
  const viewModel = useMemo(
    () => buildEntityViewModel(entity as Parameters<typeof buildEntityViewModel>[0]),
    [entity],
  )
  const summaryObj = entity.summary ?? {}
  const description =
    typeof summaryObj.description === 'string' ? summaryObj.description : ''

  // Build id -> name and name -> id maps from the relationship `other` info so
  // the relationship / related-entity / timeline views can resolve names (and,
  // for the timeline, event names back to entity ids) without a full entity
  // list (the /entity response is entity-scoped).
  const nameById: Record<string, string> = {}
  const nameToId: Record<string, string> = {}
  for (const r of entity.relationships) {
    if (r.other?.id) {
      nameById[r.other.id] = r.other.name
      if (r.other.name) nameToId[r.other.name] = r.other.id
    }
  }

  // M6-P1 (Temporal Context Injection): the /entity response only exposes the
  // CENTERED entity's own dates (relationship targets' dates are not returned
  // by the API). So we build a single-entry time map keyed by the centered
  // entity's name; the relationships builder resolves it via the actor-name
  // fallback. Target-side dates remain a documented Future Scope item.
  const entityGlobalId = entity.exploration.main_entity.global_id ?? entityId

  // 2026-08-11 (PO 方案B): 消费「我的」tab 写入的 pending restore ——
  // 从收藏/最近点进来时，自动恢复对应研究（复用 ResearchLibrary 的打开链路）。
  useEffect(() => {
    const pendingId = consumePendingRestore()
    if (!pendingId) return
    const research = loadResearch(pendingId)
    if (research && research.entityGlobalId === entityGlobalId) {
      setRestoreRequest({ research, requestId: Date.now() })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps — only consume once per entity visit.
  }, [entityGlobalId])

  // D8 / P4 (ADR-0025): M35「叙事板块始终可见」已退役 → 无叙事按 Progressive Presence 不渲染空态（silent）。
  // hasNarrative 仅用于门控 StorySection / WhyImportantPanel（有数据才渲染）。
  const narrativeKey = entityId ?? entity.exploration.main_entity.global_id ?? ''
  const narrativeBlock = getNarrative(narrativeKey)
  const hasNarrative = !!(narrativeBlock && (narrativeBlock.story || narrativeBlock.whyImportant))

  const centerTimeMap: Record<string, string> = buildEntityTimeMap([
    {
      name: entity.name,
      start_date: entity.summary.start_date as TimeValue | undefined,
      end_date: entity.summary.end_date as TimeValue | undefined,
    },
  ], locale)

  // D8 (L1 Narrative): 预计算"它意味着什么"面板内容，用于叙事面显隐判定（P4：无内容不渲染空壳）。
  const narrativeInterpretations = toInterpretationViewModels(entity.connections_explained)
  const narrativeUnderstandings = buildUnderstandingsFromRelationships(
    entity.relationships,
    entity.name,
    centerTimeMap,
    locale,
  )
  const hasInterpretation =
    narrativeInterpretations.length > 0 || narrativeUnderstandings.length > 0

  return (
    <div className="result">
      <EntityHeader type={entity.type} />

      {/* 探索剧本化 ③（治 D3）：从探索包点进来的实体，顶部常驻"你为什么在这里"，
          回答这一站与包主题/关系链的关系。非包内进入时 originSlug 为空，自动不渲染。 */}
      <ConnectionCard
        entityGlobalId={entityGlobalId}
        entityName={entity.name}
        onEntityClick={onEntityClick}
        onOpenPackage={onOpenPackage}
        relationships={entity.relationships}
      />

      <SummaryPanel title={entity.name} summary={description} entityType={entity.type} />

      {/* M5-A-5 (A4 重构): 实体级探索引导——压成一行轻量认知提示；
          无 starters 整卡不渲染（silent，P4 / ADR-0025），避免空态大卡占位。 */}
      {onStarterClick && entityStarters ? (
        <EntityExplorationGuide
          entityId={entityId ?? entity.id}
          starters={entityStarters}
          onStarterClick={onStarterClick}
        />
      ) : null}

      {/* M74-004-002 (2A) — Journey Trail: 全局公有探索足迹（跨实体历史轨迹），
          渲染于 tab 容器之外（所有 tab 可见），不属于任何单一 tab 视角。
          Consumes ONLY the existing UserBehaviorEvent stream. */}
      {AI_SUGGESTIONS_ENABLED && flagEnabled('journey_trail') && entitySectionVisible('journey_trail') && (
        <JourneyTrail onEntityClick={onEntityClick} />
      )}

      {/* M35 / M74 / M90.x: curated narrative + AI insights 已移入"了解"tab 内容区
          （renderTab case 'info'），不再渲染于 tab 容器之外。 */}

      <EntityPageShell
        entityGlobalId={entityGlobalId}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        renderTab={(activeTab: EntityTab) => {
          switch (activeTab) {
            // ---- INFO TAB ----
            case 'info':
              return (
                <>
                  {/* M59-018: EntityExperienceHeader — unified identity + insight + guidance */}
                  {/* M59-019: EntityInsightCard — historical insight summary */}
                  <EntityExperienceHeader
                    hero={
                      <EntityHero
                        identity={viewModel.identity}
                        globalId={entityGlobalId}
                        insightSummary={buildInsight(entity)}
                        onEntityClick={onEntityClick}
                        onResearch={() => {
                          console.log('[Research] Start research:', viewModel.identity.name)
                        }}
                        onCompare={() => {
                          console.log('[Compare] Add to compare:', viewModel.identity.name)
                        }}
                      />
                    }
                    guide={
                      <>
                        <ExplorationGuide
                          entityName={viewModel.identity.name}
                          nodes={viewModel.connections.graphNodes}
                          edges={viewModel.connections.graphEdges}
                          timelineCount={viewModel.connections.timeline.length}
                          onViewRelations={() => document.querySelector('.ce')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                          onViewTimeline={() => document.querySelector('.ce-timeline')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                        />
                      </>
                    }
                  />

                  {/* D8 (L1 Narrative): 历史叙事 → 为什么重要 → 它意味着什么，
                      合并为连续主体叙事面（Surface ≠ Card）。
                      无叙事不渲染空态（P4 / ADR-0025）；各子组件自带无数据 null，
                      InterpretationPanel 独立判定自身内容。Q3「为什么值得继续看」在此回答。 */}
                  {(entitySectionVisible('why_important') && hasNarrative) || hasInterpretation ? (
                    <section className="entity-narrative-surface" aria-label="叙事与意义">
                      {entitySectionVisible('why_important') && hasNarrative && (
                        <>
                          <StorySection narrativeKey={narrativeKey} />
                          <WhyImportantPanel narrativeKey={narrativeKey} />
                        </>
                      )}
                      <InterpretationPanel
                        interpretations={narrativeInterpretations}
                        understandings={narrativeUnderstandings}
                        onNodeClick={onNodeClick}
                        entityName={entity.name}
                      />
                    </section>
                  ) : null}

                  {/* M74-003 (C3-2) — Relationship Insight (T2): evidence-bound AI
                      exploration touchpoint. Flag-gated at the parent so OFF =
                      zero render + zero requests. Input = entity GLOBAL id. */}
                  {AI_SUGGESTIONS_ENABLED && entityId && entitySectionVisible('relationship_insight') && (
                    <RelationshipInsight
                      entityGlobalId={entityId}
                      onNextClick={(gid) => onEntityClick(gid)}
                    />
                  )}

                  {/* Layer 3: Connect — three exploration views */}
                  <ConnectionExplorer
                    graphNodes={viewModel.connections.graphNodes}
                    graphEdges={viewModel.connections.graphEdges}
                    timeline={viewModel.connections.timeline}
                    onEntityClick={onEntityClick}
                  />

                  {/* A5 (Phase 4): NextStepPanel 移入 L2 紧跟 ConnectionExplorer（只读搬运，HARD REDLINE 禁重算/筛选/排序/决策；
                      结果由 App 经 props 透传，呈现实现 IA「关系 → 下一步」顺序）。 */}
                  <NextStepPanel
                    actions={nextStepActions ?? []}
                    seenGlobalIds={seenGlobalIds}
                    onNodeClick={onNextStepClick}
                  />

                  {/* A2 (Phase 6): HistorianChat 已移至 AI tab（case 'ai'），info tab 不再内联对话。 */}

                  {/* M59-016: RelationshipView/TimelinePanel/GraphViewPanel removed from info tab.
                      Covered by ConnectionExplorer (Graph | Timeline | Map views).
                      Files preserved for rollback and other tabs. */}

                  {/* Layer 4: Data provenance */}
                  <ProvenancePanel entityId={entity.id} />
                </>
              )

            // M60-001: 'explore' merged into 'info', 'analyze' merged into 'research'
            case 'research':
              return (
                <>
                  {/* P5-S3 ③: 研究→了解 返回入口。 */}
                  <div className="entity-research-bridge entity-research-bridge--back">
                    <button
                      type="button"
                      className="entity-research-bridge-btn entity-research-bridge-btn--ghost"
                      onClick={() => setActiveTab('info')}
                    >
                      ← 回到事实
                    </button>
                  </div>

                  {/* 研究主区：研究与当前实体直接相关的基础模块 */}
                  <section className="entity-research-group">
                    <h3 className="entity-research-group__title">研究主区</h3>
                    {entityGlobalId ? (
                      <ResearchPanel
                        entityGlobalId={entityGlobalId}
                        entityName={entity.name}
                        entityType={entity.type}
                        relationships={entity.relationships}
                        restoreRequest={restoreRequest}
                        onSaved={() => setLibraryRefreshKey((n) => n + 1)}
                      />
                    ) : (
                      <EmptyState message="该实体缺少全局 ID，暂时无法启动研究模式。请从主题页或关系图重新进入。" />
                    )}
                    {entitySectionVisible('research_library') && (
                      <ResearchLibrary
                        refreshKey={libraryRefreshKey}
                        onSelect={(r) =>
                          setRestoreRequest({ research: r, requestId: Date.now() })
                        }
                      />
                    )}
                    {/* C1: 研究 tab 提供真实相关实体列表（图谱引擎驱动，纯图不碰AI）。
                        点列表项进入该实体，研究链路有逻辑、有东西可点。 */}
                    {entityGlobalId && flagEnabled('related_entities') && entitySectionVisible('related_entities') ? (
                      <EntityRelatedList gid={entityGlobalId} onEntityClick={onEntityClick} />
                    ) : null}
                  </section>

                  {/* 事件专属区：仅 Event 类型实体展示，带"仅事件"标识 */}
                  {entity.type === 'Event' && (
                    <section className="entity-research-group entity-research-group--event">
                      <h3 className="entity-research-group__title">
                        事件专属
                        <span className="entity-research-group__badge">仅事件</span>
                      </h3>
                      <EventCausalChain
                        relationships={entity.relationships}
                        centerEntityName={entity.name}
                        nameById={nameById}
                        onEntityClick={onEntityClick}
                      />
                      <EventImpactPanel
                        relationships={entity.relationships}
                        centerEntityName={entity.name}
                        nameById={nameById}
                        onEntityClick={onEntityClick}
                      />
                      <EventNarrativeCard
                        entityGlobalId={entityGlobalId ?? ''}
                        entityName={entity.name}
                        relationships={entity.relationships}
                        onEntityClick={onEntityClick}
                      />
                      <EventNarrativeJourney
                        relationships={entity.relationships}
                        centerEntityName={entity.name}
                        nameById={nameById}
                        onEntityClick={onEntityClick}
                        currentTopic={entityGlobalId?.split(':')[0]}
                      />
                    </section>
                  )}

                  {/* 解读与 AI 区：基于关系的理解 + AI 溯源解释 */}
                  <section className="entity-research-group">
                    <h3 className="entity-research-group__title">解读与 AI</h3>
                    {entityGlobalId ? (
                      <AIExplanationPanel
                        contextGlobalIds={entityContext(entityGlobalId)}
                        onCitationClick={onNodeClick}
                        entityName={entity.name}
                      />
                    ) : (
                      <EmptyState message="该实体缺少全局 ID，AI 解释暂不可用。" />
                    )}
                  </section>
                </>
              )

            // ---- AI TAB (D7 甲案): 对话式历史学家 HistorianChat ----
            case 'ai':
              return (
                <>
                  <p className="explore-hint">
                    {t('entity.exploreHint')}
                  </p>
                  {entityGlobalId ? (
                    <HistorianChat
                      entityGlobalId={entityGlobalId}
                      entityName={entity.name}
                      entityType={entity.type}
                      relationships={entity.relationships}
                    />
                  ) : (
                    <EmptyState message="该实体缺少全局 ID，AI 对话暂不可用。" />
                  )}
                </>
              )

            default:
              return null
          }
        }}
      />
    </div>
  )
}

export default EntityPage
