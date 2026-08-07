/**
 * M87.4.1 — Explanation Projection
 *
 * 将 Runtime 的 Decision<CompanionResponsePayload> 翻译为
 * ExplanationContext（LLM Renderer 的输入）。
 *
 * 核心原则：
 *   - ExplanationProjection 是纯翻译层——不产生新认知
 *   - 单向：Decision → ExplanationContext（不可逆）
 *   - Decision 不依赖 LLM，表达可随模型升级变化
 *
 * 约束（M87.4.1 Contract）：
 *   - 纯函数——无副作用
 *   - 不访问 MemoryStore / Knowledge Graph / Search / LLM
 *   - facts 全部来自 Decision.structuredContent.keyPoints
 *   - forbiddenClaims 来自 RuleTrace 推导
 *   - 携带 sourceDecisionId / sourcePolicyVersion / sourceReferences
 */

import type { Decision } from '../../runtime/evaluation/Decision'
import type {
  CompanionResponsePayload,
  CompanionActionType,
} from '../companion/CompanionPolicy'

// ============================================================================
// ExplanationContext 类型
// ============================================================================

export type ExplanationIntent =
  | 'explain'      // 解释 → 因果说明
  | 'suggest'      // 推荐 → 方向引导
  | 'question'     // 提问 → 引导思考
  | 'summarize'    // 总结 → 理解收束
  | 'connect'      // 关联 → 建立跨主题连接

export interface ExplanationFact {
  /** 事实描述文本 */
  text: string
  /** 来源：decision.keyPoints */
  source: 'decision.keyPoints'
  /** 在 keyPoints 中的位置 */
  index: number
}

export interface ExplanationReference {
  /** 引用标识（entity:xxx / relation:xxx） */
  ref: string
  /** 引用类型 */
  type: 'entity' | 'relation' | 'unknown'
}

export interface ForbiddenClaim {
  /** 禁止声称的内容 */
  claim: string
  /** 禁止原因 */
  reason: string
  /** 来自 RuleTrace 的 ruleId */
  ruleId: string
}

export interface ExplanationStyle {
  /** 语气 */
  tone: 'conversational' | 'educational' | 'exploratory'
  /** 深度 */
  depth: 'shallow' | 'medium' | 'deep'
  /** 用户语言偏好 */
  language: string
}

export interface ExplanationContext {
  // ── 叙事目标 ──
  /** 叙事主题 */
  subject: string
  /** 叙事意图 */
  intent: ExplanationIntent
  /** 叙事目标（人类可读） */
  narrativeGoal: string

  // ── 事实与引用 ──
  /** 事实列表（全部来自 Decision） */
  facts: ExplanationFact[]
  /** 引用列表（全部来自 Decision） */
  references: ExplanationReference[]

  // ── 约束 ──
  /** LLM 禁止声称的内容 */
  forbiddenClaims: ForbiddenClaim[]

  // ── 叙事风格 ──
  /** 叙事风格（由 Projection 判定，不由 LLM 判定） */
  style: ExplanationStyle

  // ── 来源追踪（M87.4.1 核心） ──
  /** 生成此 Context 的 Decision ID */
  sourceDecisionId: string
  /** 生成时的 Policy 版本 */
  sourcePolicyVersion: string
  /** Decision 中的 references */
  sourceReferences: string[]
}

// ============================================================================
// 默认空值
// ============================================================================

export const EMPTY_EXPLANATION_CONTEXT: ExplanationContext = {
  subject: '',
  intent: 'explain',
  narrativeGoal: '',
  facts: [],
  references: [],
  forbiddenClaims: [],
  style: {
    tone: 'conversational',
    depth: 'shallow',
    language: 'zh-CN',
  },
  sourceDecisionId: '',
  sourcePolicyVersion: '',
  sourceReferences: [],
}

// ============================================================================
// Projection 函数
// ============================================================================

/**
 * projectDecisionToExplanation()
 *
 * 将 Decision<CompanionResponsePayload> 翻译为 ExplanationContext。
 *
 * 纯函数——不访问任何外部状态。
 * 不产生新事实/新判断/新推荐。
 */
