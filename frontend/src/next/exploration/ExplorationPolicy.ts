/**
 * M88.2 — ExplorationPolicy
 *
 * Exploration Intelligence 的 Policy 层（第五个 Domain Module）。
 * 接收 ExplorationState → 输出 Decision<ExplorationAction>。
 *
 * 约束（M88.0 / M88.2）：
 *   - ExplorationPolicy 不是 RecommendationPolicy
 *   - 输出认知动作（Knowledge Progression），不是内容选择（Content Selection）
 *   - 复用 Decision<T> / PolicyContext（从 runtime/evaluation 导入）
 *   - 输入只来自 ExplorationState（不访问 MemoryStore / KG / LLM）
 *   - RuleTrace 可审计，Replay 可回放
 *   - 禁止 AI 决定探索方向
 */

import type { Decision, PolicyContext } from '../../runtime/evaluation/Decision'
import type { ExplorationState } from './ExplorationState'

// ============================================================================
// ExplorationActionType
// ============================================================================

export type ExplorationActionType =
  | 'open_dimension'     // 打开缺失维度（扩展广度）
  | 'follow_cause'       // 追踪因果关系（加深深度）
  | 'deep_continue'      // 深化当前维度（同一主题更深层）
  | 'compare_context'    // 跨语境对比（横向理解）
  | 'reflect'            // 理解收束（帮助形成总结）

// ============================================================================
// ExplorationAction（认知动作，非内容推荐）
// ============================================================================

export interface ExplorationAction {
  /** 动作类型 */
  type: ExplorationActionType
  /** 目标 entityId */
  targetRef: string
  /** 为什么建议这个方向 */
  reason: string
  /** 叙事钩子（吸引用户继续） */
  narrativeHook: string
  /** 预期成长 */
  expectedGrowth: {
    dimension: string
    relationType: string
  }
  /** 置信度 */
  confidence: number
}

// ============================================================================
// ExplorationPolicy
// ============================================================================

/**
 * evaluateExploration()
 *
 * 基于当前探索状态，决定下一步认知动作。
 *
 * 规则优先级（M88.2 第一版——纯规则，非 AI）：
 *   1. missingDimensions > 0 → open_dimension（最优先：补缺口）
 *   2. missingConnections > 0 → follow_cause
 *   3. understandingStage = 'UNDERSTANDING' → reflect
 *   4. coverageRatio < 1.0 → deep_continue
 *   5. 默认 → deep_continue
 *
 * 去重：如果 targetRef 已在 exploredAnchors 中，跳过当前规则。
 */
