/**
 * M88.4 — Exploration Experience Loop Tests
 *
 * 验证完整 Exploration Loop：
 *   State → Policy → Decision → 用户采纳 → State 变化 → 新 Decision
 *
 * 核心验证：
 *   - 同一 Session 内：State 变化 → Action 变化
 *   - 采纳后：exploredAnchors 增长
 *   - 采纳后：missingDimensions 可能减少
 *   - Policy 不直接写 MemoryStore
 */

import { describe, it, expect } from 'vitest'
import type { PolicyContext } from '../../../runtime/evaluation/Decision'
import type { ExplorationState } from '../ExplorationState'
import { buildExplorationState, type ExplorationStateBuilderInput } from '../ExplorationState'
import { evaluateExploration } from '../ExplorationPolicy'

// ============================================================================
// Test Helpers
// ============================================================================

const defaultPolicyContext: PolicyContext = {
  timestamp: Date.now(),
  policyVersion: '1.0',
  engineProtocolVersion: '1.0',
}

function makeBaseInput(): ExplorationStateBuilderInput {
  return {
    explorationId: 'exp-loop-001',
    currentTopic: '罗马帝国',
    currentAnchorRef: 'entity:rome',
    understandingProjection: {
      stage: 'CONNECTION',
      coverageState: {
        requiredDimensions: ['military', 'economy', 'politics', 'culture'],
        coveredDimensions: ['military'],
        coverageRatio: 0.25,
      },
      missingLinks: [
        {
          fromRef: 'entity:rome',
          toRef: 'entity:trade-network',
          expectedRelationType: 'enables',
          templateRef: 'template-roman',
        },
      ],
      basedOn: { projectionVersion: '1.0' },
    },
    // P-U08: 维度实体映射（Rule 1 目标必须是真实实体）
    dimensionMapping: {
      military: ['entity:roman-legion'],
      economy: ['entity:trade-network'],
      politics: ['entity:senate'],
      culture: ['entity:roman-art'],
    },
    memoryProjection: {
      totalNodes: 3,
      daysSinceStart: 0,
      activeBranches: [{ branchId: 'b-1', latestStage: 'CONNECTION' }],
      basedOn: { projectionVersion: '1.0' },
    },
    sessionHistory: {
      exploredAnchors: ['entity:rome'],
      exploredRelations: [],
      activeQuestions: ['罗马如何扩张？'],
    },
  }
}

/** 模拟用户采纳 Action：将 targetRef 加入 exploredAnchors */
function adoptAction(state: ExplorationState): ExplorationStateBuilderInput {
  const input = makeBaseInput()
  input.currentAnchorRef = state.currentAnchorRef
  input.sessionHistory.exploredAnchors = [...state.exploredAnchors]

  // 模拟采纳：将当前 missingDimensions 的第一个维度对应的实体加入已探索
  if (state.missingDimensions.length > 0) {
    const dim = state.missingDimensions[0]
    // P-U08: 采纳 Policy 产出的目标（mapping 里的真实实体）；无映射时兜底旧式命名
    const mapped = state.dimensionMapping[dim]
    const newEntity = mapped && mapped[0] ? mapped[0] : `entity:罗马帝国-${dim}`
    input.sessionHistory.exploredAnchors.push(newEntity)
    // 更新 coveredDimensions
    input.understandingProjection.coverageState.coveredDimensions = [
      ...state.coveredDimensions,
      dim,
    ]
    input.understandingProjection.coverageState.coverageRatio =
      input.understandingProjection.coverageState.coveredDimensions.length /
      input.understandingProjection.coverageState.requiredDimensions.length
    // 移除已覆盖的 missingLink
    input.understandingProjection.missingLinks = input.understandingProjection.missingLinks.filter(
      (ml) => ml.toRef !== newEntity,
    )
  }

  return input
}

// ============================================================================
// Tests
// ============================================================================

