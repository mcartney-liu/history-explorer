// ============================================================
// M59-014 — AI Interaction & Action Model
// Defines the user-facing interaction states and action dispatch
// for the AI Historian Companion. No real AI calls — shell only.
// ============================================================

import type { AICapabilityId } from './AICapabilities'
import type { AIContext } from './AIContext'

// ---- Interaction States ----
export type AIInteractionState =
  | 'idle'
  | 'thinking'
  | 'explaining'
  | 'answering'
  | 'suggesting'
  | 'researching'
  | 'error'

// ---- User Action ----
export interface AIAction {
  id: string
  label: string
  capability: AICapabilityId
  /** Context fields required for this action */
  requiredContext: string[]
  /** UI icon */
  icon: string
}

export const ALL_ACTIONS: AIAction[] = [
  {
    id: 'explain_entity_action',
    label: '解释这个实体',
    capability: 'explain_entity',
    requiredContext: ['entity', 'summary'],
    icon: '📖',
  },
  {
    id: 'explain_relation_action',
    label: '解释这段关系',
    capability: 'explain_relation',
    requiredContext: ['entity', 'graphNodes', 'graphEdges'],
    icon: '🔗',
  },
  {
    id: 'explain_timeline_action',
    label: '展开时间线',
    capability: 'explain_timeline',
    requiredContext: ['entity', 'timeline'],
    icon: '◷',
  },
  {
    id: 'compare_action',
    label: '对比实体',
    capability: 'compare_entities',
    requiredContext: ['entity', 'graphNodes'],
    icon: '⇔',
  },
  {
    id: 'suggest_action',
    label: '推荐下一步',
    capability: 'suggest_exploration',
    requiredContext: ['entity', 'graphNodes'],
    icon: '⟶',
  },
  {
    id: 'research_action',
    label: '深入研究',
    capability: 'research_topic',
    requiredContext: ['entity', 'summary', 'timeline'],
    icon: '🔬',
  },
  {
    id: 'story_action',
    label: '生成历史故事',
    capability: 'generate_story',
    requiredContext: ['entity', 'summary', 'timeline'],
    icon: '📜',
  },
  {
    id: 'summarize_action',
    label: '总结本次探索',
    capability: 'summarize_research',
    requiredContext: ['entity', 'summary'],
    icon: '📝',
  },
]

// ---- Interaction Model ----
export interface AIInteraction {
  capabilityId: AICapabilityId
  state: AIInteractionState
  inputContext: AIContext
  userQuestion?: string
  response?: string
  suggestedNextActions?: string[]
  error?: string
}

/** Create an idle interaction */
export function createInteraction(
  capabilityId: AICapabilityId,
  context: AIContext,
): AIInteraction {
  return {
    capabilityId,
    state: 'idle',
    inputContext: context,
  }
}

/** Transition to thinking state */
export function startThinking(interaction: AIInteraction): AIInteraction {
  return { ...interaction, state: 'thinking', error: undefined }
}

/** Transition to a response state based on capability */
export function completeInteraction(
  interaction: AIInteraction,
  response: string,
  nextActions: string[],
): AIInteraction {
  const stateMap: Record<string, AIInteractionState> = {
    explain_entity: 'explaining',
    explain_relation: 'explaining',
    explain_timeline: 'explaining',
    compare_entities: 'answering',
    research_topic: 'researching',
    suggest_exploration: 'suggesting',
    generate_story: 'answering',
    summarize_research: 'answering',
  }
  return {
    ...interaction,
    state: stateMap[interaction.capabilityId] || 'answering',
    response,
    suggestedNextActions: nextActions,
  }
}

/** Error state */
export function failInteraction(
  interaction: AIInteraction,
  error: string,
): AIInteraction {
  return { ...interaction, state: 'error', error }
}

/** Get actions available in the current context */
export function getAvailableActions(context: AIContext): AIAction[] {
  return ALL_ACTIONS.filter((action) =>
    action.requiredContext.every((field) => {
      switch (field) {
        case 'entity':
          return !!context.entity.id
        case 'summary':
          return context.entity.summary.length > 0
        case 'timeline':
          return context.data.timeline.length > 0
        case 'graphNodes':
          return context.data.graphNodes.length > 0
        case 'graphEdges':
          return context.data.graphEdges.length > 0
        default:
          return true
      }
    }),
  )
}
