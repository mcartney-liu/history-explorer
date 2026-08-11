/**
 * M88.5.1 — Exploration Metrics Tests
 *
 * 验证 Exploration Growth Model：
 *   - depthDelta / dimensionDelta / connectionDelta 计算
 *   - continuityScore 跨 Session 连续性
 *   - understandingGrowthScore 综合指标
 */

import { describe, it, expect } from 'vitest'
import type { ExplorationState } from '../ExplorationState'
import { computeExplorationMetrics, EMPTY_METRICS } from '../ExplorationMetrics'

// ============================================================================
// Test Helpers
// ============================================================================

function makeState(overrides?: Partial<ExplorationState>): ExplorationState {
  return {
    explorationId: 'exp-001',
    currentTopic: '罗马帝国',
    currentAnchorRef: 'entity:rome',
    understandingStage: 'CONNECTION',
    coverageRatio: 0.5,
    coveredDimensions: ['military', 'politics'],
    missingDimensions: ['economy', 'culture'],
    missingConnections: [
      { fromRef: 'a', toRef: 'b', expectedRelationType: 'enables', templateRef: 't' },
    ],
    exploredAnchors: ['entity:rome', 'entity:gaul'],
    exploredRelations: ['relation:conquest'],
    activeQuestions: [],
    memorySnapshot: { totalNodes: 8, daysSinceStart: 3, activeBranches: [] },
    computedAt: Date.now(),
    basedOn: { understandingProjectionVersion: '1.0', memoryProjectionVersion: '1.0' },
    ...overrides,
  }
}

// ============================================================================
// Tests
// ============================================================================