describe('Exploration Experience Loop (M88.4)', () => {
  // ── 测试 1: 完整 3 轮 Loop ──
  describe('Full 3-Round Loop', () => {
    it('模拟 3 轮探索：State 变化 → Action 变化', () => {
      // Round 1: 初始状态
      const input1 = makeBaseInput()
      const state1 = buildExplorationState(input1)
      const decision1 = evaluateExploration(state1, defaultPolicyContext)

      expect(decision1.output.type).toBe('open_dimension')
      expect(state1.missingDimensions).toContain('economy')

      // Round 2: 用户采纳 → 探索了 economy 维度
      const input2 = adoptAction(state1)
      const state2 = buildExplorationState(input2)
      const decision2 = evaluateExploration(state2, defaultPolicyContext)

      // economy 已被覆盖，不再在 missingDimensions 中
      expect(state2.missingDimensions).not.toContain('economy')
      // 仍有其他缺失维度
      expect(state2.missingDimensions.length).toBeGreaterThan(0)

      // Round 3: 继续采纳
      const input3 = adoptAction(state2)
      const state3 = buildExplorationState(input3)
      const decision3 = evaluateExploration(state3, defaultPolicyContext)

      // 继续推进
      expect(state3.coverageRatio).toBeGreaterThan(state1.coverageRatio)
      expect(decision3.output.type).toBeDefined()
    })

    it('每轮 exploredAnchors 增长', () => {
      const input1 = makeBaseInput()
      const state1 = buildExplorationState(input1)

      const input2 = adoptAction(state1)
      const state2 = buildExplorationState(input2)

      const input3 = adoptAction(state2)
      const state3 = buildExplorationState(input3)

      expect(state1.exploredAnchors.length).toBe(1)  // 初始：entity:rome
      expect(state2.exploredAnchors.length).toBe(2)  // +economy
      expect(state3.exploredAnchors.length).toBe(3)  // +politics
    })

    it('每轮 coverageRatio 递增', () => {
      const input1 = makeBaseInput()
      const state1 = buildExplorationState(input1)

      const input2 = adoptAction(state1)
      const state2 = buildExplorationState(input2)

      const input3 = adoptAction(state2)
      const state3 = buildExplorationState(input3)

      expect(state2.coverageRatio).toBeGreaterThan(state1.coverageRatio)
      expect(state3.coverageRatio).toBeGreaterThan(state2.coverageRatio)
    })
  })

  // ── 测试 2: State 变化 → Action 变化 ──
  describe('State Change → Action Change', () => {
    it('open_dimension → follow_cause（缺口补完后触发因果追踪）', () => {
      // 初始：有 missingDimensions → open_dimension
      const state1 = buildExplorationState(makeBaseInput())
      const d1 = evaluateExploration(state1, defaultPolicyContext)
      expect(d1.output.type).toBe('open_dimension')

      // 补完所有维度，但有关联缺口 → follow_cause
      const input2 = makeBaseInput()
      input2.understandingProjection.coverageState.coveredDimensions = [
        'military', 'economy', 'politics', 'culture',
      ]
      input2.understandingProjection.coverageState.coverageRatio = 1.0
      const state2 = buildExplorationState(input2)
      const d2 = evaluateExploration(state2, defaultPolicyContext)

      // 有 missingConnections 且无 missingDimensions → follow_cause
      expect(d2.output.type).toBe('follow_cause')
    })

    it('follow_cause → reflect（关联补完后触发收束）', () => {
      const input = makeBaseInput()
      input.understandingProjection.stage = 'UNDERSTANDING'
      input.understandingProjection.coverageState.coveredDimensions = [
        'military', 'economy', 'politics', 'culture',
      ]
      input.understandingProjection.coverageState.coverageRatio = 1.0
      input.understandingProjection.missingLinks = []
      const state = buildExplorationState(input)
      const decision = evaluateExploration(state, defaultPolicyContext)

      expect(decision.output.type).toBe('reflect')
    })
  })

  // ── 测试 3: 用户不采纳 ──
  describe('User Does Not Adopt', () => {
    it('不采纳 → exploredAnchors 不变 → 同一 Decision', () => {
      const state = buildExplorationState(makeBaseInput())
      const d1 = evaluateExploration(state, defaultPolicyContext)

      // 不采纳，重新评估同一 State
      const d2 = evaluateExploration(state, defaultPolicyContext)

      expect(d1.output.type).toBe(d2.output.type)
      expect(d1.output.targetRef).toBe(d2.output.targetRef)
    })
  })

  // ── 测试 4: Policy 不直接写 MemoryStore ──
  describe('Policy Does Not Write MemoryStore', () => {
    it('evaluateExploration 只接受 ExplorationState（不接触 MemoryStore）', () => {
      const state = buildExplorationState(makeBaseInput())
      const decision = evaluateExploration(state, defaultPolicyContext)

      // evaluateExploration 的签名是 (ExplorationState, PolicyContext) → Decision
      // 没有 MemoryStore 参数
      expect(decision).toBeDefined()
      expect(decision.evaluatorId).toBe('exploration-policy-default-v1')
    })
  })
})
