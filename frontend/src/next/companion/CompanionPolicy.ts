/**
 * M87.1 — CompanionPolicy
 *
 * AI Companion 的 Policy 层（第四个 Domain Module）。
 * 接收 CompanionContext → 输出 Decision<CompanionResponsePayload>。
 *
 * 约束（M87.0）：
 *   - Companion 是 Domain Module（非 AI 黑盒）
 *   - Policy 决定 → LLM 表达（M87.1 不调用 LLM）
 *   - 复用 Decision<T> / PolicyContext（从 runtime/evaluation 导入）
 *   - 输入全部 Projection / Context（不访问 MemoryStore）
 *   - RuleTrace 可解释，Replay 可回放
 */

import type { Decision, PolicyContext } from '../../runtime/evaluation/Decision'
import type { UnderstandingProjection } from '../UnderstandingProjection'
import type { MemoryProjection } from '../memory/MemoryProjection'

// ============================================================================
// Companion Domain 类型
// ============================================================================

export interface ConversationContext {
  sessionRef: string
  currentTopic: string
  userIntent: string                       // 由 Policy 判定，非 LLM
  lastDecisionRef: string | null
  activeExplorationRef: string | null
  currentWorkspaceState: string | null
}

export interface CompanionContext {
  conversation: ConversationContext
  understandingProjection: UnderstandingProjection | null
  memoryProjection: MemoryProjection | null
  availableKnowledgeSpace: string[]
}

export type CompanionActionType =
  | 'explain'      // 解释当前理解
  | 'suggest'      // 推荐下一探索方向
  | 'question'     // 主动提出澄清问题
  | 'summarize'    // 总结当前理解
  | 'connect'      // 建立跨主题关联（未来）

export interface CompanionResponsePayload {
  actionType: CompanionActionType
  targetRef: string
  structuredContent: {
    keyPoints: string[]
    references: string[]
  }
  suggestedNextStep: string | null
  confidence: number
}

// ============================================================================
// CompanionPolicy
// ============================================================================

/**
 * evaluateCompanion()
 *
 * 基于当前探索上下文和用户意图，决定 Companion 的回应策略。
 *
 * 规则（M87.1 第一版——验证 Policy 可产生稳定 Decision）：
 *   1. userIntent = 'explain' → explain
 *   2. missingLinks > 0 → question（主动引导）
 *   3. stage = UNDERSTANDING → summarize（总结理解）
 *   4. 默认 → suggest（推荐下一步）
 */
export function evaluateCompanion(
  ctx: CompanionContext,
  policyContext: PolicyContext,
): Decision<CompanionResponsePayload> {
  const { conversation, understandingProjection, memoryProjection } = ctx

  // 1. 用户要求理解原因 → explain
  if (conversation.userIntent === 'explain') {
    const projection = understandingProjection
    const keyPoints = projection
      ? [
          `当前理解阶段: ${projection.stage}`,
          `覆盖维度: ${projection.coverageState.coveredDimensions.join(', ') || '无'}`,
          `覆盖比例: ${Math.round(projection.coverageState.coverageRatio * 100)}%`,
        ]
      : ['暂无理解数据']

    return makeDecision(policyContext, {
      actionType: 'explain',
      targetRef: conversation.currentTopic,
      structuredContent: {
        keyPoints,
        references: understandingProjection?.knownObjects.map((o) => o.anchorRef) ?? [],
      },
      suggestedNextStep: null,
      confidence: 0.9,
    }, [{
      ruleId: 'companion-explain',
      inputs: { userIntent: 'explain', hasProjection: !!understandingProjection },
      decision: true,
    }])
  }

  // 2. missingLinks > 0 → question（主动引导）
  if (understandingProjection && understandingProjection.missingLinks.length > 0) {
    const missing = understandingProjection.missingLinks[0]
    return makeDecision(policyContext, {
      actionType: 'question',
      targetRef: missing.toRef,
      structuredContent: {
        keyPoints: [
          `你已了解 ${missing.fromRef}，但它与 ${missing.toRef} 的关系尚未探索`,
          `探索这个关系可以帮助你更完整地理解当前主题`,
        ],
        references: [missing.fromRef, missing.toRef],
      },
      suggestedNextStep: missing.toRef,
      confidence: 0.8,
    }, [{
      ruleId: 'companion-question-missing-link',
      inputs: { missingCount: understandingProjection.missingLinks.length },
      decision: true,
    }])
  }

  // 3. stage = UNDERSTANDING → summarize
  if (understandingProjection && understandingProjection.stage === 'UNDERSTANDING') {
    const dims = understandingProjection.coverageState.coveredDimensions
    return makeDecision(policyContext, {
      actionType: 'summarize',
      targetRef: conversation.currentTopic,
      structuredContent: {
        keyPoints: [
          `你已经形成了对「${conversation.currentTopic}」的理解`,
          `覆盖了 ${dims.length} 个维度: ${dims.join(', ')}`,
          memoryProjection
            ? `共经历了 ${memoryProjection.totalNodes} 个理解节点`
            : '',
        ].filter(Boolean),
        references: understandingProjection.discoveredRelations.map((r) => r.relationRef),
      },
      suggestedNextStep: memoryProjection?.activeBranches[0]?.branchId ?? null,
      confidence: 0.85,
    }, [{
      ruleId: 'companion-summarize',
      inputs: { stage: 'UNDERSTANDING', dimensionCount: dims.length },
      decision: true,
    }])
  }

  // 4. 默认 → suggest
  return makeDecision(policyContext, {
    actionType: 'suggest',
    targetRef: ctx.availableKnowledgeSpace[0] ?? conversation.currentTopic,
    structuredContent: {
      keyPoints: [
        '你可以继续探索当前主题',
        '或者尝试理解不同维度之间的关系',
      ],
      references: ctx.availableKnowledgeSpace.slice(0, 3),
    },
    suggestedNextStep: ctx.availableKnowledgeSpace[0] ?? null,
    confidence: 0.6,
  }, [{
    ruleId: 'companion-suggest-default',
    inputs: { availableCount: ctx.availableKnowledgeSpace.length },
    decision: true,
  }])
}

// ============================================================================
// 辅助
// ============================================================================

let decisionCounter = 0

function makeDecision(
  context: PolicyContext,
  payload: CompanionResponsePayload,
  trace: Decision<CompanionResponsePayload>['trace'],
): Decision<CompanionResponsePayload> {
  decisionCounter++
  return {
    decisionId: `comp-decision-${Date.now()}-${decisionCounter}`,
    evaluatorId: 'companion-policy-default-v1',
    evaluatorVersion: context.policyVersion,
    inputRef: `comp-input-${Date.now()}`,
    output: payload,
    trace,
    createdAt: context.timestamp,
  }
}
