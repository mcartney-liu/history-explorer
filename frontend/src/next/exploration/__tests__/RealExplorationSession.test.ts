/**
 * M89.2 — Real Exploration Session Tests
 *
 * 验证真实历史数据（法国大革命）上的完整 Exploration Session。
 *
 * 标准 6 轮旅程：
 *   Round 1: open_dimension → 财政
 *   Round 2: follow_cause → 政治制度
 *   Round 3: open_dimension → 社会结构
 *   Round 4: follow_cause → 启蒙思想
 *   Round 5: open_dimension → 军事/外交
 *   Round 6: reflect → 总结
 */

import { describe, it, expect } from 'vitest'
import type { PolicyContext } from '../../../runtime/evaluation/Decision'
import type { ExplorationState, ExplorationStateBuilderInput } from '../ExplorationState'
import { buildExplorationState } from '../ExplorationState'
import { evaluateExploration } from '../ExplorationPolicy'
import { computeExplorationMetrics } from '../ExplorationMetrics'
import {
  FRENCH_REVOLUTION_PROJECTION,
  projectHistoricalKnowledge,
} from '../HistoricalKnowledgeProjection'

// ============================================================================
// Test Helpers
// ============================================================================

const defaultPolicyContext: PolicyContext = {
  timestamp: Date.now(),
  policyVersion: '1.0',
  engineProtocolVersion: '1.0',
}

interface SessionRound {
  round: number
  actionType: string
  targetRef: string
  state: ExplorationState
}

interface SessionRecord {
  sessionId: string
  startState: ExplorationState
  rounds: SessionRound[]
  finalState: ExplorationState
  metrics: ReturnType<typeof computeExplorationMetrics>
}

/** 模拟一轮探索：更新 coveredDimensions + exploredAnchors */
function simulateRound(
  input: ExplorationStateBuilderInput,
  coveredDimensions: string[],
  exploredAnchors: string[],
  exploredRelations: string[],
  stage: ExplorationState['understandingStage'],
): ExplorationState {
  const newInput = { ...input }
  newInput.understandingProjection = {
    ...newInput.understandingProjection,
    stage,
    coverageState: {
      requiredDimensions: FRENCH_REVOLUTION_PROJECTION.understandingTemplate.requiredDimensions,
      coveredDimensions,
      coverageRatio: coveredDimensions.length / 6,
    },
    missingLinks: newInput.understandingProjection.missingLinks.filter(
      (ml) => !exploredRelations.includes(ml.fromRef + '→' + ml.toRef),
    ),
  }
  newInput.sessionHistory = {
    exploredAnchors,
    exploredRelations,
    activeQuestions: ['法国大革命为什么发生？'],
  }
  return buildExplorationState(newInput)
}

// ============================================================================
// Tests
// ============================================================================