export function evaluateExploration(
  state: ExplorationState,
  policyContext: PolicyContext,
): Decision<ExplorationAction> {
  // ── Rule 1: 打开缺失维度（最优先） ──
  if (state.missingDimensions.length > 0) {
    const dim = state.missingDimensions[0]
    // 尝试找到该维度对应的 entity
    const targetRef = resolveDimensionTarget(dim, state)

    // 去重检查
    if (!isAlreadyExplored(targetRef, state.exploredAnchors)) {
      return makeDecision(policyContext, {
        type: 'open_dimension',
        targetRef,
        reason: `已覆盖 ${state.coveredDimensions.join('、')}，缺少「${dim}」维度`,
        narrativeHook: buildDimensionHook(dim, state.currentTopic),
        expectedGrowth: { dimension: dim, relationType: 'enables' },
        confidence: calculateConfidence(state.coverageRatio, 0.5),
      }, [{
        ruleId: 'exploration-open-dimension',
        inputs: {
          missingDimension: dim,
          missingCount: state.missingDimensions.length,
          coverageRatio: state.coverageRatio,
        },
        decision: true,
      }])
    }
    // 去重失败 → 尝试下一个 missingDimension
    // （简化：只取第一个，后续可扩展为遍历）
  }

  // ── Rule 2: 追踪因果关系 ──
  if (state.missingConnections.length > 0) {
    const conn = state.missingConnections[0]
    const targetRef = conn.toRef

    if (!isAlreadyExplored(targetRef, state.exploredAnchors)) {
      return makeDecision(policyContext, {
        type: 'follow_cause',
        targetRef,
        reason: `${conn.fromRef} 与 ${conn.toRef} 之间存在尚未探索的「${conn.expectedRelationType}」关系`,
        narrativeHook: `你已经理解了 ${conn.fromRef}，但你知道它如何影响 ${conn.toRef} 吗？`,
        expectedGrowth: {
          dimension: 'causality',
          relationType: conn.expectedRelationType,
        },
        confidence: 0.85,
      }, [{
        ruleId: 'exploration-follow-cause',
        inputs: {
          fromRef: conn.fromRef,
          toRef: conn.toRef,
          expectedRelationType: conn.expectedRelationType,
        },
        decision: true,
      }])
    }
  }

  // ── Rule 3: 理解收束 ──
  if (state.understandingStage === 'UNDERSTANDING') {
    return makeDecision(policyContext, {
      type: 'reflect',
      targetRef: state.currentAnchorRef,
      reason: `已覆盖 ${state.coveredDimensions.length} 个维度，达到理解阶段`,
      narrativeHook: `你已经从 ${state.coveredDimensions.join('、')} 等维度理解了「${state.currentTopic}」，试着总结一下？`,
      expectedGrowth: { dimension: 'synthesis', relationType: 'summarizes' },
      confidence: 0.9,
    }, [{
      ruleId: 'exploration-reflect',
      inputs: {
        stage: 'UNDERSTANDING',
        coveredCount: state.coveredDimensions.length,
      },
      decision: true,
    }])
  }

  // ── Rule 4: 深化当前维度 ──
  if (state.coverageRatio < 1.0) {
    const targetRef = state.currentAnchorRef

    if (!isAlreadyExplored(targetRef, state.exploredAnchors)) {
      return makeDecision(policyContext, {
        type: 'deep_continue',
        targetRef,
        reason: `当前覆盖 ${Math.round(state.coverageRatio * 100)}%，继续深化「${state.currentTopic}」`,
        narrativeHook: `「${state.currentTopic}」还有很多值得深入的地方`,
        expectedGrowth: { dimension: state.coveredDimensions[0] ?? 'depth', relationType: 'deepens' },
        confidence: calculateConfidence(state.coverageRatio, 0.3),
      }, [{
        ruleId: 'exploration-deep-continue',
        inputs: { coverageRatio: state.coverageRatio },
        decision: true,
      }])
    }
  }

  // ── Rule 5: 默认 ──
  return makeDecision(policyContext, {
    type: 'deep_continue',
    targetRef: state.currentAnchorRef,
    reason: '继续当前探索方向',
    narrativeHook: '继续你的探索之旅',
    expectedGrowth: { dimension: 'continuation', relationType: 'continues' },
    confidence: 0.5,
  }, [{
    ruleId: 'exploration-default',
    inputs: { coverageRatio: state.coverageRatio },
    decision: true,
  }])
}

// ============================================================================
// 辅助函数
// ============================================================================

let decisionCounter = 0

function makeDecision(
  context: PolicyContext,
  payload: ExplorationAction,
  trace: Decision<ExplorationAction>['trace'],
): Decision<ExplorationAction> {
  decisionCounter++
  return {
    decisionId: `explore-decision-${Date.now()}-${decisionCounter}`,
    evaluatorId: 'exploration-policy-default-v1',
    evaluatorVersion: context.policyVersion,
    inputRef: `explore-input-${Date.now()}`,
    output: payload,
    trace,
    createdAt: context.timestamp,
  }
}

/** 检查 targetRef 是否已探索 */
function isAlreadyExplored(targetRef: string, exploredAnchors: string[]): boolean {
  return exploredAnchors.includes(targetRef)
}

/** 计算置信度（基于 coverageRatio 和基准值） */
function calculateConfidence(coverageRatio: number, baseline: number): number {
  // coverageRatio 越低，open_dimension 置信度越高（越确定需要补缺口）
  if (baseline > 0.4) {
    return Math.min(0.95, baseline + (1 - coverageRatio) * 0.3)
  }
  return Math.max(0.3, baseline + coverageRatio * 0.3)
}

/** 将维度名解析为可读的目标名称 */
function resolveDimensionTarget(dimension: string, _state: ExplorationState): string {
  const dimNames: Record<string, string> = {
    Person: '历史人物',
    Event: '历史事件',
    Civilization: '古代文明',
    Religion: '宗教发展',
    Technology: '技术演进',
    Location: '地理探索',
    economy: '经济维度',
    politics: '政治维度',
    culture: '文化维度',
    military: '军事维度',
    society: '社会维度',
  }
  return dimNames[dimension] || dimension
}

/** 构建维度叙事钩子 */
function buildDimensionHook(dimension: string, topic: string): string {
  const hooks: Record<string, string> = {
    economy: `「${topic}」的军事和政治已经清晰了，但经济基础呢？`,
    politics: `「${topic}」的军事力量背后，政治制度如何运作？`,
    culture: `「${topic}」不只是战争和政治——文化如何塑造文明？`,
    military: `「${topic}」的军事扩张是如何实现的？`,
    society: `「${topic}」的社会结构如何支撑帝国？`,
    religion: `「${topic}」的信仰体系如何影响决策？`,
    technology: `「${topic}」的技术创新如何改变格局？`,
  }
  return hooks[dimension] ?? `你还缺少「${dimension}」维度的理解，继续探索？`
}
