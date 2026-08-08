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
import EmptyState from './EmptyState'
import StorySection from './exploration/StorySection'
import WhyImportantPanel from './exploration/WhyImportantPanel'
import { entityContext } from '../data/aiContext'
import EntityPageShell from './EntityPageShell'
import type { EntityTab } from './EntityPageShell'
import { useLocale } from '../data/locale'

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
import { useMemo, useState } from 'react'
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
  const { t } = useLocale()
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
      ),
    [viewModel, entity.id],
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

  const centerTimeMap: Record<string, string> = buildEntityTimeMap([
    {
      name: entity.name,
      start_date: entity.summary.start_date as TimeValue | undefined,
      end_date: entity.summary.end_date as TimeValue | undefined,
    },
  ])

  return (
    <div className="result">
      <EntityHeader type={entity.type} />

      <SummaryPanel title={entity.name} summary={description} />

      {onStarterClick && entityStarters && entityStarters.length > 0 ? (
        <EntityExplorationGuide
          entityId={entityId ?? entity.id}
          entityName={entityName ?? entity.name}
          starters={entityStarters}
          onStarterClick={onStarterClick}
        />
      ) : null}

      {/* M35 Feature C: curated narrative (StorySection / WhyImportantPanel).
          narrativeKey carries the GLOBAL id so narrative.ts lookup matches
          its global_id keys (OI-1 fix: Design Freeze used entity.id local id,
          but narrative keys are global_ids). No AI — copy is hand-authored. */}
      <StorySection narrativeKey={entityId ?? entity.exploration.main_entity.global_id ?? ''} />
      <WhyImportantPanel narrativeKey={entityId ?? entity.exploration.main_entity.global_id ?? ''} />

      {/* M74-003 (C3-2) — Relationship Insight (T2): evidence-bound AI
          exploration touchpoint, an ENHANCEMENT LAYER beside (never replacing)
          the curated narrative. Flag-gated at the parent so OFF = zero render
          + zero requests (M73 byte-identical). Input = the entity GLOBAL id
          (entityId prop); every fact comes from the backend response. */}
      {AI_SUGGESTIONS_ENABLED && entityId && <RelationshipInsight entityGlobalId={entityId} />}

      {/* M74-004-002 (2A) — Journey Trail: exploration path visualization.
          Consumes ONLY the existing UserBehaviorEvent stream (no new
          collection, no profiling). Same flag so OFF = M73 byte-identical. */}
      {AI_SUGGESTIONS_ENABLED && <JourneyTrail onEntityClick={onEntityClick} />}

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

                  {/* P5-S3 ③: 了解→研究 显式入口：就当前事实实体提出研究问题。 */}
                  <div className="entity-research-bridge">
                    <button
                      type="button"
                      className="entity-research-bridge-btn"
                      onClick={() => setActiveTab('research')}
                    >
                      就「{entity.name}」提出研究问题 →
                    </button>
                    <span className="entity-research-bridge-hint">
                      从客观事实，进入开放探索：追问它「为什么」。
                    </span>
                  </div>
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
                  <ResearchLibrary
                    refreshKey={libraryRefreshKey}
                    onSelect={(r) =>
                      setRestoreRequest({ research: r, requestId: Date.now() })
                    }
                  />
                  {/* M60-001: analyze tab merged into research */}
                  {entity.type === 'Event' && (
                    <>
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
                    </>
                  )}
                  <InterpretationPanel
                    interpretations={toInterpretationViewModels(entity.connections_explained)}
                    understandings={buildUnderstandingsFromRelationships(
                      entity.relationships,
                      entity.name,
                      centerTimeMap,
                    )}
                    onNodeClick={onNodeClick}
                  />
                  {entityGlobalId ? (
                    <AIExplanationPanel
                      contextGlobalIds={entityContext(entityGlobalId)}
                      onCitationClick={onNodeClick}
                    />
                  ) : (
                    <EmptyState message="该实体缺少全局 ID，AI 解释暂不可用。" />
                  )}
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
