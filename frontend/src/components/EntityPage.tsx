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
import StorySection from './exploration/StorySection'
import WhyImportantPanel from './exploration/WhyImportantPanel'
import { entityContext } from '../data/aiContext'

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

      <MainEntityCard mainEntity={entity.exploration.main_entity} />

      <RelationshipView
        mainEntity={entity.exploration.main_entity}
        relatedEntities={entity.exploration.related_entities}
        nameById={nameById}
        onEntityClick={onEntityClick}
        onNodeClick={onNodeClick}
      />

      {/* M36.1: Event intelligence views — additive Event-only panels between
          RelationshipView and GraphViewPanel. Zero impact on non-Event types. */}
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
        </>
      )}

      {/* M34-A2: spatial view of the centred entity + its direct neighbours,
          reusing the same relationship data (no new API / dependency). */}
      <GraphViewPanel
        mainEntity={entity.exploration.main_entity}
        relatedEntities={entity.exploration.related_entities}
        nameById={nameById}
        onEntityClick={onEntityClick}
      />

      <ExplorationFlowGuide />

      {onTopicClick && (
        <CrossTopicTopicList relatedTopics={entity.related_topics} onTopicClick={onTopicClick} />
      )}

      <RelatedEntityList
        relatedEntities={entity.exploration.related_entities}
        nameById={nameById}
        mainEntityName={entity.name}
        onEntityClick={onEntityClick}
      />

      {/* M30-A: provenance projection UI. Pass the LOCAL id (entity.id), not the
          global_id prop, so backend resolve() matches claim.subject_id verbatim. */}
      <ProvenancePanel entityId={entity.id} />

      <ConnectionsExplainedPanel connections={entity.connections_explained} />

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

      <TimelinePanel
        timeline={entity.timeline}
        nameToId={nameToId}
        onEventClick={onEntityClick}
        entityGlobalId={entityGlobalId}
        onNodeClick={onNodeClick}
      />

      <ThemesPanel relationships={entity.relationships} onNodeClick={onNodeClick} />

      {entityGlobalId ? (
        <AIExplanationPanel
          contextGlobalIds={entityContext(entityGlobalId)}
          onCitationClick={onNodeClick}
        />
      ) : null}
    </div>
  )
}

export default EntityPage
