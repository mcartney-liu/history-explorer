/**
 * M86.3.3 — Replay
 *
 * Replay 是 Evaluation Runtime 的历史回放能力。
 *
 * 核心原则（M86.1.15）：
 *   - Replay 永远不重新执行 Evaluator/Policy
 *   - Replay 只消费 DecisionPackage 中已保存的 Decision
 *   - Re-evaluate 是使用新 Policy 重新计算——这是两个不同的 API
 *
 * 验收标准（M86.3.3）：
 *   - Replay 不调用 Policy
 *   - Replay 不访问 Store
 *   - Replay 不生成新 Decision
 *   - Replay 返回原 Decision
 *   - Policy Version 不匹配仍可读取历史 Decision
 *   - Explainability Trace 保留
 */

import type { Decision, RuleTrace } from './Decision'

// ============================================================================
// DecisionPackage（Replay 的输入）
// ============================================================================

export interface DecisionPackage<T = unknown> {
  decisionId: string
  inputRef: string
  decision: Decision<T>
  versions: {
    policyVersion: string
    engineProtocolVersion: string
  }
  trace: RuleTrace[]
  createdAt: number
}

// ============================================================================
// ReplayResult
// ============================================================================

export interface ReplayResult<T = unknown> {
  /** 原始 Decision（不变） */
  decision: Decision<T>
  /** 原始 DecisionPackage 的版本信息 */
  originalVersions: {
    policyVersion: string
    engineProtocolVersion: string
  }
  /** 当前 Runtime 的版本信息（用于对比） */
  currentVersions: {
    policyVersion: string
    engineProtocolVersion: string
  }
  /** 版本是否匹配 */
  versionsMatch: boolean
  /** 原始 RuleTrace（不变） */
  trace: RuleTrace[]
  /** 回放时间戳 */
  replayedAt: number
}

// ============================================================================
// Replay API
// ============================================================================

/**
 * Replay——回放历史 Decision。
 *
 * 不调用 Policy，不访问 Store，不生成新 Decision。
 * 只消费 DecisionPackage 中已保存的 Decision。
 */
export function replay<T>(
  pkg: DecisionPackage<T>,
  currentPolicyVersion: string,
  currentEngineVersion: string,
): ReplayResult<T> {
  return {
    decision: pkg.decision,
    originalVersions: { ...pkg.versions },
    currentVersions: {
      policyVersion: currentPolicyVersion,
      engineProtocolVersion: currentEngineVersion,
    },
    versionsMatch:
      pkg.versions.policyVersion === currentPolicyVersion &&
      pkg.versions.engineProtocolVersion === currentEngineVersion,
    trace: pkg.trace,
    replayedAt: Date.now(),
  }
}

// ============================================================================
// Re-evaluate API（与 Replay 明确分离）
// ============================================================================

/**
 * Re-evaluate——使用新 Policy 重新计算。
 *
 * 这是与 Replay 不同的 API——会生成新 Decision。
 * 当前为接口定义，具体实现由调用方提供 Policy。
 */
export interface ReEvaluate<T, I> {
  reEvaluate(
    input: I,
    pkg: DecisionPackage<T>,
    evaluate: (input: I) => Decision<T>,
  ): {
    originalDecision: Decision<T>
    newDecision: Decision<T>
    changed: boolean
  }
}

/**
 * 默认 Re-evaluate 实现。
 */
export function reEvaluate<T, I>(
  input: I,
  pkg: DecisionPackage<T>,
  evaluate: (input: I) => Decision<T>,
): {
  originalDecision: Decision<T>
  newDecision: Decision<T>
  changed: boolean
} {
  const newDecision = evaluate(input)
  return {
    originalDecision: pkg.decision,
    newDecision,
    changed: newDecision.decisionId !== pkg.decision.decisionId,
  }
}

// ============================================================================
// DecisionPackage Builder（辅助）
// ============================================================================

/**
 * 从 Decision + 版本信息构建 DecisionPackage。
 */
export function createDecisionPackage<T>(
  decision: Decision<T>,
  inputRef: string,
  policyVersion: string,
  engineProtocolVersion: string,
): DecisionPackage<T> {
  return {
    decisionId: decision.decisionId,
    inputRef,
    decision,
    versions: {
      policyVersion,
      engineProtocolVersion,
    },
    trace: decision.trace,
    createdAt: decision.createdAt,
  }
}
