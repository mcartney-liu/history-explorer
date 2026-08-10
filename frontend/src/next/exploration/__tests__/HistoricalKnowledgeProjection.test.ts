/**
 * M89.1 — Historical Knowledge Projection Tests
 *
 * 验证真实历史知识通过 Projection 进入 Exploration Loop。
 *
 * 验证：
 *   1. Projection 结构完整
 *   2. Projection → ExplorationState 转换
 *   3. 真实数据 → ExplorationPolicy 产生 Action
 *   4. 模拟探索：Metrics 增长
 */

import { describe, it, expect } from 'vitest'
import type { PolicyContext } from '../../../runtime/evaluation/Decision'
import { buildExplorationState } from '../ExplorationState'
import { evaluateExploration } from '../ExplorationPolicy'
import { computeExplorationMetrics } from '../ExplorationMetrics'
import {
  FRENCH_REVOLUTION_PROJECTION,
  projectHistoricalKnowledge,
} from '../HistoricalKnowledgeProjection'

const defaultPolicyContext: PolicyContext = {
  timestamp: Date.now(),
  policyVersion: '1.0',
  engineProtocolVersion: '1.0',
}

// ============================================================================
// Tests
// ============================================================================

describe('Historical Knowledge Projection (M89.1)', () => {
  // ── 测试 1: Projection 结构完整 ──
  describe('Projection Structure', () => {
    it('法国大革命 Projection 包含 6 个维度', () => {
      expect(FRENCH_REVOLUTION_PROJECTION.dimensions).toHaveLength(6)
      const dimIds = FRENCH_REVOLUTION_PROJECTION.dimensions.map((d) => d.id)
      expect(dimIds).toContain('financial')
      expect(dimIds).toContain('political')
      expect(dimIds).toContain('social')
      expect(dimIds).toContain('intellectual')
      expect(dimIds).toContain('military')
      expect(dimIds).toContain('diplomatic')
    })

    it('包含足够多的 entities（≥ 10）', () => {
      expect(FRENCH_REVOLUTION_PROJECTION.entities.length).toBeGreaterThanOrEqual(10)
    })

    it('包含因果链 relations', () => {
      expect(FRENCH_REVOLUTION_PROJECTION.relations.length).toBeGreaterThanOrEqual(8)
      // 验证核心因果链：财政危机 → 三级会议
      const fiscalToEstates = FRENCH_REVOLUTION_PROJECTION.relations.find(
        (r) => r.from === 'entity:fiscal-crisis' && r.to === 'entity:estates-general',
      )
      expect(fiscalToEstates).toBeDefined()
      expect(fiscalToEstates!.type).toBe('causes')
    })

    it('understandingTemplate 包含所有 requiredDimensions', () => {
      expect(FRENCH_REVOLUTION_PROJECTION.understandingTemplate.requiredDimensions).toHaveLength(6)
    })
  })

  // ── 测试 2: Projection → ExplorationState 转换 ──
  describe('Projection → ExplorationState', () => {
    it('projectHistoricalKnowledge 生成有效的 BuilderInput', () => {
      const input = projectHistoricalKnowledge(FRENCH_REVOLUTION_PROJECTION, 'exp-fr-001')

      expect(input.explorationId).toBe('exp-fr-001')
      expect(input.currentTopic).toBe('法国大革命')
      expect(input.understandingProjection.stage).toBe('FACT')
      expect(input.understandingProjection.coverageState.coverageRatio).toBe(0)
      expect(input.understandingProjection.coverageState.requiredDimensions).toHaveLength(6)
    })

    it('初始 State 的 missingDimensions 为全部 6 个维度', () => {
      const input = projectHistoricalKnowledge(FRENCH_REVOLUTION_PROJECTION, 'exp-fr-001')
      const state = buildExplorationState(input)

      expect(state.missingDimensions).toHaveLength(6)
      expect(state.coveredDimensions).toHaveLength(0)
      expect(state.coverageRatio).toBe(0)
    })

    it('初始 State 的 missingConnections 包含所有 expectedRelations', () => {
      const input = projectHistoricalKnowledge(FRENCH_REVOLUTION_PROJECTION, 'exp-fr-001')
      const state = buildExplorationState(input)

      expect(state.missingConnections.length).toBeGreaterThanOrEqual(4)
    })
  })

  // ── 测试 3: 真实数据 → ExplorationPolicy 产生 Action ──
  describe('Real Data → ExplorationPolicy', () => {
    it('初始 State 触发 open_dimension', () => {
      const input = projectHistoricalKnowledge(FRENCH_REVOLUTION_PROJECTION, 'exp-fr-001')
      const state = buildExplorationState(input)
      const decision = evaluateExploration(state, defaultPolicyContext)

      // 6 个 missingDimensions → open_dimension
      expect(decision.output.type).toBe('open_dimension')
      expect(decision.trace[0].ruleId).toBe('exploration-open-dimension')
    })

    it('Decision 可 Replay', () => {
      const input = projectHistoricalKnowledge(FRENCH_REVOLUTION_PROJECTION, 'exp-fr-001')
      const state = buildExplorationState(input)
      const decision = evaluateExploration(state, defaultPolicyContext)

      // 验证 Decision 结构完整（可 Replay 的前提）
      expect(decision.decisionId).toBeDefined()
      expect(decision.trace.length).toBeGreaterThan(0)
      expect(decision.output.reason).toBeTruthy()
      expect(decision.output.narrativeHook).toBeTruthy()
    })
  })

  // ── 测试 4: 模拟探索 — Metrics 增长 ──
  describe('Simulated Exploration with Real Data', () => {
    it('3 轮探索后 Metrics 增长', () => {
      const input1 = projectHistoricalKnowledge(FRENCH_REVOLUTION_PROJECTION, 'exp-fr-real')
      const state1 = buildExplorationState(input1)

      // 模拟 3 轮采纳
      const input3 = projectHistoricalKnowledge(FRENCH_REVOLUTION_PROJECTION, 'exp-fr-real')
      input3.sessionHistory.exploredAnchors = [
        'entity:fiscal-crisis',
        'entity:estates-general',
        'entity:bastille',
      ]
      input3.sessionHistory.exploredRelations = ['rel-1', 'rel-2']
      input3.understandingProjection.coverageState.coveredDimensions = ['financial', 'political']
      input3.understandingProjection.coverageState.coverageRatio = 2 / 6
      input3.understandingProjection.stage = 'CONNECTION'

      const state3 = buildExplorationState(input3)
      const metrics = computeExplorationMetrics(state1, state3)

      expect(metrics.depthDelta).toBe(3)        // 0 → 3 exploredAnchors
      expect(metrics.dimensionDelta).toBe(2)     // 0 → 2 coveredDimensions
      expect(metrics.understandingGrowthScore).toBeGreaterThan(0)
    })

    it('探索到第 6 轮（全覆盖）后触发 reflect', () => {
      const input = projectHistoricalKnowledge(FRENCH_REVOLUTION_PROJECTION, 'exp-fr-full')
      input.sessionHistory.exploredAnchors = FRENCH_REVOLUTION_PROJECTION.entities.map((e) => e.ref)
      input.understandingProjection.coverageState.coveredDimensions = [
        'financial', 'political', 'social', 'intellectual', 'military', 'diplomatic',
      ]
      input.understandingProjection.coverageState.coverageRatio = 1.0
      input.understandingProjection.stage = 'UNDERSTANDING'
      input.understandingProjection.missingLinks = []

      const state = buildExplorationState(input)
      const decision = evaluateExploration(state, defaultPolicyContext)

      expect(decision.output.type).toBe('reflect')
      expect(decision.output.confidence).toBe(0.9)
    })
  })

  // ── 测试 5: 不修改 ExplorationPolicy ──
  describe('Policy Unchanged', () => {
    it('真实数据不修改 ExplorationPolicy 代码', () => {
      // 验证 Policy 仍然使用相同的 evaluateExploration 函数
      const input = projectHistoricalKnowledge(FRENCH_REVOLUTION_PROJECTION, 'exp-fr')
      const state = buildExplorationState(input)
      const decision = evaluateExploration(state, defaultPolicyContext)

      // Policy evaluatorId 不变
      expect(decision.evaluatorId).toBe('exploration-policy-default-v1')
    })
  })
})
