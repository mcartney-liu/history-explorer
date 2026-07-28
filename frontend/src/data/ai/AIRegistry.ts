// ============================================================
// M59-012 — AI Capability Registry
// Centralized query engine for AI capabilities.
// Future AI Agent calls: getCapabilitiesForContext() →
// gets a filtered list of what it can do right now.
// ============================================================

import type { AICapability, AICapabilityId, AICapabilityTrigger } from './AICapabilities'
import { ALL_CAPABILITIES } from './AICapabilities'
import type { AIContext } from './AIContext'

/** Get a single capability by id */
export function getCapability(id: AICapabilityId): AICapability | undefined {
  return ALL_CAPABILITIES.find((c) => c.id === id)
}

/** Get all capabilities */
export function getAllCapabilities(): AICapability[] {
  return ALL_CAPABILITIES
}

/** Get all capabilities triggered by a specific event */
export function getCapabilitiesByTrigger(trigger: AICapabilityTrigger): AICapability[] {
  return ALL_CAPABILITIES.filter((c) => {
    const t = c.trigger
    return Array.isArray(t) ? t.includes(trigger) : t === trigger
  })
}

/**
 * Get capabilities available in the current exploration context.
 * Filters by:
 * 1. Trigger match (based on current view/state)
 * 2. Required context availability
 */
export function getCapabilitiesForContext(ctx: AIContext): AICapability[] {
  const trigger = contextToTrigger(ctx)
  const candidates = getCapabilitiesByTrigger(trigger).concat(
    getCapabilitiesByTrigger('always'),
  )

  return candidates.filter((c) => hasRequiredContext(c, ctx))
}

/** Get capability ids available in the current context */
export function getCapabilityIds(ctx: AIContext): AICapabilityId[] {
  return getCapabilitiesForContext(ctx).map((c) => c.id)
}

/** Get suggested prompts for the current context */
export function getSuggestedCapabilities(ctx: AIContext): string[] {
  return getCapabilitiesForContext(ctx).flatMap((c) =>
    c.suggestedPromptTemplates.map((t) =>
      t
        .replace('{entity}', ctx.entity.name)
        .replace('{entityA}', ctx.entity.name)
        .replace(
          '{entityB}',
          ctx.data.relatedEntityNames.find((n) => n !== ctx.entity.name) ?? 'another entity',
        ),
    ),
  )
}

// ---- Helpers ----

function contextToTrigger(ctx: AIContext): AICapabilityTrigger {
  if (ctx.currentView === 'timeline') return 'timeline_view'
  if (ctx.currentView === 'graph' && ctx.data.graphEdges.length > 0) {
    return 'relation_selected'
  }
  if (ctx.currentView === 'graph') return 'graph_view'
  if (ctx.currentView === 'map') return 'map_view'
  return 'entity_selected'
}

function hasRequiredContext(cap: AICapability, ctx: AIContext): boolean {
  return cap.requiredContext.every((field) => {
    switch (field) {
      case 'entity':
        return !!ctx.entity.id
      case 'summary':
        return ctx.entity.summary.length > 0
      case 'timeline':
        return ctx.data.timeline.length > 0
      case 'relationship':
      case 'graphNodes':
      case 'graphEdges':
        return ctx.data.graphEdges.length > 0
      case 'visitedEntities':
        return ctx.exploration.visitedEntities.length > 0
      default:
        return true
    }
  })
}
