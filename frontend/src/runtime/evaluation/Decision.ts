/**
 * M86.1 — Evaluation Runtime: Decision Model
 *
 * Decision<T> 是 Runtime 的统一判定模型。
 * 所有 Domain Module 的 Policy 输出均为 Decision<T> 的实例化。
 *
 * 约束（M86.1 Final ADR）：
 *   - Decision 一旦生成，永远不可修改（Immutable Event）
 *   - RuleTrace 是结构化数据（非展示文本）
 *   - Explain() 返回结构化 Evidence
 */

// ============================================================================
// RuleTrace（M86.1.14: 结构化，去文本化）
// ============================================================================

export interface RuleTrace {
  ruleId: string
  inputs: Record<string, unknown>
  decision: boolean
}

// ============================================================================
// Decision<T>（M86.1: 统一 Decision 模型）
// ============================================================================

export interface Decision<T> {
  decisionId: string
  evaluatorId: string
  evaluatorVersion: string
  inputRef: string
  output: T
  trace: RuleTrace[]
  createdAt: number
}

// ============================================================================
// Policy Protocol（M86.1.17: Protocol，非 God Object）
// ============================================================================

export interface Policy<I, O> {
  policyId: string
  version: string
  evaluate(input: I, context: PolicyContext): Decision<O>
}

export interface PolicyContext {
  timestamp: number
  policyVersion: string
  engineProtocolVersion: string
}