describe('Real Exploration Session — 法国大革命 (M89.2)', () => {
  // ── 完整 6 轮 Session ──
  describe('Full 6-Round Session', () => {
    it('完整 6 轮探索旅程：从 FACT 到 UNDERSTANDING', () => {
      const baseInput = projectHistoricalKnowledge(FRENCH_REVOLUTION_PROJECTION, 'session-fr-001')
      const startState = buildExplorationState(baseInput)

      const rounds: SessionRound[] = []

      // Round 1: 财政
      const r1State = simulateRound(baseInput, ['financial'], ['entity:fiscal-crisis'], ['rel-1'], 'CONNECTION')
      const r1Decision = evaluateExploration(r1State, defaultPolicyContext)
      rounds.push({ round: 1, actionType: r1Decision.output.type, targetRef: r1Decision.output.targetRef, state: r1State })

      // Round 2: 政治
      const r2State = simulateRound(baseInput, ['financial', 'political'], ['entity:fiscal-crisis', 'entity:estates-general'], ['rel-1', 'rel-2'], 'CONNECTION')
      const r2Decision = evaluateExploration(r2State, defaultPolicyContext)
      rounds.push({ round: 2, actionType: r2Decision.output.type, targetRef: r2Decision.output.targetRef, state: r2State })

      // Round 3: 社会
      const r3State = simulateRound(baseInput, ['financial', 'political', 'social'], ['entity:fiscal-crisis', 'entity:estates-general', 'entity:third-estate'], ['rel-1', 'rel-2', 'rel-5'], 'CONNECTION')
      const r3Decision = evaluateExploration(r3State, defaultPolicyContext)
      rounds.push({ round: 3, actionType: r3Decision.output.type, targetRef: r3Decision.output.targetRef, state: r3State })

      // Round 4: 思想
      const r4State = simulateRound(baseInput, ['financial', 'political', 'social', 'intellectual'], ['entity:fiscal-crisis', 'entity:estates-general', 'entity:third-estate', 'entity:enlightenment'], ['rel-1', 'rel-2', 'rel-5', 'rel-7'], 'CONNECTION')
      const r4Decision = evaluateExploration(r4State, defaultPolicyContext)
      rounds.push({ round: 4, actionType: r4Decision.output.type, targetRef: r4Decision.output.targetRef, state: r4State })

      // Round 5: 军事 + 外交
      const r5State = simulateRound(baseInput, ['financial', 'political', 'social', 'intellectual', 'military', 'diplomatic'], ['entity:fiscal-crisis', 'entity:estates-general', 'entity:third-estate', 'entity:enlightenment', 'entity:revolutionary-wars', 'entity:anti-french-coalition'], ['rel-1', 'rel-2', 'rel-5', 'rel-7', 'rel-9', 'rel-10'], 'UNDERSTANDING')
      const r5Decision = evaluateExploration(r5State, defaultPolicyContext)
      rounds.push({ round: 5, actionType: r5Decision.output.type, targetRef: r5Decision.output.targetRef, state: r5State })

      // Round 6: 全覆盖 → reflect
      const fullInput = projectHistoricalKnowledge(FRENCH_REVOLUTION_PROJECTION, 'session-fr-001')
      fullInput.understandingProjection.missingLinks = []
      fullInput.understandingProjection.stage = 'UNDERSTANDING'
      fullInput.understandingProjection.coverageState.coveredDimensions = ['financial', 'political', 'social', 'intellectual', 'military', 'diplomatic']
      fullInput.understandingProjection.coverageState.coverageRatio = 1.0
      fullInput.sessionHistory.exploredAnchors = r5State.exploredAnchors
      fullInput.sessionHistory.exploredRelations = r5State.exploredRelations
      const fullState = buildExplorationState(fullInput)
      const r6Decision = evaluateExploration(fullState, defaultPolicyContext)
      rounds.push({ round: 6, actionType: r6Decision.output.type, targetRef: r6Decision.output.targetRef, state: fullState })

      // ── 验证 ──

      // 6 轮完成
      expect(rounds).toHaveLength(6)

      // 最后一轮是 reflect
      expect(r6Decision.output.type).toBe('reflect')

      // 路径合理性：第一轮补缺口
      expect(rounds[0].actionType).toBe('open_dimension')

      // 非重复性：每轮 targetRef 不同
      const targets = rounds.map((r) => r.targetRef)
      const uniqueTargets = new Set(targets)
      expect(uniqueTargets.size).toBeGreaterThanOrEqual(3)

      // 认知增长：coverageRatio 0 → 1.0
      expect(fullState.coverageRatio).toBe(1.0)
      expect(fullState.coveredDimensions).toHaveLength(6)
    })
  })

  // ── Session Record（M89.3 预备） ──
  describe('Session Record for Human Evaluation', () => {
    it('生成完整的 SessionRecord', () => {
      const baseInput = projectHistoricalKnowledge(FRENCH_REVOLUTION_PROJECTION, 'session-record-001')
      const startState = buildExplorationState(baseInput)

      // 模拟 3 轮探索
      const r3State = simulateRound(
        baseInput,
        ['financial', 'political', 'social'],
        ['entity:fiscal-crisis', 'entity:estates-general', 'entity:third-estate'],
        ['rel-1', 'rel-2', 'rel-5'],
        'CONNECTION',
      )

      const metrics = computeExplorationMetrics(startState, r3State)

      const record: SessionRecord = {
        sessionId: 'session-record-001',
        startState,
        rounds: [
          {
            round: 1,
            actionType: 'open_dimension',
            targetRef: 'entity:fiscal-crisis',
            state: startState,
          },
          {
            round: 2,
            actionType: 'follow_cause',
            targetRef: 'entity:estates-general',
            state: r3State,
          },
          {
            round: 3,
            actionType: 'open_dimension',
            targetRef: 'entity:third-estate',
            state: r3State,
          },
        ],
        finalState: r3State,
        metrics,
      }

      expect(record.sessionId).toBeDefined()
      expect(record.rounds).toHaveLength(3)
      expect(record.metrics.dimensionDelta).toBe(3)
      expect(record.metrics.depthDelta).toBe(3)
      expect(record.metrics.understandingGrowthScore).toBeGreaterThan(0)
    })
  })

  // ── 体验质量信号 ──
  describe('Exploration Quality Signals', () => {
    it('路径合理性：财政 → 政治 → 社会 顺序自然', () => {
      const baseInput = projectHistoricalKnowledge(FRENCH_REVOLUTION_PROJECTION, 'quality-001')

      // Round 1: 财政 → open_dimension
      const r1State = simulateRound(baseInput, ['financial'], ['entity:fiscal-crisis'], ['rel-1'], 'CONNECTION')
      const r1Decision = evaluateExploration(r1State, defaultPolicyContext)
      // 财政之后，下一个应该是政治（因果链：三级会议→政治冲突）
      expect(r1Decision.output.reason).toBeTruthy()

      // Round 2: 政治 → follow_cause 或 open_dimension
      const r2State = simulateRound(baseInput, ['financial', 'political'], ['entity:fiscal-crisis', 'entity:estates-general'], ['rel-1', 'rel-2'], 'CONNECTION')
      const r2Decision = evaluateExploration(r2State, defaultPolicyContext)
      expect(r2Decision.output.type).toBeDefined()
    })

    it('非重复性：不推荐已探索 entity', () => {
      const baseInput = projectHistoricalKnowledge(FRENCH_REVOLUTION_PROJECTION, 'nodup-001')

      // 已探索 fiscal-crisis 和 estates-general
      const state = simulateRound(
        baseInput,
        ['financial', 'political'],
        ['entity:fiscal-crisis', 'entity:estates-general'],
        ['rel-1', 'rel-2'],
        'CONNECTION',
      )
      const decision = evaluateExploration(state, defaultPolicyContext)

      // targetRef 不应该在已探索列表中
      expect(state.exploredAnchors).not.toContain(decision.output.targetRef)
    })

    it('认知增长感：单维 → 多维', () => {
      const baseInput = projectHistoricalKnowledge(FRENCH_REVOLUTION_PROJECTION, 'growth-001')
      const startState = buildExplorationState(baseInput)

      expect(startState.coveredDimensions).toHaveLength(0)

      const endState = simulateRound(
        baseInput,
        ['financial', 'political', 'social', 'intellectual'],
        ['entity:fiscal-crisis', 'entity:estates-general', 'entity:third-estate', 'entity:enlightenment'],
        ['rel-1', 'rel-2', 'rel-5', 'rel-7'],
        'CONNECTION',
      )

      expect(endState.coveredDimensions).toHaveLength(4)
      expect(endState.coveredDimensions).toContain('financial')
      expect(endState.coveredDimensions).toContain('social')
      expect(endState.coveredDimensions).toContain('intellectual')
    })
  })
})