export function projectDecisionToExplanation(
  decision: Decision<CompanionResponsePayload>,
  options?: {
    /** 用户语言偏好（默认 zh-CN） */
    language?: string
  },
): ExplanationContext {
  const payload = decision.output
  const intent = mapActionTypeToIntent(payload.actionType)
  const narrativeGoal = getNarrativeGoal(intent)

  return {
    // ── 叙事目标 ──
    subject: payload.targetRef,
    intent,
    narrativeGoal,

    // ── 事实与引用（全部来自 Decision） ──
    facts: payload.structuredContent.keyPoints.map((text, index) => ({
      text,
      source: 'decision.keyPoints' as const,
      index,
    })),
    references: payload.structuredContent.references.map((ref) => ({
      ref,
      type: parseRefType(ref),
    })),

    // ── 约束（从 RuleTrace 推导） ──
    forbiddenClaims: deriveForbiddenClaims(decision),

    // ── 叙事风格（由 actionType 判定） ──
    style: {
      tone: getTone(payload.actionType),
      depth: getDepth(payload.actionType, payload.confidence),
      language: options?.language ?? 'zh-CN',
    },

    // ── 来源追踪 ──
    sourceDecisionId: decision.decisionId,
    sourcePolicyVersion: decision.evaluatorVersion,
    sourceReferences: payload.structuredContent.references,
  }
}

// ============================================================================
// 映射函数
// ============================================================================

/** actionType → ExplanationIntent */
function mapActionTypeToIntent(actionType: CompanionActionType): ExplanationIntent {
  return actionType // 当前 1:1 映射
}

/** intent → narrativeGoal（人类可读） */
function getNarrativeGoal(intent: ExplanationIntent): string {
  switch (intent) {
    case 'explain':
      return '帮助用户理解因果关系'
    case 'suggest':
      return '引导用户发现下一步探索方向'
    case 'question':
      return '通过提问帮助用户主动思考'
    case 'summarize':
      return '帮助用户收束当前理解，形成认知闭环'
    case 'connect':
      return '帮助用户建立跨主题的认知关联'
  }
}

/** 解析引用类型 */
function parseRefType(ref: string): 'entity' | 'relation' | 'unknown' {
  if (ref.startsWith('entity:')) return 'entity'
  if (ref.startsWith('relation:')) return 'relation'
  return 'unknown'
}

/** actionType → 叙事语气 */
function getTone(actionType: CompanionActionType): 'conversational' | 'educational' | 'exploratory' {
  switch (actionType) {
    case 'explain':
      return 'educational'
    case 'suggest':
      return 'exploratory'
    case 'question':
      return 'conversational'
    case 'summarize':
      return 'educational'
    case 'connect':
      return 'exploratory'
  }
}

/** actionType + confidence → 叙事深度 */
function getDepth(
  actionType: CompanionActionType,
  confidence: number,
): 'shallow' | 'medium' | 'deep' {
  switch (actionType) {
    case 'explain':
      return confidence >= 0.85 ? 'deep' : 'medium'
    case 'suggest':
      return confidence >= 0.8 ? 'medium' : 'shallow'
    case 'question':
      return 'medium'
    case 'summarize':
      return 'deep'
    case 'connect':
      return 'medium'
  }
}

// ============================================================================
// Forbidden Claims 推导
// ============================================================================

/**
 * 从 Decision.trace 推导 LLM 禁止声称的内容。
 *
 * 规则（M87.4.1 第一版）：
 *   - explain 规则触发 → 禁止声称"我不确定" / "我没有足够信息"
 *   - suggest 规则触发 → 禁止声称"这是唯一的路径"
 *   - question 规则触发 → 禁止声称"答案已经很明确"
 *   - summarize 规则触发 → 禁止声称"理解不完整"
 */
function deriveForbiddenClaims(
  decision: Decision<CompanionResponsePayload>,
): ForbiddenClaim[] {
  const claims: ForbiddenClaim[] = []
  const triggeredRules = new Set(decision.trace.filter((t) => t.decision).map((t) => t.ruleId))

  if (triggeredRules.has('companion-explain')) {
    claims.push({
      claim: '我不确定这个解释是否正确',
      reason: 'Companion explain 规则已触发，Decision 置信度足够',
      ruleId: 'companion-explain',
    })
    claims.push({
      claim: '我没有足够的信息来说明',
      reason: 'Policy 已判定有足够信息触发 explain 规则',
      ruleId: 'companion-explain',
    })
  }

  if (triggeredRules.has('companion-question-missing-link')) {
    claims.push({
      claim: '当前理解已经非常完整',
      reason: 'Policy 已判定存在 missing links，需要引导用户',
      ruleId: 'companion-question-missing-link',
    })
  }

  if (triggeredRules.has('companion-summarize')) {
    claims.push({
      claim: '你对这个话题的理解还不完整',
      reason: 'Policy 已判定达到 UNDERSTANDING 阶段',
      ruleId: 'companion-summarize',
    })
  }

  if (triggeredRules.has('companion-suggest-default')) {
    claims.push({
      claim: '这是唯一值得探索的方向',
      reason: 'suggest 只是推荐之一，不应声称唯一性',
      ruleId: 'companion-suggest-default',
    })
  }

  return claims
}
