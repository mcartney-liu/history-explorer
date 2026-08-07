/**
 * M86.2 — Memory Policy
 *
 * Memory Module 的 Policy 层。
 * 接收 ProjectionDelta + ExistingMemoryState → 输出 Decision<MemoryPersistencePayload>。
 *
 * 约束（M86.2.2）：
 *   - MemoryDecision = Decision<T>（非第二套 Decision 系统）
 *   - MemoryPolicy 是纯函数（不访问 Database/Session/Workspace）
 *   - 仅 cause='user_progress' 的 Delta 可进入 GrowthGraph
 */

import type { UnderstandingStage } from '../UnderstandingProjection'
import type { Decision, RuleTrace, PolicyContext } from '../../runtime/evaluation/Decision'

// ============================================================================
// Memory Domain 类型
// ============================================================================

/** Delta 的来源（M86.2.3） */
export type DeltaCause =
  | 'user_progress'
  | 'policy_change'
  | 'template_change'
  | 'reevaluation'

/** Projection 之间的变化 */
export interface ProjectionDelta {
  deltaId: string
  sessionRef: string
  timestamp: number
  cause: DeltaCause

  stageChanged?: { previous: UnderstandingStage; current: UnderstandingStage }
  coverageChanged?: { previous: number; current: number }
  dimensionsCompleted?: string[]
  relationsCompleted?: string[]
  missingLinksResolved?: string[]
}

/** MemoryPolicy 的输入——当前 Memory 状态 */
export interface ExistingMemoryState {
  currentStage: UnderstandingStage
  currentCoverageRatio: number
  lastMilestoneAt: number | null
  growthNodeCount: number
}

/** Memory Decision 的输出载荷（M86.2.2: Decision<T> 的 T） */
export interface MemoryPersistencePayload {
  shouldPersist: boolean
  growthEventType: 'delta' | 'milestone' | 'reactivation'
  reason: string
}

// ============================================================================
// MemoryPolicy（纯函数）
// ============================================================================

/**
 * MemoryPolicy.evaluate()
 *
 * 判定 ProjectionDelta 是否值得进入长期 Memory。
 *
 * 规则（M86.2.2）：
 *   P0: stage 跃迁 / reactivation
 *   P1: coverage 提升>0.2 / 新维度覆盖 / missingLinks 减少>50%
 *   P2: relationsCompleted / stage 回退
 *   无变化 → 不写入
 *   非 user_progress → 不写入
 */
export function evaluateMemory(
  delta: ProjectionDelta,
  existingState: ExistingMemoryState,
  context: PolicyContext,
): Decision<MemoryPersistencePayload> {
  const trace: RuleTrace[] = []

  // 非 user_progress 的 Delta 不进入 GrowthGraph
  if (delta.cause !== 'user_progress') {
    return makeDecision(context, {
      shouldPersist: false,
      growthEventType: 'delta',
      reason: `cause=${delta.cause} — 非用户认知变化，不进入 Memory`,
    }, trace)
  }

  // P0: stage 跃迁
  if (delta.stageChanged) {
    const { previous, current } = delta.stageChanged
    if (previous !== current) {
      const isMilestone =
        (previous === 'FACT' && current === 'CONNECTION') ||
        (previous === 'CONNECTION' && current === 'UNDERSTANDING')

      trace.push({
        ruleId: 'milestone-stage-transition',
        inputs: { previous, current },
        decision: isMilestone,
      })

      return makeDecision(context, {
        shouldPersist: true,
        growthEventType: isMilestone ? 'milestone' : 'delta',
        reason: `stage: ${previous} → ${current}`,
      }, trace)
    }
  }

  // P1: coverage 提升 > 0.2
  if (delta.coverageChanged) {
    const diff = delta.coverageChanged.current - delta.coverageChanged.previous
    if (diff > 0.2) {
      trace.push({
        ruleId: 'coverage-growth-threshold',
        inputs: { previous: delta.coverageChanged.previous, current: delta.coverageChanged.current, diff },
        decision: true,
      })
      return makeDecision(context, {
        shouldPersist: true,
        growthEventType: 'delta',
        reason: `coverage: ${delta.coverageChanged.previous.toFixed(2)} → ${delta.coverageChanged.current.toFixed(2)} (+${diff.toFixed(2)})`,
      }, trace)
    }
  }

  // P1: 新维度覆盖
  if (delta.dimensionsCompleted && delta.dimensionsCompleted.length > 0) {
    trace.push({
      ruleId: 'dimension-completed',
      inputs: { dimensions: delta.dimensionsCompleted },
      decision: true,
    })
    return makeDecision(context, {
      shouldPersist: true,
      growthEventType: 'delta',
      reason: `新维度覆盖: ${delta.dimensionsCompleted.join(', ')}`,
    }, trace)
  }

  // P1: missingLinks 减少 > 50%
  if (delta.missingLinksResolved && delta.missingLinksResolved.length > 0) {
    // 需要对比 existingState——简化版：有 resolved 就记录
    trace.push({
      ruleId: 'missing-links-resolved',
      inputs: { resolved: delta.missingLinksResolved.length },
      decision: true,
    })
    return makeDecision(context, {
      shouldPersist: true,
      growthEventType: 'delta',
      reason: `missingLinks 闭合: ${delta.missingLinksResolved.length} 个`,
    }, trace)
  }

  // P2: relationsCompleted
  if (delta.relationsCompleted && delta.relationsCompleted.length > 0) {
    trace.push({
      ruleId: 'relations-completed',
      inputs: { count: delta.relationsCompleted.length },
      decision: true,
    })
    return makeDecision(context, {
      shouldPersist: true,
      growthEventType: 'delta',
      reason: `关系建立: ${delta.relationsCompleted.length} 个`,
    }, trace)
  }

  // 无变化
  return makeDecision(context, {
    shouldPersist: false,
    growthEventType: 'delta',
    reason: '无显著认知变化',
  }, trace)
}

// ============================================================================
// 辅助
// ============================================================================

let decisionCounter = 0

function makeDecision(
  context: PolicyContext,
  payload: MemoryPersistencePayload,
  trace: RuleTrace[],
): Decision<MemoryPersistencePayload> {
  decisionCounter++
  return {
    decisionId: `mem-decision-${Date.now()}-${decisionCounter}`,
    evaluatorId: 'memory-policy-default-v1',
    evaluatorVersion: context.policyVersion,
    inputRef: `delta-${Date.now()}`,
    output: payload,
    trace,
    createdAt: context.timestamp,
  }
}
