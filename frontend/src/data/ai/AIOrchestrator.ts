// ============================================================
// M59-015 — AI Orchestrator
// Central dispatch for all AI actions.
// Resolves: user action → capability → context → response.
// Mock today. Wire aiClient.call() here in production.
// ============================================================

import type { AIContext } from './AIContext'
import type { AICapabilityId } from './AICapabilities'
import type { AIInteractionState } from './AIAction'
import { getAvailableActions, type AIAction } from './AIAction'
import { getCapability } from './AIRegistry'

// ---- Request / Response ----
export interface AIRequest {
  actionId: string
  capabilityId: AICapabilityId
  context: AIContext
  userInput?: string
}

export interface AIResponse {
  interactionState: AIInteractionState
  capabilityId: AICapabilityId
  response: string
  nextActions: string[]
}

// ---- Error types ----
export class AIActionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AIActionError'
  }
}

// ---- Resolve action from registry ----
export function resolveAction(actionId: string, context: AIContext): AIAction | undefined {
  const actions = getAvailableActions(context)
  return actions.find((a) => a.id === actionId)
}

// ---- Determine response state from capability ----
function responseState(capabilityId: AICapabilityId): AIInteractionState {
  switch (capabilityId) {
    case 'explain_entity':
    case 'explain_relation':
    case 'explain_timeline':
      return 'explaining'
    case 'compare_entities':
    case 'generate_story':
    case 'summarize_research':
      return 'answering'
    case 'suggest_exploration':
      return 'suggesting'
    case 'research_topic':
      return 'researching'
    default:
      return 'answering'
  }
}

// ---- Central execution ----
/**
 * Execute an AI action through the orchestrator.
 * Resolves capability → generates mock response → returns structured result.
 *
 * Future: replace generateMockResponse() with aiClient.call().
 */
export function executeAIAction(request: AIRequest): AIResponse {
  // Validate capability exists
  const capability = getCapability(request.capabilityId)
  if (!capability) {
    throw new AIActionError(`Unknown capability: ${request.capabilityId}`)
  }

  // Validate action exists in context
  const action = resolveAction(request.actionId, request.context)
  if (!action) {
    throw new AIActionError(`Action "${request.actionId}" not available in current context`)
  }

  // Generate response (mock today — wire aiClient here in production)
  const response = generateMockResponse(request.capabilityId, request.context, request.userInput)

  return {
    interactionState: responseState(request.capabilityId),
    capabilityId: request.capabilityId,
    response,
    nextActions: buildNextActions(request.capabilityId, request.context),
  }
}

/** Async version — future wire point for streaming AI responses */
export async function executeAIActionAsync(request: AIRequest): Promise<AIResponse> {
  // Simulate network latency
  await new Promise((r) => setTimeout(r, 800))
  return executeAIAction(request)
}

// ---- Next action recommendations ----
function buildNextActions(capabilityId: AICapabilityId, context: AIContext): string[] {
  const base = ['继续探索', '深入提问']
  const other = context.data.relatedEntityNames.find((n) => n !== context.entity.name)

  switch (capabilityId) {
    case 'explain_entity':
      return other ? [`探索 ${other}`, ...base] : base
    case 'explain_relation':
      return other ? [`对比 ${other}`, '查看更多关系', ...base] : ['查看更多关系', ...base]
    case 'explain_timeline':
      return ['查看完整时间线', '探索同期事件', ...base]
    case 'compare_entities':
      return ['切换对比维度', '保存对比结果', ...base]
    case 'suggest_exploration':
      return other ? [`前往 ${other}`, ...base] : base
    case 'research_topic':
      return ['开始深度研究', '保存研究笔记', ...base]
    case 'generate_story':
      return ['保存故事', '分享', ...base]
    case 'summarize_research':
      return ['导出笔记', '开始新探索', ...base]
    default:
      return base
  }
}

// ---- Mock responses (will be replaced by aiClient) ----
function generateMockResponse(
  capabilityId: AICapabilityId,
  context: AIContext,
  userInput?: string,
): string {
  const { name, type, timeLabel } = context.entity
  const other = context.data.relatedEntityNames.find((n) => n !== name) ?? 'another entity'
  const timelineCount = context.data.timeline.length
  const userNote = userInput ? `\n\n你问的是: "${userInput}"` : ''

  switch (capabilityId) {
    case 'explain_entity':
      return `${name} 是历史上重要的${type}。${timeLabel ? `活跃于 ${timeLabel}。` : ''}其影响深远，涉及 ${context.data.graphNodes.length} 个关联实体。深度分析将在 AI 接入后呈现。${userNote}`

    case 'explain_relation':
      return `${name} 与 ${other} 之间的历史关系具有多层次含义。这些关系折射出当时政治经济军事的整体格局。全面解读将在 AI 接入后展开。${userNote}`

    case 'explain_timeline':
      return `${name} 的时间线包含 ${timelineCount} 个关键节点。${timelineCount > 0 ? `从 ${context.data.timeline[0]?.year ?? '...'} 开始，` : ''}每个事件都编织在更广阔的历史脉络中。AI 接入后将逐一深度解读。${userNote}`

    case 'compare_entities':
      return `${name} 与 ${other} 各有独特的历史坐标。对比涵盖时间跨度、空间分布、历史影响三个维度。AI 接入后将提供详尽的对比分析。${userNote}`

    case 'suggest_exploration':
      return `基于你对 ${name} 的探索路径，推荐下一步探索 ${other}。两者之间存在 ${context.data.graphEdges.length} 条可追踪的历史关联。${userNote}`

    case 'research_topic':
      return `围绕 ${name}，以下是值得深究的研究维度：政治制度演变、军事战略决策、文化交流影响、经济体系分析。选择任一方向开始系统探索。${userNote}`

    case 'generate_story':
      return `${name} 的故事始于 ${timeLabel || '历史的深处'}。${timelineCount > 0 ? `经历 ${timelineCount} 个重大转折，` : ''}最终在历史的画卷中留下了不可磨灭的印记。完整叙事将在 AI 接入后生成。${userNote}`

    case 'summarize_research':
      return `你已探索 ${name} 及其 ${context.data.graphNodes.length - 1} 个关联实体，覆盖 ${timelineCount} 个时间节点。建议将探索成果整理为研究笔记，以便后续回顾和交叉分析。${userNote}`

    default:
      return `AI Historian 已收到关于 ${name} 的查询。详细回答将在 AI 接入后提供。${userNote}`
  }
}
