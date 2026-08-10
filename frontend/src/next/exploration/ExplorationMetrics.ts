/**
 * M88.5.1 — Exploration Metrics Model
 *
 * Exploration Growth Model：一次探索后，用户认知结构的变化。
 *
 * 核心原则：
 *   - Metrics 衡量认知结构变化（Cognitive Delta），不是用户行为（User Behavior）
 *   - 不是 Analytics，不是用户评分，不是行为指标
 *   - 纯函数：computeExplorationMetrics(before, after) → Metrics
 */

import type { ExplorationState } from './ExplorationState'

// ============================================================================
// ExplorationMetrics
// ============================================================================

export interface ExplorationMetrics {
  /** Session 标识 */
  sessionRef: string

  // ── Before ──
  before: {
    coveredDimensions: string[]
    exploredAnchorsCount: number
    exploredRelationsCount: number
    coverageRatio: number
    missingConnectionsCount: number
  }

  // ── After ──
  after: {
    coveredDimensions: string[]
    exploredAnchorsCount: number
    exploredRelationsCount: number
    coverageRatio: number
    missingConnectionsCount: number
  }

  // ── Growth Deltas ──
  /** 深度变化：exploredAnchors 增量 */
  depthDelta: number
  /** 广度变化：coveredDimensions 增量 */
  dimensionDelta: number
  /** 关系变化：exploredRelations 增量 */
  connectionDelta: number
  /** 跨 Session 连续性（0-1） */
  continuityScore: number

  // ── Composite ──
  /** 综合认知增长 = depth + dimension + connection + continuity */
  understandingGrowthScore: number
}

// ============================================================================
// computeExplorationMetrics（纯函数）
// ============================================================================

/**
 * computeExplorationMetrics()
 *
 * 计算一次探索前后的认知增长指标。
 *
 * @param before — 探索前的 ExplorationState
 * @param after — 探索后的 ExplorationState
 * @param previousMissingDimensions — 上一个 Session 的 missingDimensions（用于连续性计算）
 * @returns ExplorationMetrics
 */
export function computeExplorationMetrics(
  before: ExplorationState,
  after: ExplorationState,
  previousMissingDimensions?: string[],
): ExplorationMetrics {
  // ── Before snapshot ──
  const beforeSnapshot = {
    coveredDimensions: [...before.coveredDimensions],
    exploredAnchorsCount: before.exploredAnchors.length,
    exploredRelationsCount: before.exploredRelations.length,
    coverageRatio: before.coverageRatio,
    missingConnectionsCount: before.missingConnections.length,
  }

  // ── After snapshot ──
  const afterSnapshot = {
    coveredDimensions: [...after.coveredDimensions],
    exploredAnchorsCount: after.exploredAnchors.length,
    exploredRelationsCount: after.exploredRelations.length,
    coverageRatio: after.coverageRatio,
    missingConnectionsCount: after.missingConnections.length,
  }

  // ── Growth Deltas ──
  const depthDelta = afterSnapshot.exploredAnchorsCount - beforeSnapshot.exploredAnchorsCount
  const dimensionDelta = afterSnapshot.coveredDimensions.length - beforeSnapshot.coveredDimensions.length
  const connectionDelta = afterSnapshot.exploredRelationsCount - beforeSnapshot.exploredRelationsCount

  // ── Continuity Score ──
  const continuityScore = computeContinuityScore(
    before.coveredDimensions,
    after.coveredDimensions,
    previousMissingDimensions,
  )

  // ── Composite ──
  const understandingGrowthScore = depthDelta + dimensionDelta + connectionDelta + continuityScore

  return {
    sessionRef: after.explorationId,
    before: beforeSnapshot,
    after: afterSnapshot,
    depthDelta,
    dimensionDelta,
    connectionDelta,
    continuityScore,
    understandingGrowthScore,
  }
}

// ============================================================================
// Continuity Score 计算
// ============================================================================

/**
 * computeContinuityScore()
 *
 * 衡量跨 Session 的连续性：
 * - 如果 after 的 coveredDimensions 包含 previousMissingDimensions 中的维度 → 连续
 * - 如果 after 的 coveredDimensions 与 before 完全无关 → 不连续
 *
 * @returns 0-1 的连续性分数
 */
function computeContinuityScore(
  beforeDimensions: string[],
  afterDimensions: string[],
  previousMissing?: string[],
): number {
  // 没有上次缺口数据 → 无法判断连续性 → 默认 0.5（中性）
  if (!previousMissing || previousMissing.length === 0) {
    return 0.5
  }

  // 新增的维度
  const newDimensions = afterDimensions.filter((d) => !beforeDimensions.includes(d))

  if (newDimensions.length === 0) {
    // 没有新增维度 → 完全连续（在同一维度深化）
    return 1.0
  }

  // 新增维度中有多少是上次 missing 的
  const matchedMissing = newDimensions.filter((d) => previousMissing.includes(d))

  if (previousMissing.length === 0) return 0.5

  // 匹配比例
  return matchedMissing.length / previousMissing.length
}

// ============================================================================
// 默认空值
// ============================================================================

export const EMPTY_METRICS: ExplorationMetrics = {
  sessionRef: '',
  before: {
    coveredDimensions: [],
    exploredAnchorsCount: 0,
    exploredRelationsCount: 0,
    coverageRatio: 0,
    missingConnectionsCount: 0,
  },
  after: {
    coveredDimensions: [],
    exploredAnchorsCount: 0,
    exploredRelationsCount: 0,
    coverageRatio: 0,
    missingConnectionsCount: 0,
  },
  depthDelta: 0,
  dimensionDelta: 0,
  connectionDelta: 0,
  continuityScore: 0,
  understandingGrowthScore: 0,
}
