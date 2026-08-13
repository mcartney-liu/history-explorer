/**
 * M88.3 — ExplorationDecision Lifecycle Tests
 *
 * 验证 ExplorationAction 完整进入 Runtime 生命周期：
 *   - Decision<T> 复用
 *   - DecisionPackage 持久化
 *   - Replay（Decision 不变）
 *   - RuleTrace 保留
 *   - 与其他 Domain Decision 结构一致
 */

import { describe, it, expect } from 'vitest'
import type { Decision, PolicyContext } from '../../../runtime/evaluation/Decision'
import { createDecisionPackage } from '../../../runtime/evaluation/Replay'
import { replay } from '../../../runtime/evaluation/Replay'
import type { ExplorationAction } from '../ExplorationPolicy'
import { evaluateExploration } from '../ExplorationPolicy'
import type { ExplorationState } from '../ExplorationState'

// ============================================================================
// Test Helpers
// ============================================================================

const defaultPolicyContext: PolicyContext = {
  timestamp: Date.now(),
  policyVersion: '1.0',
  engineProtocolVersion: '1.0',
}

function makeState(overrides?: Partial<ExplorationState>): ExplorationState {
  return {
    explorationId: 'exp-001',
    currentTopic: '罗马帝国',
    currentAnchorRef: 'entity:rome',
    understandingStage: 'CONNECTION',
    coverageRatio: 0.5,
    coveredDimensions: ['military', 'politics'],
    missingDimensions: ['economy', 'culture'],
    // P-U08: 维度实体映射（Rule 1 目标必须是真实实体）
    dimensionMapping: {
      economy: ['entity:port-of-ostia'],
      culture: ['entity:roman-art'],
    },
    missingConnections: [
      {
        fromRef: 'entity:rome',
        toRef: 'entity:trade-network',
        expectedRelationType: 'enables',
        templateRef: 'template-roman',
      },
    ],
    exploredAnchors: ['entity:rome', 'entity:gaul'],
    exploredRelations: ['relation:conquest'],
    activeQuestions: ['罗马为什么能快速扩张？'],
    memorySnapshot: {
      totalNodes: 8,
      daysSinceStart: 3,
      activeBranches: [{ branchId: 'b-1', latestStage: 'CONNECTION' }],
    },
    computedAt: Date.now(),
    basedOn: {
      understandingProjectionVersion: '1.0',
      memoryProjectionVersion: '1.0',
    },
    ...overrides,
  }
}

// ============================================================================
// Tests
// ============================================================================

