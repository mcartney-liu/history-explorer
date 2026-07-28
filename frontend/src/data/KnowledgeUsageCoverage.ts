// ============================================================
// M50 - KnowledgeUsageCoverage
// Usage-informed knowledge coverage from user behavior events.
// Measures which entity types users have actually explored.
// Does NOT claim knowledge graph completeness.
//
// "Unexplored" != "Missing". "Unknown" != "Zero".
// No AI. No backend. No UI.
// ============================================================

import type { UserBehaviorEvent } from './UserBehaviorEvent'

// Frontend mirror of known entity types (from KnowledgeCoverage baseline)
const KNOWN_ENTITY_TYPES: string[] = [
  'Civilization',
  'Event',
  'Person',
  'Religion',
  'Technology',
  'Location',
  'Idea',
]

// -----------------------------------------------------------
// Types
// -----------------------------------------------------------

export interface KnowledgeUsageCoverage {
  exploredEntityTypes: string[]
  unexploredEntityTypes: string[]
  /** Whether relationship usage data is available from events. */
  relationshipDataAvailable: boolean
  exploredRelationshipTypes: string[]
  unexploredRelationshipTypes: string[]
  topEntryEntities: string[]
  /** relationshipCoverage is null when event data source does not exist. */
  coverageRatio: {
    entityCoverage: number
    relationshipCoverage: number | null
  }
  insights: string[]
}

// -----------------------------------------------------------
// Computation
// -----------------------------------------------------------

function entityTypesFrom(events: UserBehaviorEvent[]): Set<string> {
  const set = new Set<string>()
  for (const e of events) {
    if (e.entityType) set.add(e.entityType)
  }
  return set
}

function topEntries(events: UserBehaviorEvent[]): string[] {
  const map = new Map<string, number>()
  for (const e of events) {
    if (['click_entity', 'open_entity', 'start_research'].includes(e.action) && e.entityGlobalId) {
      map.set(e.entityGlobalId, (map.get(e.entityGlobalId) ?? 0) + 1)
    }
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([k]) => k)
}

// -----------------------------------------------------------
// Public API
// -----------------------------------------------------------

export function analyzeKnowledgeUsageCoverage(
  events: UserBehaviorEvent[],
): KnowledgeUsageCoverage {
  const explored = entityTypesFrom(events)
  const exploredSet = new Set(explored)
  const unexplored = KNOWN_ENTITY_TYPES.filter((t) => !exploredSet.has(t))

  const relationshipDataAvailable = false

  const entityCoverage = KNOWN_ENTITY_TYPES.length > 0
    ? exploredSet.size / KNOWN_ENTITY_TYPES.length
    : 0

  const entries = topEntries(events)

  return {
    exploredEntityTypes: Array.from(exploredSet),
    unexploredEntityTypes: unexplored,
    relationshipDataAvailable,
    exploredRelationshipTypes: [],
    unexploredRelationshipTypes: [],
    topEntryEntities: entries,
    coverageRatio: { entityCoverage, relationshipCoverage: null },
    insights: buildInsights(exploredSet.size, unexplored),
  }
}

// -----------------------------------------------------------
// Insights
// -----------------------------------------------------------

function buildInsights(exploredCount: number, unexploredEntities: string[]): string[] {
  const result: string[] = []
  if (exploredCount === 0) {
    result.push('No user exploration data')
  } else {
    result.push(`User explored ${exploredCount} entity types`)
    if (unexploredEntities.length > 0) {
      result.push(`${unexploredEntities.length} entity types not yet visited: ${unexploredEntities.slice(0, 3).join(', ')}`)
    }
  }
  result.push('Relationship usage data unavailable (events lack relationshipType)')
  return result
}
