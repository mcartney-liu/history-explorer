/**
 * M88.5.2 — Simulated User Journey Tests
 *
 * 模拟一条完整、可重复的认知增长轨迹。
 *
 * 三个 Case：
 *   Case 1: 持续探索（3 轮）— depth/dimension/connection 全部增长
 *   Case 2: 错误路径 — 拒绝建议 → State 不变 → Metrics 不增长
 *   Case 3: 跨 Session — continuityScore > 0
 */

import { describe, it, expect } from 'vitest'
import type { PolicyContext } from '../../../runtime/evaluation/Decision'
import type { ExplorationState, ExplorationStateBuilderInput } from '../ExplorationState'
import { buildExplorationState } from '../ExplorationState'
import { evaluateExploration } from '../ExplorationPolicy'
import { computeExplorationMetrics } from '../ExplorationMetrics'

// ============================================================================
// Test Helpers
// ============================================================================

const defaultPolicyContext: PolicyContext = {
  timestamp: Date.now(),
  policyVersion: '1.0',
  engineProtocolVersion: '1.0',
}

function makeSessionInput(
  sessionId: string,
  coveredDimensions: string[],
  exploredAnchors: string[],
): ExplorationStateBuilderInput {
  const requiredDimensions = ['military', 'economy', 'politics', 'culture']
  return {
    explorationId: sessionId,
    currentTopic: '罗马帝国',
    currentAnchorRef: exploredAnchors[exploredAnchors.length - 1] ?? 'entity:rome',
    understandingProjection: {
      stage: coveredDimensions.length >= 3 ? 'UNDERSTANDING' : 'CONNECTION',
      coverageState: {
        requiredDimensions,
        coveredDimensions,
        coverageRatio: coveredDimensions.length / requiredDimensions.length,
      },
      missingLinks:
        coveredDimensions.length >= 3
          ? []
          : [
              {
                fromRef: 'entity:rome',
                toRef: 'entity:trade-network',
                expectedRelationType: 'enables',
                templateRef: 'template-roman',
              },
            ],
      basedOn: { projectionVersion: '1.0' },
    },
    memoryProjection: {
      totalNodes: exploredAnchors.length + 2,
      daysSinceStart: exploredAnchors.length,
      activeBranches: [{ branchId: 'b-1', latestStage: 'CONNECTION' }],
      basedOn: { projectionVersion: '1.0' },
    },
    sessionHistory: {
      exploredAnchors,
      exploredRelations: exploredAnchors.length > 1 ? ['relation:conquest'] : [],
      activeQuestions: ['罗马如何扩张？'],
    },
  }
}

// ============================================================================
// Tests
// ============================================================================

