// ============================================================
// M59-005 — Centralized Entity Type Definitions
// Migrated from scattered component-local type definitions.
// Single source of truth for all entity-related data shapes.
// ============================================================

// ---- Entity Type Enum ----
export const ENTITY_TYPES = [
  'Civilization',
  'Event',
  'Person',
  'Religion',
  'Technology',
  'Location',
  'Idea',
  'Time Period',
] as const

export type EntityType = (typeof ENTITY_TYPES)[number]

// ---- Entity Relationship ----
export interface EntityRelationship {
  type: string
  source: string
  target: string
  direction: string
  other: {
    id: string
    name: string
    type: string
    global_id?: string
    topic?: string
  }
}

// ---- Timeline ----
export interface TimelineEvent {
  year?: number | string
  label?: string
  description?: string
  event?: string
  name?: string
  date?: string
  [key: string]: unknown
}

// ---- Main Entity (exploration center) ----
export interface MainEntity {
  id?: string
  name: string
  type: string
  summary?: string
  image?: string
  timeline?: string
  [key: string]: unknown
}

// ---- Related Entity ----
export interface RelatedEntity {
  id?: string
  name: string
  type: string
  global_id?: string
  topic?: string
  [key: string]: unknown
}

// ---- Connection Explained ----
export interface ConnectionExplained {
  path?: unknown[]
  steps?: unknown[]
  [key: string]: unknown
}

// ---- Related Topic ----
export interface RelatedTopic {
  slug?: string
  label?: string
  [key: string]: unknown
}

// ---- Raw API Entity Shape (what App.tsx receives) ----
export interface EntityDetail {
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

// ---- Graph types ----
export interface GraphNode {
  id: string
  name: string
  type: string
}

export interface GraphEdge {
  source: string
  target: string
  relation: string
  label: string
}

// ---- Entity View Model ----
export interface EntityViewModel {
  identity: {
    id: string
    name: string
    type: string
    timeLabel: string
    locationLabel: string
    keyFacts: string[]
  }
  understanding: {
    summary: string
    significance: string
    entityTypeLabel: string
  }
  connections: {
    graphNodes: GraphNode[]
    graphEdges: GraphEdge[]
    timeline: TimelineEvent[]
    topRelations: EntityRelationship[]
    aiContext: string
  }
  exploration: {
    researchReady: boolean
    provenanceReady: boolean
  }
}
