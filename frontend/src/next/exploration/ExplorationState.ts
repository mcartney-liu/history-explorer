/**
 * M88.1 — ExplorationState Model
 *
 * ExplorationState 是当前探索 Session 的状态快照。
 *
 * 核心约束：
 *   - 不是 Memory 的复制品（Memory = 长期，ExplorationState = 当前 Session）
 *   - 不访问 MemoryStore / KG / LLM
 *   - 输入全部来自 Projection
 *   - 不自己判断下一步方向
 *   - 纯函数：buildExplorationState(input) → ExplorationState
 */

import type { UnderstandingStage } from '../UnderstandingProjection'

// ============================================================================
// MissingConnection（简化版 MissingLink）
// ============================================================================

export interface MissingConnection {
  fromRef: string
  toRef: string
  expectedRelationType: string
  templateRef: string
}

// ============================================================================
// MemorySnapshot（MemoryProjection 的摘要，非复制）
// ============================================================================

export interface MemorySnapshot {
  totalNodes: number
  daysSinceStart: number
  activeBranches: { branchId: string; latestStage: string }[]
}

// ============================================================================
// ExplorationState
// ============================================================================

export interface ExplorationState {
  // ── Session 标识 ──
  /** 探索会话标识 */
  explorationId: string

  // ── 当前主题 ──
  /** 当前探索主题 */
  currentTopic: string
  /** 当前锚点 entityId */
  currentAnchorRef: string

  // ── 理解状态（来自 UnderstandingProjection） ──
  /** 当前理解阶段 */
  understandingStage: UnderstandingStage
  /** 覆盖比例（0-1） */
  coverageRatio: number
  /** 已覆盖的维度 */
  coveredDimensions: string[]
  /** 缺失的维度 */
  missingDimensions: string[]

  // ── 维度实体映射（P-U08：open_dimension 的目标必须是真实实体，而非中文标签） ──
  /** 维度名 → 该维度下的实体 id（global_id 优先）。供 Rule 1 解析可达目标。 */
  dimensionMapping: Record<string, string[]>

  // ── 认知缺口（来自 UnderstandingProjection） ──
  /** 缺失的因果连接 */
  missingConnections: MissingConnection[]

  // ── 探索历史（本次 Session） ──
  /** 已访问的 entityId 序列 */
  exploredAnchors: string[]
  /** 已遍历的 relationId 序列 */
  exploredRelations: string[]

  // ── 活跃问题 ──
  /** 用户已提出的问题（当前 Session） */
  activeQuestions: string[]

  // ── 记忆快照（引用，非复制） ──
  /** MemoryProjection 摘要 */
  memorySnapshot: MemorySnapshot

  // ── 元数据 ──
  /** 计算时间戳 */
  computedAt: number
  /** 来源版本 */
  basedOn: {
    understandingProjectionVersion: string
    memoryProjectionVersion: string
  }
}

// ============================================================================
// ExplorationStateBuilderInput
// ============================================================================

export interface ExplorationStateBuilderInput {
  explorationId: string
  currentTopic: string
  currentAnchorRef: string
  understandingProjection: {
    stage: UnderstandingStage
    coverageState: {
      requiredDimensions: string[]
      coveredDimensions: string[]
      coverageRatio: number
    }
    missingLinks: {
      fromRef: string
      toRef: string
      expectedRelationType: string
      templateRef: string
    }[]
    basedOn: {
      projectionVersion: string
    }
  }
  /** P-U08：维度名 → 实体 id 列表（可选，默认 {}）。Policy Rule 1 用它产出可达的 open_dimension 目标。 */
  dimensionMapping?: Record<string, string[]>
  memoryProjection: {
    totalNodes: number
    daysSinceStart: number
    activeBranches: { branchId: string; latestStage: string }[]
    basedOn?: { projectionVersion?: string }
  }
  sessionHistory: {
    exploredAnchors: string[]
    exploredRelations: string[]
    activeQuestions: string[]
  }
}

// ============================================================================
// buildExplorationState（纯函数）
// ============================================================================

/**
 * buildExplorationState()
 *
 * 从 Projection + Session History 构建 ExplorationState。
 *
 * 纯函数——不访问外部状态，不调用 LLM。
 */
export function buildExplorationState(
  input: ExplorationStateBuilderInput,
): ExplorationState {
  const { understandingProjection, memoryProjection, sessionHistory } = input

  // 计算缺失维度（required - covered）
  const coveredSet = new Set(understandingProjection.coverageState.coveredDimensions)
  const missingDimensions = understandingProjection.coverageState.requiredDimensions.filter(
    (d) => !coveredSet.has(d),
  )

  // 提取 missingConnections
  const missingConnections: MissingConnection[] =
    understandingProjection.missingLinks.map((link) => ({
      fromRef: link.fromRef,
      toRef: link.toRef,
      expectedRelationType: link.expectedRelationType,
      templateRef: link.templateRef,
    }))

  // 构建 MemorySnapshot（摘要，非复制）
  const memorySnapshot: MemorySnapshot = {
    totalNodes: memoryProjection.totalNodes,
    daysSinceStart: memoryProjection.daysSinceStart,
    activeBranches: memoryProjection.activeBranches.map((b) => ({
      branchId: b.branchId,
      latestStage: b.latestStage,
    })),
  }

  return {
    explorationId: input.explorationId,
    currentTopic: input.currentTopic,
    currentAnchorRef: input.currentAnchorRef,
    understandingStage: understandingProjection.stage,
    coverageRatio: understandingProjection.coverageState.coverageRatio,
    coveredDimensions: understandingProjection.coverageState.coveredDimensions,
    missingDimensions,
    dimensionMapping: input.dimensionMapping ?? {},
    missingConnections,
    exploredAnchors: [...sessionHistory.exploredAnchors],
    exploredRelations: [...sessionHistory.exploredRelations],
    activeQuestions: [...sessionHistory.activeQuestions],
    memorySnapshot,
    computedAt: Date.now(),
    basedOn: {
      understandingProjectionVersion:
        understandingProjection.basedOn.projectionVersion,
      memoryProjectionVersion:
        memoryProjection.basedOn?.projectionVersion ?? '1.0',
    },
  }
}

// ============================================================================
// 默认空值
// ============================================================================

export const EMPTY_EXPLORATION_STATE: ExplorationState = {
  explorationId: '',
  currentTopic: '',
  currentAnchorRef: '',
  understandingStage: 'FACT',
  coverageRatio: 0,
  coveredDimensions: [],
  missingDimensions: [],
  dimensionMapping: {},
  missingConnections: [],
  exploredAnchors: [],
  exploredRelations: [],
  activeQuestions: [],
  memorySnapshot: {
    totalNodes: 0,
    daysSinceStart: 0,
    activeBranches: [],
  },
  computedAt: 0,
  basedOn: {
    understandingProjectionVersion: '',
    memoryProjectionVersion: '',
  },
}
