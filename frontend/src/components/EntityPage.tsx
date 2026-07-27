import SummaryPanel from './SummaryPanel'
import MainEntityCard, { MainEntity } from './MainEntityCard'
import RelationshipView from './RelationshipView'
import RelatedEntityList, { RelatedEntity } from './RelatedEntityList'
import TimelinePanel, { TimelineItem } from './TimelinePanel'
import ConnectionsExplainedPanel, { ConnectionExplained } from './ConnectionsExplainedPanel'
import ExplorationPathsPanel from './ExplorationPathsPanel'
import InterpretationPanel from './InterpretationPanel'
import { toInterpretationViewModels } from '../data/interpretationFormatter'
import { buildUnderstandingsFromRelationships } from '../data/understandingRules'
import { buildEntityTimeMap, type TimeValue } from '../data/temporalUtils'
import ThemesPanel from './ThemesPanel'
import CrossTopicTopicList from './CrossTopicTopicList'
import EntityExplorationGuide from './EntityExplorationGuide'
import type { NavNode } from './navigation'
import type { StarterItem } from '../data/explorationStarters'
import { RelatedTopic } from './crossTopic'
import AIExplanationPanel from './AIExplanationPanel'
import ProvenancePanel from './ProvenancePanel'
import ExplorationFlowGuide from './ExplorationFlowGuide'
import EntityHeader from './EntityHeader'
import GraphViewPanel from './GraphViewPanel'
import EventCausalChain from './EventCausalChain'
import EventImpactPanel from './EventImpactPanel'
import EventNarrativeCard from './EventNarrativeCard'
import EventNarrativeJourney from './EventNarrativeJourney'
import HistorianChat from './HistorianChat'
import JourneyCard from './JourneyCard'
import ResearchDiscoveryPanel from './ResearchDiscoveryPanel'
import ResearchPanel from './ResearchPanel'
import ResearchLibrary from './ResearchLibrary'
import StorySection from './exploration/StorySection'
import WhyImportantPanel from './exploration/WhyImportantPanel'
import { entityContext } from '../data/aiContext'
import EntityPageShell from './EntityPageShell'
import type { EntityTab } from './EntityPageShell'

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
  timeline: TimelineItem[]
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
}

// M2-002 entity page: renders the four sections the backend returns for
// GET /entity/{id} — summary, timeline, relationships, exploration. Every
// related entity stays clickable so the Explore -> Connect -> Continue loop
// keeps working from inside an entity page.
function EntityPage({
  entity,
  onEntityClick,
  onNodeClick,
  onTopicClick,
  entityId,
  entityName,
  entityStarters,
  onStarterClick,
}: EntityPageProps) {
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

      <EntityPageShell
        renderTab={(activeTab: EntityTab) => {
          switch (activeTab) {
            // ---- INFO TAB ----
            case 'info':
              return (
                <>
                  <MainEntityCard mainEntity={entity.exploration.main_entity} />
                  <RelationshipView
                    mainEntity={entity.exploration.main_entity}
                    relatedEntities={entity.exploration.related_entities}
                    nameById={nameById}
                    onEntityClick={onEntityClick}
                    onNodeClick={onNodeClick}
                  />
                  <ProvenancePanel entityId={entity.id} />
                  <ConnectionsExplainedPanel connections={entity.connections_explained} />
                  <TimelinePanel
                    timeline={entity.timeline}
                    nameToId={nameToId}
                    onEventClick={onEntityClick}
                    entityGlobalId={entityGlobalId}
                    onNodeClick={onNodeClick}
                  />
                  <GraphViewPanel
                    mainEntity={entity.exploration.main_entity}
                    relatedEntities={entity.exploration.related_entities}
                    nameById={nameById}
                    onEntityClick={onEntityClick}
                  />
                </>
              )

            // ---- EXPLORE TAB ----
            case 'explore':
              return (
                <>
                  {/* M44: HistorianChat visibility hint */}
                  <p className="explore-hint">
                    不知道从哪里开始？可以试试下方的推荐探索，或向下滚动与 AI 历史学家对话。
                  </p>
                  {entityGlobalId ? (
                    <ResearchDiscoveryPanel
                      currentEntity={{
                        globalId: entityGlobalId,
                        name: entity.name,
                        type: entity.type,
                      }}
                      relationships={(entity.relationships ?? []).map((r) => ({
                        type: r.type,
                        other: { globalId: r.other.global_id ?? '', name: r.other.name ?? '', type: r.other.type ?? '' },
                      }))}
                      onExplore={(gid) => window.location.hash = `#/entity/${encodeURIComponent(gid)}`}
                    />
                  ) : null}
                  <JourneyCard
                    relationships={entity.relationships}
                    centerEntityName={entity.name}
                    nameById={nameById}
                    onEntityClick={onEntityClick}
                  />
                  {entityGlobalId ? (
                    <HistorianChat
                      entityGlobalId={entityGlobalId}
                      entityName={entity.name}
                      entityType={entity.type}
                      relationships={entity.relationships}
                    />
                  ) : null}
                  <RelatedEntityList
                    relatedEntities={entity.exploration.related_entities}
                    nameById={nameById}
                    mainEntityName={entity.name}
                    onEntityClick={onEntityClick}
                  />
                  <ThemesPanel relationships={entity.relationships} onNodeClick={onNodeClick} />
                  <ExplorationFlowGuide />
                  {onTopicClick && (
                    <CrossTopicTopicList relatedTopics={entity.related_topics} onTopicClick={onTopicClick} />
                  )}
                </>
              )

            // ---- RESEARCH TAB ----
            case 'research':
              return (
                <>
                  {entityGlobalId ? (
                    <ResearchPanel
                      entityGlobalId={entityGlobalId}
                      entityName={entity.name}
                      entityType={entity.type}
                      relationships={entity.relationships}
                    />
                  ) : null}
                  <ResearchLibrary />
                </>
              )

            // ---- ANALYZE TAB ----
            case 'analyze':
              return (
                <>
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
                        entityGlobalId={entityGlobalId}
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
                  <ExplorationPathsPanel
                    connections={entity.connections_explained}
                    onNodeClick={onNodeClick}
                  />
                  {entityGlobalId ? (
                    <AIExplanationPanel
                      contextGlobalIds={entityContext(entityGlobalId)}
                      onCitationClick={onNodeClick}
                    />
                  ) : null}
                </>
              )

            // ---- EXTENSIONS TAB ----
            case 'extensions':
              return (
                <div className="result">
                  <p>更多功能即将推出。包括：AI 内容创作、教育模块、社交探索。</p>
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