describe('ExplorationDecision Lifecycle (M88.3)', () => {
  // ── 测试 1: Decision<T> 复用 ──
  describe('Decision<T> Reuse', () => {
    it('ExplorationPolicy 输出 Decision<ExplorationAction>', () => {
      const decision = evaluateExploration(makeState(), defaultPolicyContext)

      // 验证 Decision<T> 结构
      expect(decision.decisionId).toBeDefined()
      expect(decision.evaluatorId).toBe('exploration-policy-default-v1')
      expect(decision.evaluatorVersion).toBeDefined()
      expect(decision.inputRef).toBeDefined()
      expect(decision.output).toBeDefined()
      expect(decision.trace).toBeInstanceOf(Array)
      expect(decision.createdAt).toBeGreaterThan(0)
    })

    it('ExplorationAction 与 Decision<T> 泛型参数一致', () => {
      const decision: Decision<ExplorationAction> = evaluateExploration(
        makeState(),
        defaultPolicyContext,
      )

      // TypeScript 类型检查：decision.output 是 ExplorationAction
      const action: ExplorationAction = decision.output
      expect(action.type).toBeDefined()
      expect(action.targetRef).toBeDefined()
      expect(action.reason).toBeDefined()
      expect(action.narrativeHook).toBeDefined()
      expect(action.expectedGrowth).toBeDefined()
      expect(action.confidence).toBeGreaterThan(0)
    })
  })

  // ── 测试 2: DecisionPackage 持久化 ──
  describe('DecisionPackage Persistence', () => {
    it('Decision<ExplorationAction> 可创建 DecisionPackage', () => {
      const decision = evaluateExploration(makeState(), defaultPolicyContext)
      const pkg = createDecisionPackage(decision, 'exploration-input', '1.0', '1.0')

      expect(pkg.decisionId).toBe(decision.decisionId)
      expect(pkg.decision).toBe(decision)
      expect(pkg.versions.policyVersion).toBe('1.0')
      expect(pkg.versions.engineProtocolVersion).toBe('1.0')
      expect(pkg.trace).toBe(decision.trace)
    })

    it('DecisionPackage 包含完整 RuleTrace', () => {
      const decision = evaluateExploration(makeState(), defaultPolicyContext)
      const pkg = createDecisionPackage(decision, 'exploration-input', '1.0', '1.0')

      expect(pkg.trace.length).toBeGreaterThan(0)
      expect(pkg.trace[0].ruleId).toBeDefined()
      expect(pkg.trace[0].inputs).toBeDefined()
      expect(pkg.trace[0].decision).toBe(true)
    })
  })

  // ── 测试 3: Replay ──
  describe('Replay', () => {
    it('DecisionPackage<ExplorationAction> 可 Replay', () => {
      const decision = evaluateExploration(makeState(), defaultPolicyContext)
      const pkg = createDecisionPackage(decision, 'exploration-input', '1.0', '1.0')

      const replayResult = replay(pkg, '1.0', '1.0')

      expect(replayResult.decision.decisionId).toBe(decision.decisionId)
      expect(replayResult.versionsMatch).toBe(true)
    })

    it('Replay 返回的 Decision 与原始一致', () => {
      const decision = evaluateExploration(makeState(), defaultPolicyContext)
      const pkg = createDecisionPackage(decision, 'exploration-input', '1.0', '1.0')

      const replayResult = replay(pkg, '1.0', '1.0')

      expect(replayResult.decision.output.type).toBe(decision.output.type)
      expect(replayResult.decision.output.targetRef).toBe(decision.output.targetRef)
      expect(replayResult.decision.output.reason).toBe(decision.output.reason)
      expect(replayResult.decision.output.confidence).toBe(decision.output.confidence)
    })

    it('Replay 不调用 ExplorationPolicy', () => {
      const decision = evaluateExploration(makeState(), defaultPolicyContext)
      const pkg = createDecisionPackage(decision, 'exploration-input', '1.0', '1.0')

      // replay() 只消费 DecisionPackage，不调用 evaluateExploration
      const replayResult = replay(pkg, '1.0', '1.0')

      // Decision 完全一致 = 没有重新 evaluate
      expect(replayResult.decision.decisionId).toBe(decision.decisionId)
    })

    it('Policy Version 不匹配仍可 Replay', () => {
      const decision = evaluateExploration(makeState(), defaultPolicyContext)
      const pkg = createDecisionPackage(decision, 'exploration-input', '0.9.0', '0.9.0')

      const replayResult = replay(pkg, '2.0', '2.0')

      expect(replayResult.decision.decisionId).toBe(decision.decisionId)
      expect(replayResult.versionsMatch).toBe(false)
      // 即使版本不匹配，Decision 仍然可读
    })

    it('Replay 保留原始 RuleTrace', () => {
      const decision = evaluateExploration(makeState(), defaultPolicyContext)
      const pkg = createDecisionPackage(decision, 'exploration-input', '1.0', '1.0')

      const replayResult = replay(pkg, '1.0', '1.0')

      expect(replayResult.trace.length).toBe(decision.trace.length)
      expect(replayResult.trace[0].ruleId).toBe(decision.trace[0].ruleId)
    })
  })

  // ── 测试 4: 5 种 actionType 的 Decision 都可 Replay ──
  describe('All Action Types Replay', () => {
    it('open_dimension 可 Replay', () => {
      const state = makeState({ missingDimensions: ['economy'], missingConnections: [] })
      const decision = evaluateExploration(state, defaultPolicyContext)
      const pkg = createDecisionPackage(decision, 'input', '1.0', '1.0')
      const replayResult = replay(pkg, '1.0', '1.0')

      expect(replayResult.decision.output.type).toBe('open_dimension')
    })

    it('follow_cause 可 Replay', () => {
      const state = makeState({
        missingDimensions: [],
        missingConnections: [
          { fromRef: 'a', toRef: 'b', expectedRelationType: 'causes', templateRef: 't' },
        ],
      })
      const decision = evaluateExploration(state, defaultPolicyContext)
      const pkg = createDecisionPackage(decision, 'input', '1.0', '1.0')
      const replayResult = replay(pkg, '1.0', '1.0')

      expect(replayResult.decision.output.type).toBe('follow_cause')
    })

    it('reflect 可 Replay', () => {
      const state = makeState({
        understandingStage: 'UNDERSTANDING',
        missingDimensions: [],
        missingConnections: [],
        coverageRatio: 1.0,
      })
      const decision = evaluateExploration(state, defaultPolicyContext)
      const pkg = createDecisionPackage(decision, 'input', '1.0', '1.0')
      const replayResult = replay(pkg, '1.0', '1.0')

      expect(replayResult.decision.output.type).toBe('reflect')
    })

    it('deep_continue 可 Replay', () => {
      const state = makeState({
        missingDimensions: [],
        missingConnections: [],
        coverageRatio: 0.5,
        currentAnchorRef: 'entity:new-topic',
        exploredAnchors: ['entity:rome'],
      })
      const decision = evaluateExploration(state, defaultPolicyContext)
      const pkg = createDecisionPackage(decision, 'input', '1.0', '1.0')
      const replayResult = replay(pkg, '1.0', '1.0')

      expect(replayResult.decision.output.type).toBe('deep_continue')
    })
  })

  // ── 测试 5: 与其他 Domain Decision 结构一致 ──
  describe('Cross-Domain Decision Consistency', () => {
    it('ExplorationDecision 与其他 Domain 有相同的 Decision<T> 结构', () => {
      const decision = evaluateExploration(makeState(), defaultPolicyContext)

      const requiredKeys = [
        'decisionId', 'evaluatorId', 'evaluatorVersion',
        'inputRef', 'output', 'trace', 'createdAt',
      ]

      for (const key of requiredKeys) {
        expect(decision).toHaveProperty(key)
      }
    })

    it('ExplorationDecision 不创建独立类型', () => {
      const decision: Decision<ExplorationAction> = evaluateExploration(
        makeState(),
        defaultPolicyContext,
      )

      // 验证它是泛型 Decision<T>，没有额外的 ExplorationDecision 类型
      expect(typeof decision.decisionId).toBe('string')
      expect(typeof decision.evaluatorId).toBe('string')
      expect(Array.isArray(decision.trace)).toBe(true)
    })
  })
})
