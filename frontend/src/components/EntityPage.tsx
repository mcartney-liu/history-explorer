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
  entityName?: string
  entityStarters?: StarterItem[]
  onStarterClick?: (target: NavNode) => void
  /** T1: land directly on a tab (e.g. 'research' from a Discover bookmark). */
  initialTab?: EntityTab
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
import { ExplorationCard } from './entity/ExplorationCard'
import { buildCardsFromViewModel } from '../data/entity/ExplorationCardModel'
import { getEntityLabel, getEntityIcon } from '../data/entity/entityLabels'
import { buildInsight } from '../data/entity/EntityInsightModel'
import { EntityInsightCard } from './entity/EntityInsightCard'
import { ConnectionExplorer } from './entity/ConnectionExplorer'
import { ExplorationGuide } from './entity/ExplorationGuide'
import { EntityExperienceHeader } from './entity/EntityExperienceHeader'

function EntityPage({
  entity,
  onEntityClick,
  onNodeClick,
  entityId,
  entityName,
  entityStarters,
  onStarterClick,
  initialTab,
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
  const relatedCards = useMemo(
    () =>
      buildCardsFromViewModel(
        viewModel.connections.graphNodes.filter((n) => n.id !== entity.id),
        viewModel.connections.graphEdges,
        getEntityLabel,
        getEntityIcon,
        locale,
        t,
      ),
    [viewModel, entity.id, locale, t],
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

  // M35 curated narrative: 板块始终可见（PO 判定），无叙事数据时渲染空态占位。
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

  return (
    <div className="result">
      <EntityHeader type={entity.type} />

      <SummaryPanel title={entity.name} summary={description} />

      {/* M5-A-5: 实体级探索引导——始终渲染（有数据列起点，无数据显空态），
          避免"没数据显示→整块消失"造成"功能不存在"的误解（PO 判定）。 */}
      {onStarterClick && entityStarters ? (
        <EntityExplorationGuide
          entityId={entityId ?? entity.id}
          entityName={entityName ?? entity.name}
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
                        <EntityInsightCard
                          insight={buildInsight(entity)}
                          entitySlug={entity.id}
                        />
                        <ExplorationGuide
                          entityName={viewModel.identity.name}
                          nodes={viewModel.connections.graphNodes}
                          edges={viewModel.connections.graphEdges}
                          timelineCount={viewModel.connections.timeline.length}
                          onExploreNode={(id) => onEntityClick(id)}
                        />
                      </>
                    }
                  />

                  {/* M35 Feature C: curated narrative (StorySection / WhyImportantPanel).
                      narrativeKey carries the GLOBAL id so narrative.ts lookup matches
                      its global_id keys. No AI — copy is hand-authored.
                      无叙事数据时渲染空态占位（板块始终可见，PO 判定）。 */}
                  {entitySectionVisible('why_important') && (
                    hasNarrative ? (
                      <>
                        <StorySection narrativeKey={narrativeKey} />
                        <WhyImportantPanel narrativeKey={narrativeKey} />
                      </>
                    ) : (
                      <EmptyState message={t('entity.narrativeEmpty')} />
                    )
                  )}

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

                  {/* Layer 3: Related entities */}
                  {relatedCards.length > 0 && (
                    <div className="explore-section">
                      <h4 className="explore-section-title">{t('entity.continue')}</h4>
                      <div className="explore-section-grid">
                        {relatedCards.map((card) => (
                          <ExplorationCard
                            key={card.id}
                            model={card}
                            onClick={(target) => onEntityClick(target)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* M60-001: AI conversation — from old 'explore' tab */}
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
                    <InterpretationPanel
                      interpretations={toInterpretationViewModels(entity.connections_explained)}
                      understandings={buildUnderstandingsFromRelationships(
                        entity.relationships,
                        entity.name,
                        centerTimeMap,
                        locale,
                      )}
                      onNodeClick={onNodeClick}
                      entityName={entity.name}
                    />
                    {entityGlobalId ? (
                      <AIExplanationPanel
                        contextGlobalIds={entityContext(entityGlobalId)}
                        onCitationClick={onNodeClick}
                      />
                    ) : (
                      <EmptyState message="该实体缺少全局 ID，AI 解释暂不可用。" />
                    )}
                  </section>
                </>
              )

            // ---- EXTENSIONS TAB ----
            case 'extensions':
              return (
                <div className="result">
                  <p>{t('entity.extensionsComing')}</p>
                </div>
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
