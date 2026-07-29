// ============================================================
// M41 ResearchPlanner — Deterministic Recommendation Engine
// Zero AI calls. Zero LLM. Pure functions based on entity
// relationships + research history.
// ============================================================

import type { SavedResearch } from './ResearchHistory'

// -----------------------------------------------------------
// Types
// -----------------------------------------------------------

export type RecommendationReason =
  | { kind: 'related'; relationshipType: string; viaEntity: string }
  | { kind: 'causal_chain'; position: 'cause' | 'effect' }
  | { kind: 'comparison_candidate'; sharedType: string }
  | { kind: 'from_history'; researchCount: number }
  | { kind: 'similar_type'; entityType: string }

export interface ResearchRecommendation {
  entityGlobalId: string
  entityName: string
  entityType: string
  reason: RecommendationReason
  suggestedDimensions: string[]
}

export interface EntityInfo {
  globalId: string
  name: string
  type: string
}

export interface RelationshipInfo {
  type: string
  other: EntityInfo
}

export interface PlannerInput {
  currentEntity: EntityInfo
  relationships: RelationshipInfo[]
  researchHistory: SavedResearch[]
}

// -----------------------------------------------------------
// Rules Engine
// -----------------------------------------------------------

/** Causal/temporal relationship types that imply cause-effect chains. */
const CAUSAL_RELATIONSHIPS = new Set([
  'caused', 'caused_by', 'influenced',
  'participated_in', 'before', 'after',
])

function dimensionsForType(entityType: string): string[] {
  const map: Record<string, string[]> = {
    Civilization: ['政治制度', '军事体系', '经济网络', '文化影响'],
    Event: ['背景原因', '事件过程', '直接影响', '长期意义'],
    Person: ['生平背景', '核心贡献', '历史影响', '后世评价'],
  }
  return map[entityType] ?? ['背景', '发展', '影响', '意义']
}

// -----------------------------------------------------------
// Rule 1: Relationship-driven recommendations
// -----------------------------------------------------------

function relationshipRecommendations(input: PlannerInput): ResearchRecommendation[] {
  return input.relationships
    .filter((r) => r.other.globalId && r.other.name)
    .map((r) => ({
      entityGlobalId: r.other.globalId,
      entityName: r.other.name,
      entityType: r.other.type,
      reason: {
        kind: 'related' as const,
        relationshipType: r.type,
        viaEntity: input.currentEntity.name,
      } as RecommendationReason,
      suggestedDimensions: dimensionsForType(r.other.type),
    }))
}

// -----------------------------------------------------------
// Rule 2: Causal chain recommendations
// -----------------------------------------------------------

function causalChainRecommendations(input: PlannerInput): ResearchRecommendation[] {
  return input.relationships
    .filter((r) => CAUSAL_RELATIONSHIPS.has(r.type) && r.other.globalId && r.other.name)
    .map((r) => ({
      entityGlobalId: r.other.globalId,
      entityName: r.other.name,
      entityType: r.other.type,
      reason: {
        kind: 'causal_chain' as const,
        position: r.type === 'caused' || r.type === 'before' ? 'effect' : 'cause',
      } as RecommendationReason,
      suggestedDimensions: ['前因', '后果', '关键人物', '时代背景'],
    }))
}

// -----------------------------------------------------------
// Rule 3: Comparison candidate detection
// -----------------------------------------------------------

function comparisonCandidates(input: PlannerInput): ResearchRecommendation[] {
  const currentType = input.currentEntity.type
  return input.relationships
    .filter((r) => r.other.type === currentType && r.other.globalId && r.other.name)
    .map((r) => ({
      entityGlobalId: r.other.globalId,
      entityName: r.other.name,
      entityType: r.other.type,
      reason: {
        kind: 'comparison_candidate' as const,
        sharedType: currentType,
      } as RecommendationReason,
      suggestedDimensions: dimensionsForType(currentType),
    }))
}

// -----------------------------------------------------------
// Rule 4: History-based recommendations
// -----------------------------------------------------------

function historyBasedRecommendations(input: PlannerInput): ResearchRecommendation[] {
  if (input.researchHistory.length === 0) return []

  // Find types the user has researched most frequently
  const typeCount = new Map<string, number>()
  for (const r of input.researchHistory) {
    typeCount.set(r.entityType, (typeCount.get(r.entityType) ?? 0) + 1)
  }

  // Find researched entity IDs (excluding current)
  const researchedIds = new Set(
    input.researchHistory
      .filter((r) => r.entityGlobalId !== input.currentEntity.globalId)
      .map((r) => r.entityGlobalId),
  )

  // Recommend researched entities that are NOT the current one and have relationships
  return input.relationships
    .filter((r) => researchedIds.has(r.other.globalId))
    .map((r) => ({
      entityGlobalId: r.other.globalId,
      entityName: r.other.name,
      entityType: r.other.type,
      reason: {
        kind: 'from_history' as const,
        researchCount: typeCount.get(r.other.type) ?? 1,
      } as RecommendationReason,
      suggestedDimensions: dimensionsForType(r.other.type),
    }))
}

// -----------------------------------------------------------
// Rule 5: Similar type (unexplored same-type entities)
// -----------------------------------------------------------

function similarTypeRecommendations(input: PlannerInput): ResearchRecommendation[] {
  const currentType = input.currentEntity.type
  const currentId = input.currentEntity.globalId

  // Entities of the same type that are NOT the current entity
  // and NOT already directly connected — suggest exploring them
  // (limited to what's available: relationships provide the pool)
  return input.relationships
    .filter(
      (r) =>
        r.other.type === currentType &&
        r.other.globalId &&
        r.other.globalId !== currentId &&
        r.other.name,
    )
    .map((r) => ({
      entityGlobalId: r.other.globalId,
      entityName: r.other.name,
      entityType: r.other.type,
      reason: {
        kind: 'similar_type' as const,
        entityType: currentType,
      } as RecommendationReason,
      suggestedDimensions: dimensionsForType(currentType),
    }))
}

// -----------------------------------------------------------
// Main: Generate recommendations with priorities
// -----------------------------------------------------------

export function generateRecommendations(input: PlannerInput): ResearchRecommendation[] {
  const seen = new Set<string>()

  // Priority: specific rules first, then generic
  // causal > history > comparison > generic related

  const causal = causalChainRecommendations(input).filter((r) => {
    if (seen.has(r.entityGlobalId)) return false
    seen.add(r.entityGlobalId)
    return true
  })

  const history = historyBasedRecommendations(input).filter((r) => {
    if (seen.has(r.entityGlobalId)) return false
    seen.add(r.entityGlobalId)
    return true
  })

  const comparison = comparisonCandidates(input).filter((r) => {
    if (seen.has(r.entityGlobalId)) return false
    seen.add(r.entityGlobalId)
    return true
  })

  const rel = relationshipRecommendations(input).filter((r) => {
    if (seen.has(r.entityGlobalId)) return false
    seen.add(r.entityGlobalId)
    return true
  })

  const similar = similarTypeRecommendations(input).filter((r) => {
    if (seen.has(r.entityGlobalId)) return false
    seen.add(r.entityGlobalId)
    return true
  })

  return [...causal, ...history, ...comparison, ...rel, ...similar]
}