describe('Simulated User Journey (M88.5.2)', () => {
  // ── Case 1: 持续探索（3 轮） ──
  describe('Case 1: Continuous Exploration (3 Rounds)', () => {
    it('3 轮探索后 depth/dimension/connection 全部增长', () => {
      // Round 1: 初始状态
      const input1 = makeSessionInput('journey-001', ['military'], ['entity:rome'])
      const state1 = buildExplorationState(input1)
      const decision1 = evaluateExploration(state1, defaultPolicyContext)

      expect(decision1.output.type).toBe('open_dimension')
      expect(state1.missingDimensions).toContain('economy')

      // Round 2: 采纳 → 探索 economy
      const input2 = makeSessionInput(
        'journey-001',
        ['military', 'economy'],
        ['entity:rome', 'entity:rome-economy'],
      )
      const state2 = buildExplorationState(input2)
      const decision2 = evaluateExploration(state2, defaultPolicyContext)

      expect(state2.coveredDimensions).toContain('economy')
      expect(state2.missingDimensions).not.toContain('economy')

      // Round 3: 继续采纳 → 探索 politics
      const input3 = makeSessionInput(
        'journey-001',
        ['military', 'economy', 'politics'],
        ['entity:rome', 'entity:rome-economy', 'entity:rome-politics'],
      )
      const state3 = buildExplorationState(input3)
      const decision3 = evaluateExploration(state3, defaultPolicyContext)

      expect(state3.coveredDimensions.length).toBe(3)

      // ── Metrics: before (Round 1) vs after (Round 3) ──
      const metrics = computeExplorationMetrics(state1, state3)

      expect(metrics.depthDelta).toBeGreaterThan(0)       // exploredAnchors: 1 → 3
      expect(metrics.dimensionDelta).toBeGreaterThan(0)    // coveredDimensions: 1 → 3
      expect(metrics.connectionDelta).toBeGreaterThanOrEqual(0)
      expect(metrics.understandingGrowthScore).toBeGreaterThan(0)
    })

    it('understandingGrowthScore > 0（持续增长）', () => {
      const state1 = buildExplorationState(
        makeSessionInput('growth-001', ['military'], ['entity:rome']),
      )
      const state3 = buildExplorationState(
        makeSessionInput(
          'growth-001',
          ['military', 'economy', 'politics', 'culture'],
          ['entity:rome', 'entity:rome-economy', 'entity:rome-politics', 'entity:rome-culture'],
        ),
      )

      const metrics = computeExplorationMetrics(state1, state3)
      expect(metrics.understandingGrowthScore).toBeGreaterThan(3)
    })

    it('每轮 Action 不同（State 驱动变化）', () => {
      const s1 = buildExplorationState(makeSessionInput('r1', ['military'], ['entity:rome']))
      const s2 = buildExplorationState(
        makeSessionInput('r2', ['military', 'economy'], ['entity:rome', 'entity:rome-economy']),
      )
      const s3 = buildExplorationState(
        makeSessionInput(
          'r3',
          ['military', 'economy', 'politics'],
          ['entity:rome', 'entity:rome-economy', 'entity:rome-politics'],
        ),
      )

      const d1 = evaluateExploration(s1, defaultPolicyContext)
      const d2 = evaluateExploration(s2, defaultPolicyContext)
      const d3 = evaluateExploration(s3, defaultPolicyContext)

      // 每轮 Action type 或 targetRef 应该不同
      const actions = [d1.output, d2.output, d3.output]
      const uniqueTypes = new Set(actions.map((a) => a.type))
      const uniqueTargets = new Set(actions.map((a) => a.targetRef))

      // 至少有两个不同的 Action（不能三轮完全一样）
      expect(uniqueTypes.size + uniqueTargets.size).toBeGreaterThanOrEqual(3)
    })

    it('coverageRatio 从 0.25 增长到 1.0', () => {
      const before = buildExplorationState(
        makeSessionInput('cov', ['military'], ['entity:rome']),
      )
      const after = buildExplorationState(
        makeSessionInput(
          'cov',
          ['military', 'economy', 'politics', 'culture'],
          ['entity:rome', 'entity:rome-economy', 'entity:rome-politics', 'entity:rome-culture'],
        ),
      )

      const metrics = computeExplorationMetrics(before, after)
      expect(metrics.before.coverageRatio).toBe(0.25)
      expect(metrics.after.coverageRatio).toBe(1.0)
    })
  })

  // ── Case 2: 错误路径 ──
  describe('Case 2: Rejection Path', () => {
    it('用户拒绝建议 → State 不变 → Metrics 不增长', () => {
      const state = buildExplorationState(
        makeSessionInput('reject-001', ['military'], ['entity:rome']),
      )
      const decision = evaluateExploration(state, defaultPolicyContext)

      // 用户拒绝 → 同一 State
      const sameState = buildExplorationState(
        makeSessionInput('reject-001', ['military'], ['entity:rome']),
      )
      const sameDecision = evaluateExploration(sameState, defaultPolicyContext)

      expect(sameDecision.output.type).toBe(decision.output.type)
      expect(sameDecision.output.targetRef).toBe(decision.output.targetRef)

      // Metrics: before vs after（未变化）
      const metrics = computeExplorationMetrics(state, sameState)
      expect(metrics.depthDelta).toBe(0)
      expect(metrics.dimensionDelta).toBe(0)
    })

    it('拒绝后 Decision 相同', () => {
      const input = makeSessionInput('reject-002', ['military'], ['entity:rome'])
      const state1 = buildExplorationState(input)
      const state2 = buildExplorationState(input) // 同一输入

      const d1 = evaluateExploration(state1, defaultPolicyContext)
      const d2 = evaluateExploration(state2, defaultPolicyContext)

      expect(d1.output.type).toBe(d2.output.type)
    })
  })

  // ── Case 3: 跨 Session ──
  describe('Case 3: Cross-Session Continuity', () => {
    it('Session 2 从 Session 1 的 missingDimensions 继续', () => {
      // Session 1: 只覆盖了 military，missing: economy, politics, culture
      const session1 = buildExplorationState(
        makeSessionInput('session-1', ['military'], ['entity:rome']),
      )
      const session1Missing = [...session1.missingDimensions]

      expect(session1Missing).toContain('economy')

      // Session 2: 从 economy 继续
      const session2 = buildExplorationState(
        makeSessionInput(
          'session-2',
          ['military', 'economy'],
          ['entity:rome', 'entity:rome-economy'],
        ),
      )

      const metrics = computeExplorationMetrics(session1, session2, session1Missing)

      // economy 在 session1 的 missing 中 → 连续
      expect(metrics.continuityScore).toBeGreaterThan(0)
    })

    it('Session 2 从无关维度开始 → continuityScore = 0', () => {
      const session1 = buildExplorationState(
        makeSessionInput('session-1b', ['military'], ['entity:rome']),
      )
      const session1Missing = ['economy', 'politics', 'culture']

      // Session 2: 跳到一个不在 missing 中的维度
      const session2 = buildExplorationState(
        makeSessionInput(
          'session-2b',
          ['military', 'religion'], // religion 不在 missing 中
          ['entity:rome', 'entity:rome-religion'],
        ),
      )

      const metrics = computeExplorationMetrics(session1, session2, session1Missing)
      expect(metrics.continuityScore).toBe(0)
    })

    it('跨 Session 整体 growth 可计算', () => {
      const session1 = buildExplorationState(
        makeSessionInput('s1', ['military'], ['entity:rome']),
      )
      const session2 = buildExplorationState(
        makeSessionInput(
          's2',
          ['military', 'economy', 'politics'],
          ['entity:rome', 'entity:rome-economy', 'entity:rome-politics'],
        ),
      )
      const session1Missing = [...session1.missingDimensions]

      const metrics = computeExplorationMetrics(session1, session2, session1Missing)

      expect(metrics.depthDelta).toBe(2)
      expect(metrics.dimensionDelta).toBe(2)
      expect(metrics.continuityScore).toBeGreaterThan(0)
      expect(metrics.understandingGrowthScore).toBeGreaterThan(3)
    })
  })
})
