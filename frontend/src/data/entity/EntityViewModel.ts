// ============================================================
// M59-005 — EntityViewModel Builder
// Converts raw EntityDetail (API shape) into structured
// EntityViewModel for consumption by all entity-related UI.
// One-pass conversion. All extraction delegated to helpers.
// ============================================================

import type { EntityDetail, EntityViewModel } from './entityTypes'
import {
  extractTime,
  extractLocation,
  extractKeyFacts,
  extractSummary,
  extractSignificance,
  buildGraph,
  buildTopRelations,
  buildAIContext,
} from './entityExtractors'
import { getEntityLabel } from './entityLabels'

/**
 * Build a structured EntityViewModel from raw API data.
 *
 * This is the single entry point for all entity data transformation.
 * Panels should consume the ViewModel, not the raw EntityDetail.
 */
export function buildEntityViewModel(entity: EntityDetail): EntityViewModel {
  const graph = buildGraph(entity)

  return {
    identity: {
      id: entity.id,
      name: entity.name,
      type: entity.type,
      timeLabel: extractTime(entity),
      locationLabel: extractLocation(entity),
      keyFacts: extractKeyFacts(entity),
    },
    understanding: {
      summary: extractSummary(entity),
      significance: extractSignificance(entity),
      entityTypeLabel: getEntityLabel(entity.type),
    },
    connections: {
      graphNodes: graph.nodes,
      graphEdges: graph.edges,
      timeline: entity.timeline,
      topRelations: buildTopRelations(entity.relationships),
      aiContext: buildAIContext(entity),
    },
    exploration: {
      researchReady: !!entity.id,
      provenanceReady: !!entity.id,
    },
  }
}

export type { EntityDetail, EntityViewModel } from './entityTypes'