describe('Exploration Metrics (M88.5.1)', () => {
  // ── 测试 1: 零变化 ──
  describe('Zero Growth', () => {
    it('同一 State → 全部 delta = 0', () => {
      const state = makeState()
      const metrics = computeExplorationMetrics(state, state)

      expect(metrics.depthDelta).toBe(0)
      expect(metrics.dimensionDelta).toBe(0)
      expect(metrics.connectionDelta).toBe(0)
      expect(metrics.understandingGrowthScore).toBeGreaterThanOrEqual(0) // continuity 可能 > 0
    })
  })

  // ── 测试 2: Depth Delta ──
  describe('Depth Delta', () => {
    it('exploredAnchors 增长 → depthDelta > 0', () => {
      const before = makeState({ exploredAnchors: ['entity:rome'] })
      const after = makeState({
        exploredAnchors: ['entity:rome', 'entity:gaul', 'entity:carthage'],
      })
      const metrics = computeExplorationMetrics(before, after)

      expect(metrics.depthDelta).toBe(2) // 1 → 3
      expect(metrics.after.exploredAnchorsCount).toBe(3)
    })

    it('exploredAnchors 不变 → depthDelta = 0', () => {
      const before = makeState({ exploredAnchors: ['a', 'b'] })
      const after = makeState({ exploredAnchors: ['a', 'b'] })
      const metrics = computeExplorationMetrics(before, after)

      expect(metrics.depthDelta).toBe(0)
    })
  })

  // ── 测试 3: Dimension Delta ──
  describe('Dimension Delta', () => {
    it('coveredDimensions 增长 → dimensionDelta > 0', () => {
      const before = makeState({ coveredDimensions: ['military'] })
      const after = makeState({
        coveredDimensions: ['military', 'economy', 'religion', 'law'],
      })
      const metrics = computeExplorationMetrics(before, after)

      expect(metrics.dimensionDelta).toBe(3) // 1 → 4
    })

    it('coveredDimensions 不变 → dimensionDelta = 0', () => {
      const before = makeState({ coveredDimensions: ['military', 'politics'] })
      const after = makeState({ coveredDimensions: ['military', 'politics'] })
      const metrics = computeExplorationMetrics(before, after)

      expect(metrics.dimensionDelta).toBe(0)
    })
  })

  // ── 测试 4: Connection Delta ──
  describe('Connection Delta', () => {
    it('exploredRelations 增长 → connectionDelta > 0', () => {
      const before = makeState({ exploredRelations: [] })
      const after = makeState({
        exploredRelations: ['r1', 'r2', 'r3'],
      })
      const metrics = computeExplorationMetrics(before, after)

      expect(metrics.connectionDelta).toBe(3) // 0 → 3
    })
  })

  // ── 测试 5: Continuity Score ──
  describe('Continuity Score', () => {
    it('新维度匹配上次 missingDimensions → 高连续性', () => {
      const before = makeState({ coveredDimensions: ['military'] })
      const after = makeState({
        coveredDimensions: ['military', 'economy'],
      })
      // 上次 missing 是 economy 和 religion
      const metrics = computeExplorationMetrics(before, after, ['economy', 'religion'])

      // economy 是上次 missing 的 → 匹配 1/2 = 0.5
      expect(metrics.continuityScore).toBe(0.5)
    })

    it('全部新维度都匹配上次 missing → 完全连续', () => {
      const before = makeState({ coveredDimensions: ['military'] })
      const after = makeState({
        coveredDimensions: ['military', 'economy', 'religion'],
      })
      const metrics = computeExplorationMetrics(before, after, ['economy', 'religion'])

      expect(metrics.continuityScore).toBe(1.0)
    })

    it('新维度与上次 missing 无关 → 不连续', () => {
      const before = makeState({ coveredDimensions: ['military'] })
      const after = makeState({
        coveredDimensions: ['military', 'law'],
      })
      const metrics = computeExplorationMetrics(before, after, ['economy', 'religion'])

      // law 不在上次 missing 中 → 0/2 = 0
      expect(metrics.continuityScore).toBe(0)
    })

    it('无上次 missing 数据 → 默认 0.5', () => {
      const before = makeState({ coveredDimensions: ['military'] })
      const after = makeState({
        coveredDimensions: ['military', 'economy'],
      })
      const metrics = computeExplorationMetrics(before, after)

      expect(metrics.continuityScore).toBe(0.5)
    })

    it('无新增维度 → 完全连续（在同一维度深化）', () => {
      const before = makeState({ coveredDimensions: ['military'] })
      const after = makeState({ coveredDimensions: ['military'] })
      const metrics = computeExplorationMetrics(before, after, ['economy'])

      expect(metrics.continuityScore).toBe(1.0)
    })
  })

  // ── 测试 6: Understanding Growth Score ──
  describe('Understanding Growth Score', () => {
    it('综合增长 = depth + dimension + connection + continuity', () => {
      const before = makeState({
        exploredAnchors: ['a'],
        coveredDimensions: ['military'],
        exploredRelations: [],
      })
      const after = makeState({
        exploredAnchors: ['a', 'b', 'c'],
        coveredDimensions: ['military', 'economy', 'religion'],
        exploredRelations: ['r1', 'r2'],
      })
      const metrics = computeExplorationMetrics(before, after)

      // depthDelta = 2, dimensionDelta = 2, connectionDelta = 2, continuityScore ≈ 0.5
      expect(metrics.understandingGrowthScore).toBeGreaterThan(5)
      expect(metrics.understandingGrowthScore).toBe(
        metrics.depthDelta + metrics.dimensionDelta + metrics.connectionDelta + metrics.continuityScore,
      )
    })

    it('零增长 → understandingGrowthScore 仅含 continuity', () => {
      const state = makeState()
      const metrics = computeExplorationMetrics(state, state)

      expect(metrics.understandingGrowthScore).toBe(metrics.continuityScore)
    })
  })

  // ── 测试 7: Before/After 快照正确 ──
  describe('Before/After Snapshots', () => {
    it('before 和 after 分别记录各自状态', () => {
      const before = makeState({ exploredAnchors: ['a'] })
      const after = makeState({ exploredAnchors: ['a', 'b', 'c'] })
      const metrics = computeExplorationMetrics(before, after)

      expect(metrics.before.exploredAnchorsCount).toBe(1)
      expect(metrics.after.exploredAnchorsCount).toBe(3)
    })

    it('coverageRatio 正确记录', () => {
      const before = makeState({ coverageRatio: 0.25 })
      const after = makeState({ coverageRatio: 0.75 })
      const metrics = computeExplorationMetrics(before, after)

      expect(metrics.before.coverageRatio).toBe(0.25)
      expect(metrics.after.coverageRatio).toBe(0.75)
    })
  })

  // ── 测试 8: EMPTY_METRICS ──
  describe('EMPTY_METRICS', () => {
    it('所有 delta 为 0', () => {
      expect(EMPTY_METRICS.depthDelta).toBe(0)
      expect(EMPTY_METRICS.dimensionDelta).toBe(0)
      expect(EMPTY_METRICS.connectionDelta).toBe(0)
      expect(EMPTY_METRICS.continuityScore).toBe(0)
      expect(EMPTY_METRICS.understandingGrowthScore).toBe(0)
    })
  })
})
