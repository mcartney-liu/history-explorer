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
import { takeOriginEntity } from '../runtime/originEntity'
import { getEntityNeighbors } from '../runtime/entityCache'
import { collectRelationEvidence } from '../data/continuityEngine'
import {
  buildExplanationCandidates,
  selectBestExplanation,
  expressHonestNone,
} from '../data/continuityExplanation'

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
  /** 2026-08-15 (PO): 实体页 ConnectionCard 的「查看完整行程」→ 返回来源探索包。 */
  onOpenPackage?: (slug: string) => void
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
  entityName,
  entityStarters,
  onStarterClick,
  initialTab,
  onOpenPackage,
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

  // 入口桥 (2026-08-15, PO → Phase B)：从实体 A 跳入本实体 B 时，显示 A↔B 的过渡承接。
  // 过渡逻辑统一走 ContinuityEngine + B 解释层（与 ConnectionCard 共用同一引擎，C5）：
  //   collectRelationEvidence（证据集合）→ buildExplanationCandidates（素材数组）
  //   → selectBestExplanation（B 选择器）→ bridge；NONE → expressHonestNone 诚实陈述。
  // 来源由 openEntity 按目标实体暂存（keyed），同一 B 从不同 A 进入读到最近来源 → 桥随入口变化。
  // 注：实体关系数据当前不含 evidence claim ids，故入口桥素材以关系短句为主；
  // 未来数据补 evidence 后自动升级 claim 叙述（引擎共享，调用方无需改）。
  const [originGid] = useState(() => takeOriginEntity(entityGlobalId))
  const originBridge = useMemo(() => {
    if (!originGid || !entityGlobalId) return null
    const rel = entity.relationships.find(
      (r) => r.other.global_id === originGid || r.other.id === originGid,
    )
    const fromName = rel?.other.name ?? originGid
    // 多跳路径桥：无直接边时找共同邻居（A 的缓存邻居 ∩ B 的邻居，纯内存）。
    const aNeighbors = getEntityNeighbors(originGid) ?? []
    const bGids = new Set(entity.relationships.map((r) => r.other.global_id ?? r.other.id))
    const common = aNeighbors.find((n) => bGids.has(n.gid)) ?? null
    const evidence = collectRelationEvidence(
      { gid: originGid, name: fromName },
      { gid: entityGlobalId, name: entity.name },
      { edge: rel ? { type: rel.type } : null, commonNeighbor: common },
    )
    const candidates = buildExplanationCandidates(evidence, fromName, entity.name)
    const selected = selectBestExplanation(candidates)
    const honest = evidence.some((e) => e.kind === 'NONE')
      ? expressHonestNone(fromName, entity.name)
      : null
    return { fromName, bridge: selected?.fact ?? honest?.text ?? null, confidence: selected?.confidence ?? null }
  }, [originGid, entity, entityGlobalId])

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

      {/* 入口桥 (2026-08-15, PO)：从实体 A 跳入时显示"A↔B 的关系承接"，
          无边时降级来源；无来源（直达）不渲染。 */}
      {originBridge && (
        <div className="origin-bridge" aria-label="入口承接">
          <span className="origin-bridge-kicker">
            {originBridge.bridge
              ? t('entity.origin_bridge_from', { name: originBridge.fromName })
              : t('entity.origin_bridge_fallback', { name: originBridge.fromName })}
          </span>
          {originBridge.bridge && (
            <p className="origin-bridge-text">
              {originBridge.bridge}
              {originBridge.confidence && (
                <span className={`transition-confidence transition-confidence--${originBridge.confidence}`}>
                  {t(`transition.confidence_${originBridge.confidence}`)}
                </span>
              )}
            </p>
          )}
        </div>
      )}

      {/* 探索剧本化 ③（治 D3）：从探索包点进来的实体，顶部常驻"你为什么在这里"，
          回答这一站与包主题/关系链的关系。非包内进入时 originSlug 为空，自动不渲染。 */}
      <ConnectionCard
        entityGlobalId={entityGlobalId}
        entityName={entity.name}
        onEntityClick={onEntityClick}
        onOpenPackage={onOpenPackage}
      />

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
                          onExploreNode={(id) => onEntityClick(id)}
                          onViewRelations={() => document.querySelector('.ce')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                          onViewTimeline={() => document.querySelector('.ce-timeline')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
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

                  {/* 探索剧本化 ⑤（治 D3 配套）：把"它意味着什么"语义解释从 research tab
                      上提到 info tab 默认可见——实体页一打开就呈现与该实体相关的理解叙事，
                      无需点进 research tab。组件无常数据/无理解时自渲染 null，不增加视觉噪音。
                      纯图/关系驱动、无 AI；AI 解释仍留在 research tab 门控（冻结基线）。 */}
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
