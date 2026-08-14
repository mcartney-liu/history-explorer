/**
 * M88.2 — ExplorationPolicy Tests
 *
 * 验证 ExplorationPolicy 的规则引擎和 Decision 输出。
 *
 * 测试覆盖：
 *   1. 5 条规则的触发条件
 *   2. 优先级覆盖（Rule 1 > Rule 2 > ... > Rule 5）
 *   3. 去重逻辑
 *   4. Decision<T> 结构正确
 *   5. RuleTrace 可审计
 *   6. 不同 ExplorationState → 不同 ExplorationAction
 *   7. 边界情况
 */

import { describe, it, expect } from 'vitest'
import type { PolicyContext } from '../../../runtime/evaluation/Decision'
import type { ExplorationState } from '../ExplorationState'
import { evaluateExploration } from '../ExplorationPolicy'

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
    // P-U08: 维度实体映射（真实可达实体；Rule 1 目标不再是中文标签）
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

describe('ExplorationPolicy (M88.2)', () => {
  // ── 测试 1: Decision 结构 ──
  describe('Decision Structure', () => {
    it('输出 Decision<ExplorationAction>', () => {
      const decision = evaluateExploration(makeState(), defaultPolicyContext)

      expect(decision.decisionId).toBeDefined()
      expect(decision.evaluatorId).toBe('exploration-policy-default-v1')
      expect(decision.output.type).toBeDefined()
      expect(decision.output.targetRef).toBeDefined()
      expect(decision.trace.length).toBeGreaterThan(0)
    })

    it('ExplorationAction 包含必需字段', () => {
      const decision = evaluateExploration(makeState(), defaultPolicyContext)
      const action = decision.output

      const requiredKeys = ['type', 'targetRef', 'reason', 'narrativeHook', 'expectedGrowth', 'confidence']
      for (const key of requiredKeys) {
        expect(action).toHaveProperty(key)
      }
      expect(action.expectedGrowth).toHaveProperty('dimension')
      expect(action.expectedGrowth).toHaveProperty('relationType')
    })

    it('RuleTrace 可审计', () => {
      const decision = evaluateExploration(makeState(), defaultPolicyContext)

      expect(decision.trace.length).toBeGreaterThan(0)
      expect(decision.trace[0].ruleId).toBeDefined()
      expect(decision.trace[0].inputs).toBeDefined()
      expect(decision.trace[0].decision).toBe(true)
    })
  })

  // ── 测试 2: Rule 1 — open_dimension ──
  describe('Rule 1: Open Dimension (最高优先级)', () => {
    it('missingDimensions > 0 → open_dimension', () => {
      const state = makeState({
        missingDimensions: ['economy', 'culture'],
        missingConnections: [],
      })
      const decision = evaluateExploration(state, defaultPolicyContext)

      expect(decision.output.type).toBe('open_dimension')
      expect(decision.trace[0].ruleId).toBe('exploration-open-dimension')
    })

    it('选择第一个 missingDimension（映射实体作目标，P-U08）', () => {
      const state = makeState({
        missingDimensions: ['economy', 'culture'],
        missingConnections: [],
      })
      const decision = evaluateExploration(state, defaultPolicyContext)

      // P-U08：目标是真实可达实体 id，不是中文维度标签（标签点击 404）
      expect(decision.output.targetRef).toBe('entity:port-of-ostia')
      expect(decision.output.reason).toContain('economy')
    })

    it('missingDimension 无映射实体时跳过该维度（P-U08）', () => {
      const state = makeState({
        missingDimensions: ['economy', 'culture'],
        dimensionMapping: {
          // 只有 culture 有映射；economy 无 → 应选中 culture 的实体
          culture: ['entity:roman-art'],
        },
        missingConnections: [],
      })
      const decision = evaluateExploration(state, defaultPolicyContext)

      expect(decision.output.type).toBe('open_dimension')
      expect(decision.output.targetRef).toBe('entity:roman-art')
    })

    it('缺失维度全部已探索 / 无映射 → 不产出中文标签目标，落到后续规则（P-U08）', () => {
      const state = makeState({
        missingDimensions: ['economy'],
        dimensionMapping: {
          economy: ['entity:port-of-ostia'],
        },
        exploredAnchors: ['entity:port-of-ostia', 'entity:rome', 'entity:gaul'],
        missingConnections: [],
      })
      const decision = evaluateExploration(state, defaultPolicyContext)

      // Rule 1 放弃（目标已探索）→ 不应产出 open_dimension，也不应产出中文标签
      expect(decision.output.type).not.toBe('open_dimension')
      expect(decision.output.targetRef).not.toMatch(/历史|经济|文化|文明/)
    })

    it('叙事钩子提到主题和缺失维度', () => {
      const state = makeState({
        missingDimensions: ['economy'],
        missingConnections: [],
      })
      const decision = evaluateExploration(state, defaultPolicyContext)

      expect(decision.output.narrativeHook).toBeTruthy()
    })
  })

  // ── 测试 3: Rule 2 — follow_cause ──
  describe('Rule 2: Follow Cause', () => {
    it('missingConnections > 0 + 无 missingDimensions → follow_cause', () => {
      const state = makeState({
        missingDimensions: [],
        missingConnections: [
          {
            fromRef: 'entity:rome',
            toRef: 'entity:trade-network',
            expectedRelationType: 'enables',
            templateRef: 'template-roman',
          },
        ],
      })
      const decision = evaluateExploration(state, defaultPolicyContext)

      expect(decision.output.type).toBe('follow_cause')
      expect(decision.trace[0].ruleId).toBe('exploration-follow-cause')
    })

    it('targetRef 指向 missingConnection.toRef', () => {
      const state = makeState({
        missingDimensions: [],
        missingConnections: [
          {
            fromRef: 'entity:rome',
            toRef: 'entity:trade-network',
            expectedRelationType: 'enables',
            templateRef: 'template-roman',
          },
        ],
      })
      const decision = evaluateExploration(state, defaultPolicyContext)

      expect(decision.output.targetRef).toBe('entity:trade-network')
    })

    it('叙事钩子提到关系', () => {
      const state = makeState({
        missingDimensions: [],
        missingConnections: [
          {
            fromRef: 'entity:rome',
            toRef: 'entity:trade-network',
            expectedRelationType: 'enables',
            templateRef: 'template-roman',
          },
        ],
      })
      const decision = evaluateExploration(state, defaultPolicyContext)

      expect(decision.output.narrativeHook).toContain('trade-network')
    })
  })

  // ── 测试 4: Rule 3 — reflect ──
  describe('Rule 3: Reflect', () => {
    it('UNDERSTANDING 阶段 + 无缺口 → reflect', () => {
      const state = makeState({
        understandingStage: 'UNDERSTANDING',
        missingDimensions: [],
        missingConnections: [],
        coverageRatio: 1.0,
      })
      const decision = evaluateExploration(state, defaultPolicyContext)

      expect(decision.output.type).toBe('reflect')
      expect(decision.trace[0].ruleId).toBe('exploration-reflect')
    })

    it('reflect 帮助用户总结', () => {
      const state = makeState({
        understandingStage: 'UNDERSTANDING',
        missingDimensions: [],
        missingConnections: [],
        coveredDimensions: ['military', 'economy', 'politics', 'culture'],
        coverageRatio: 1.0,
      })
      const decision = evaluateExploration(state, defaultPolicyContext)

      expect(decision.output.narrativeHook).toContain('总结')
      expect(decision.output.confidence).toBe(0.9)
    })
  })

  // ── 测试 5: Rule 4 — deep_continue ──
  describe('Rule 4: Deep Continue', () => {
    it('coverageRatio < 1.0 + 无缺口 → deep_continue', () => {
      const state = makeState({
        missingDimensions: [],
        missingConnections: [],
        coverageRatio: 0.7,
        understandingStage: 'CONNECTION',
        // 确保 currentAnchorRef 不在 exploredAnchors 中（避免去重跳过）
        currentAnchorRef: 'entity:new-topic',
        exploredAnchors: ['entity:rome', 'entity:gaul'],
      })
      const decision = evaluateExploration(state, defaultPolicyContext)

      expect(decision.output.type).toBe('deep_continue')
      expect(decision.trace[0].ruleId).toBe('exploration-deep-continue')
    })
  })

  // ── 测试 6: Rule 5 — 默认 ──
  describe('Rule 5: Default', () => {
    it('完全覆盖 + UNDERSTANDING → reflect（Rule 3 先触发）', () => {
      const state = makeState({
        missingDimensions: [],
        missingConnections: [],
        coverageRatio: 1.0,
        understandingStage: 'UNDERSTANDING',
      })
      const decision = evaluateExploration(state, defaultPolicyContext)

      expect(decision.output.type).toBe('reflect')
    })

    it('完全覆盖 + 非 UNDERSTANDING → deep_continue（默认）', () => {
      const state = makeState({
        missingDimensions: [],
        missingConnections: [],
        coverageRatio: 1.0,
        understandingStage: 'CONNECTION',
      })
      const decision = evaluateExploration(state, defaultPolicyContext)

      // Rule 4: coverageRatio < 1.0 → 不触发（=1.0）
      // Rule 5: 默认 → deep_continue
      expect(decision.output.type).toBe('deep_continue')
      expect(decision.trace[0].ruleId).toBe('exploration-default')
    })
  })

  // ── 测试 7: 优先级覆盖 ──
  describe('Priority Override', () => {
    it('missingDimensions 优先于 missingConnections', () => {
      const state = makeState({
        missingDimensions: ['economy'],
        missingConnections: [
          { fromRef: 'a', toRef: 'b', expectedRelationType: 'enables', templateRef: 't' },
        ],
      })
      const decision = evaluateExploration(state, defaultPolicyContext)

      expect(decision.output.type).toBe('open_dimension')
      expect(decision.trace[0].ruleId).toBe('exploration-open-dimension')
    })

    it('missingConnections 优先于 reflect', () => {
      const state = makeState({
        understandingStage: 'UNDERSTANDING',
        missingDimensions: [],
        missingConnections: [
          { fromRef: 'a', toRef: 'b', expectedRelationType: 'enables', templateRef: 't' },
        ],
      })
      const decision = evaluateExploration(state, defaultPolicyContext)

      expect(decision.output.type).toBe('follow_cause')
      expect(decision.trace[0].ruleId).toBe('exploration-follow-cause')
    })
  })

  // ── 测试 8: 去重逻辑 ──
  describe('Deduplication', () => {
    it('targetRef 已在 exploredAnchors 中 → 跳过当前规则', () => {
      // P-U08：missingDimensions → resolveDimensionTarget 映射为该维度的代表实体
      // 如果该实体已在 exploredAnchors 中，应跳过 open_dimension，落到后续规则
      const state = makeState({
        missingDimensions: ['economy'],
        missingConnections: [],
        exploredAnchors: ['entity:rome', 'entity:gaul', 'entity:port-of-ostia'],
      })
      const decision = evaluateExploration(state, defaultPolicyContext)

      // open_dimension 被跳过（target 已探索），进入后续规则
      expect(decision.output.type).toBe('deep_continue')
    })
  })

  // ── 测试 9: 不同 ExplorationState → 不同 ExplorationAction ──
  describe('State-Driven Actions', () => {
    it('低覆盖 → open_dimension', () => {
      const state = makeState({
        missingDimensions: ['economy'],
        coverageRatio: 0.25,
        missingConnections: [],
      })
      const decision = evaluateExploration(state, defaultPolicyContext)
      expect(decision.output.type).toBe('open_dimension')
    })

    it('有关联缺口 → follow_cause', () => {
      const state = makeState({
        missingDimensions: [],
        missingConnections: [
          { fromRef: 'a', toRef: 'b', expectedRelationType: 'causes', templateRef: 't' },
        ],
      })
      const decision = evaluateExploration(state, defaultPolicyContext)
      expect(decision.output.type).toBe('follow_cause')
    })

    it('理解阶段 → reflect', () => {
      const state = makeState({
        understandingStage: 'UNDERSTANDING',
        missingDimensions: [],
        missingConnections: [],
        coverageRatio: 1.0,
      })
      const decision = evaluateExploration(state, defaultPolicyContext)
      expect(decision.output.type).toBe('reflect')
    })
  })

  // ── 测试 10: 边界情况 ──
  describe('Edge Cases', () => {
    it('空 missingDimensions + 空 missingConnections + FACT 阶段 → deep_continue', () => {
      const state = makeState({
        understandingStage: 'FACT',
        missingDimensions: [],
        missingConnections: [],
        coverageRatio: 0,
        coveredDimensions: [],
      })
      const decision = evaluateExploration(state, defaultPolicyContext)

      // Rule 4: coverageRatio < 1.0 → deep_continue
      expect(decision.output.type).toBe('deep_continue')
    })

    it('NEW_QUESTION 阶段 → 正常走规则', () => {
      const state = makeState({
        understandingStage: 'NEW_QUESTION',
        missingDimensions: ['economy'],
        missingConnections: [],
      })
      const decision = evaluateExploration(state, defaultPolicyContext)

      expect(decision.output.type).toBe('open_dimension')
    })

    it('confidence 在合理范围内', () => {
      const decision = evaluateExploration(makeState(), defaultPolicyContext)

      expect(decision.output.confidence).toBeGreaterThan(0)
      expect(decision.output.confidence).toBeLessThanOrEqual(1)
    })
  })

  // ── 测试 11: Rule 0 — 用户标记的开放缺口（认知闭环） ──
  describe('Rule 0: User-marked Gap (认知闭环)', () => {
    it('openGaps 优先于 Rule 1 missingDimensions', () => {
      const state = makeState({
        missingDimensions: ['economy', 'culture'],
        missingConnections: [],
      })
      const gapState = { entity_id: 'french-revolution', openGaps: ['culture'] }
      const decision = evaluateExploration(state, defaultPolicyContext, gapState)

      expect(decision.output.type).toBe('open_dimension')
      expect(decision.output.targetRef).toBe('entity:roman-art')
      expect(decision.trace[0].ruleId).toBe('exploration-gap-priority')
    })

    it('openGaps 为空 → 回落 Rule 1（行为不变，守只增不改红线）', () => {
      const state = makeState({
        missingDimensions: ['economy'],
        missingConnections: [],
      })
      const gapState = { entity_id: 'french-revolution', openGaps: [] }
      const decision = evaluateExploration(state, defaultPolicyContext, gapState)

      expect(decision.trace[0].ruleId).toBe('exploration-open-dimension')
      expect(decision.output.targetRef).toBe('entity:port-of-ostia')
    })

    it('openGaps 中维度无映射实体 → 跳过该 gap，回落 Rule 1', () => {
      const state = makeState({
        missingDimensions: ['economy'],
        dimensionMapping: { economy: ['entity:port-of-ostia'] },
        missingConnections: [],
      })
      const gapState = { entity_id: 'french-revolution', openGaps: ['culture'] }
      const decision = evaluateExploration(state, defaultPolicyContext, gapState)

      expect(decision.trace[0].ruleId).toBe('exploration-open-dimension')
      expect(decision.output.targetRef).toBe('entity:port-of-ostia')
    })
  })
})
