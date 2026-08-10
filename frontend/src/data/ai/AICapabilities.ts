// ============================================================
// M59-012 — AI Capability Definitions
// Complete catalog of what the AI Historian can do.
// Not tied to any component or API. Pure capability registry.
//
// ADR-0021 R2 — the user-facing half of each capability (name,
// description, suggested prompts) is editable at runtime through the
// Content Configuration Layer (#/admin, module `ai_capabilities`).
// The BEHAVIOURAL half (id, trigger, requiredContext, requiresModel)
// is not: those drive dispatch, and letting copy edits reach them
// would turn a wording change into a logic change.
//
// `ALL_CAPABILITIES` stays the shipped default — read it for the
// static catalog; call `allCapabilities()` when you want configured
// copy applied.
// ============================================================

import { slotDesc, slotItems, slotTitle } from '../contentRuntime'

export type AICapabilityId =
  | 'explain_entity'
  | 'explain_relation'
  | 'explain_timeline'
  | 'compare_entities'
  | 'research_topic'
  | 'suggest_exploration'
  | 'generate_story'
  | 'summarize_research'

export type AICapabilityTrigger =
  | 'entity_selected'
  | 'relation_selected'
  | 'timeline_view'
  | 'graph_view'
  | 'map_view'
  | 'research_mode'
  | 'workspace'
  | 'always'

export interface AICapability {
  id: AICapabilityId
  name: string
  description: string
  /** When this capability should be suggested */
  trigger: AICapabilityTrigger | AICapabilityTrigger[]
  /** Context fields required for this capability to work */
  requiredContext: string[]
  /** Template prompts for the UI */
  suggestedPromptTemplates: string[]
  /** Will this need an LLM call in production? */
  requiresModel: boolean
}

export const ALL_CAPABILITIES: AICapability[] = [
  {
    id: 'explain_entity',
    name: '解释实体',
    description: '解释这个历史实体的重要性和历史意义',
    trigger: 'entity_selected',
    requiredContext: ['entity', 'summary'],
    suggestedPromptTemplates: [
      '谁是这个人物？',
      '这个文明为什么重要？',
      '这个事件的历史背景是什么？',
    ],
    requiresModel: true,
  },
  {
    id: 'explain_relation',
    name: '解释关系',
    description: '解释两个历史实体之间关系的历史意义',
    trigger: 'relation_selected',
    requiredContext: ['entity', 'relationship', 'graphNodes'],
    suggestedPromptTemplates: [
      '为什么 {entityA} 和 {entityB} 有这样的关系？',
      '这段关系如何影响了历史进程？',
    ],
    requiresModel: true,
  },
  {
    id: 'explain_timeline',
    name: '解释时间线',
    description: '解释时间线中关键事件的背景和影响',
    trigger: 'timeline_view',
    requiredContext: ['entity', 'timeline'],
    suggestedPromptTemplates: [
      '{entity} 的时间线中最关键的事件是什么？',
      '这段时间内发生了什么转折？',
    ],
    requiresModel: true,
  },
  {
    id: 'compare_entities',
    name: '对比实体',
    description: '对比两个或多个历史实体，分析异同',
    trigger: ['graph_view', 'workspace'],
    requiredContext: ['entity', 'graphNodes', 'graphEdges'],
    suggestedPromptTemplates: [
      '对比 {entityA} 和 {entityB}',
      '两者在历史上的影响有何不同？',
    ],
    requiresModel: true,
  },
  {
    id: 'research_topic',
    name: '研究主题',
    description: '围绕当前主题生成深度研究问题和方向',
    trigger: 'research_mode',
    requiredContext: ['entity', 'summary', 'timeline'],
    suggestedPromptTemplates: [
      '关于 {entity} 有哪些值得深入研究的方面？',
      '有什么学术争议需要了解？',
    ],
    requiresModel: true,
  },
  {
    id: 'suggest_exploration',
    name: '推荐探索',
    description: '推荐下一个值得探索的历史实体或路径',
    trigger: ['entity_selected', 'workspace'],
    requiredContext: ['entity', 'graphNodes', 'graphEdges'],
    suggestedPromptTemplates: [
      '探索完 {entity} 后，下一步应该看什么？',
      '和 {entity} 相关的还有什么？',
    ],
    requiresModel: true,
  },
  {
    id: 'generate_story',
    name: '生成故事',
    description: '以叙事方式生成一个历史故事',
    trigger: 'workspace',
    requiredContext: ['entity', 'summary', 'timeline'],
    suggestedPromptTemplates: [
      '讲一个关于 {entity} 的历史故事',
      '{entity} 最精彩的时刻是什么？',
    ],
    requiresModel: true,
  },
  {
    id: 'summarize_research',
    name: '总结研究',
    description: '总结当前探索成果，形成研究笔记',
    trigger: 'workspace',
    requiredContext: ['entity', 'summary', 'visitedEntities'],
    suggestedPromptTemplates: [
      '总结我对 {entity} 的探索收获',
      '我在这段探索中了解了什么？',
    ],
    requiresModel: true,
  },
]

/** Registry slot backing a capability, e.g. `ai_capabilities.explain_entity`. */
export function capabilitySlotId(id: AICapabilityId): string {
  return `ai_capabilities.${id}`
}

/**
 * The catalog with configured copy applied.
 *
 * Synchronous and allocation-cheap: the overlay is an in-memory map, so this
 * is safe to call during render. With nothing configured it returns copies of
 * the shipped definitions.
 */
export function allCapabilities(): AICapability[] {
  return ALL_CAPABILITIES.map((cap) => {
    const slot = capabilitySlotId(cap.id)
    return {
      ...cap,
      name: slotTitle(slot, cap.name),
      description: slotDesc(slot, cap.description),
      suggestedPromptTemplates: [...slotItems(slot, cap.suggestedPromptTemplates)],
    }
  })
}
