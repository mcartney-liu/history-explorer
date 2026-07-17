import SummaryPanel from './SummaryPanel'
import MainEntityCard, { MainEntity } from './MainEntityCard'
import RelationshipView from './RelationshipView'
import RelatedEntityList, { RelatedEntity } from './RelatedEntityList'
import TimelinePanel, { TimelineItem } from './TimelinePanel'
import ConnectionsExplainedPanel, { ConnectionExplained } from './ConnectionsExplainedPanel'
import ExplorationPathsPanel from './ExplorationPathsPanel'
import ThemesPanel from './ThemesPanel'
import CrossTopicTopicList from './CrossTopicTopicList'
import { RelatedTopic } from './crossTopic'

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
}

// M2-002 entity page: renders the four sections the backend returns for
// GET /entity/{id} — summary, timeline, relationships, exploration. Every
// related entity stays clickable so the Explore -> Connect -> Continue loop
// keeps working from inside an entity page.
function EntityPage({ entity, onEntityClick, onNodeClick, onTopicClick }: EntityPageProps) {
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

  return (
    <div className="result">
      <div className="result-section entity-page-head">
        <h3>Entity</h3>
        <span className="re-type">{entity.type}</span>
      </div>

      <SummaryPanel title={entity.name} summary={description} />
      <MainEntityCard mainEntity={entity.exploration.main_entity} />

      <RelationshipView
        mainEntity={entity.exploration.main_entity}
        relatedEntities={entity.exploration.related_entities}
        nameById={nameById}
        onEntityClick={onEntityClick}
      />

      {onTopicClick && (
        <CrossTopicTopicList relatedTopics={entity.related_topics} onTopicClick={onTopicClick} />
      )}

      <RelatedEntityList
        relatedEntities={entity.exploration.related_entities}
        nameById={nameById}
        mainEntityName={entity.name}
        onEntityClick={onEntityClick}
      />

      <ConnectionsExplainedPanel connections={entity.connections_explained} />

      <ExplorationPathsPanel
        connections={entity.connections_explained}
        onNodeClick={onNodeClick}
      />

      <TimelinePanel
        timeline={entity.timeline}
        nameToId={nameToId}
        onEventClick={onEntityClick}
      />

      <ThemesPanel relationships={entity.relationships} onNodeClick={onNodeClick} />
    </div>
  )
}

export default EntityPage
