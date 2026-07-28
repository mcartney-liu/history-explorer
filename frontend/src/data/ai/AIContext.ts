// ============================================================
// M59-011 — AI Companion Context Model
// Unified context for all AI entry points:
// Chat, Explanation, Recommendation, Research guidance.
// One context. All AI consumers. No per-component duplication.
// ============================================================

import type { GraphNode, GraphEdge, TimelineEvent } from '../entity/entityTypes'
import type { AICapabilityId } from './AICapabilities'

export type AIViewMode = 'graph' | 'timeline' | 'map'

export interface AIContext {
  /** The entity the user is currently exploring */
  entity: {
    id: string
    name: string
    type: string
    timeLabel: string
    locationLabel: string
    summary: string
  }

  /** The current exploration view mode */
  currentView: AIViewMode

  /** Exploration state */
  exploration: {
    visitedEntities: string[]
    currentPath: string[]
    depth: number
    dominantPattern: string | null
  }

  /** What actions are available based on current data */
  availableActions: {
    explainRelation: boolean
    explainTimeline: boolean
    compare: boolean
    research: boolean
    askHistory: boolean
  }

  /** Structured data for AI prompts — not raw entity fields */
  /** M59-012: AI capabilities available in the current context */
  availableCapabilities: AICapabilityId[]
  data: {
    graphNodes: GraphNode[]
    graphEdges: GraphEdge[]
    timeline: TimelineEvent[]
    relatedEntityNames: string[]
  }
}

/**
 * Build AI context from EntityViewModel + current state.
 * This is the single entry point for all AI context generation.
 */
export function buildAIContext(params: {
  entityId: string
  entityName: string
  entityType: string
  timeLabel: string
  locationLabel: string
  summary: string
  currentView: AIViewMode
  graphNodes: GraphNode[]
  graphEdges: GraphEdge[]
  timeline: TimelineEvent[]
  visitedEntities?: string[]
}): AIContext {
  const hasRelations = params.graphEdges.length > 0
  const hasTimeline = params.timeline.length > 0
  const hasMultiple = params.graphNodes.length > 1

  return {
    entity: {
      id: params.entityId,
      name: params.entityName,
      type: params.entityType,
      timeLabel: params.timeLabel,
      locationLabel: params.locationLabel,
      summary: params.summary,
    },
    currentView: params.currentView,
    exploration: {
      visitedEntities: params.visitedEntities ?? [],
      currentPath: params.visitedEntities ?? [],
      depth: (params.visitedEntities ?? []).length,
      dominantPattern: null,
    },
    availableActions: {
      explainRelation: hasRelations,
      explainTimeline: hasTimeline,
      compare: hasMultiple,
      research: true,
      askHistory: true,
    },
    // M59-012: auto-computed from context
    availableCapabilities: [],
    data: {
      graphNodes: params.graphNodes,
      graphEdges: params.graphEdges,
      timeline: params.timeline,
      relatedEntityNames: params.graphNodes.map((n) => n.name),
    },
  }
}

/** Suggested AI prompts based on available actions */
export function getSuggestedPrompts(ctx: AIContext): string[] {
  const prompts: string[] = []
  if (ctx.availableActions.askHistory) {
    prompts.push(`Tell me about ${ctx.entity.name}`)
  }
  if (ctx.availableActions.explainRelation && ctx.data.graphEdges.length > 0) {
    const rel = ctx.data.graphEdges[0]
    prompts.push(
      `Explain the relationship: ${ctx.entity.name} → ${rel.label} → ${ctx.data.graphNodes.find((n) => n.id !== ctx.entity.id)?.name ?? '??'}`,
    )
  }
  if (ctx.availableActions.explainTimeline && ctx.data.timeline.length > 0) {
    prompts.push(`What happened around ${ctx.entity.timeLabel || ctx.data.timeline[0].year}?`)
  }
  if (ctx.availableActions.compare) {
    const other = ctx.data.relatedEntityNames.find((n) => n !== ctx.entity.name)
    if (other) prompts.push(`Compare ${ctx.entity.name} with ${other}`)
  }
  return prompts
}
