/**
 * M86.2.4 Phase 3 — MemoryProjection
 *
 * Memory Module 的 Projection 层。
 * 将 Memory State（UnderstandingMemoryUnit + GrowthGraph）转换为
 * Experience Layer 可消费的 View Model。
 *
 * 约束（M86.2）：
 *   - Projection 是 View，不是 Source——不修改 MemoryUnit/GrowthGraph
 *   - 单向：Memory State → Projection → Workspace
 *   - 不在 Projection 中保存数据副本——引用 Source
 */

import type { UnderstandingStage } from '../UnderstandingProjection'
import type { GrowthGraph, GrowthNode, GrowthEdge } from './GrowthGraphStore'

// ============================================================================
// MemoryProjection 类型
// ============================================================================

export interface MemoryUnitSummary {
  unitId: string
  topicRef: string
  userQuestion: string
  status: 'active' | 'completed' | 'archived'
  createdAt: number
  updatedAt: number
}

export interface StageTimelineItem {
  nodeId: string
  type: 'milestone' | 'delta' | 'branch' | 'reactivation' | 'start'
  stage: UnderstandingStage
  coverageRatio: number
  timestamp: number
  label: string                      // 人类可读标签（由 Projection 生成，非 Source 存储）
}

export interface ActiveBranch {
  branchId: string
  startNodeId: string
  latestNodeId: string
  latestStage: UnderstandingStage
  nodeCount: number
}

export interface MemoryProjection {
  // 基础信息
  unit: MemoryUnitSummary

  // 当前状态
  currentStage: UnderstandingStage
  currentCoverageRatio: number
  missingLinkCount: number
  dimensionCount: number

  // 时间线视图（从 GrowthGraph 线性化）
  stageTimeline: StageTimelineItem[]

  // 活跃分支
  activeBranches: ActiveBranch[]

  // 里程碑
  milestones: StageTimelineItem[]

  // 统计
  totalNodes: number
  totalEdges: number
  daysSinceStart: number
}

// ============================================================================
// MemoryProjectionFactory
// ============================================================================

/**
 * 从 MemoryUnit + GrowthGraph 生成 MemoryProjection。
 *
 * 纯函数——不修改 Source，不访问外部状态。
 */
export function createMemoryProjection(
  unit: MemoryUnitSummary,
  graph: Readonly<GrowthGraph>,
): MemoryProjection {
  const nodes = graph.nodes
  const edges = graph.edges

  // 当前状态（取最新 Node 的 Snapshot）
  const latestNode = nodes.length > 0 ? nodes[nodes.length - 1] : null
  const currentStage = latestNode?.snapshot.stage ?? 'FACT'
  const currentCoverageRatio = latestNode?.snapshot.coverageRatio ?? 0
  const missingLinkCount = latestNode?.snapshot.missingLinkCount ?? 0
  const dimensionCount = latestNode?.snapshot.dimensionCount ?? 0

  // Stage Timeline（线性化）
  const stageTimeline = buildStageTimeline(nodes)

  // 活跃分支
  const activeBranches = findActiveBranches(nodes, edges)

  // 里程碑（仅 milestone 和 reactivation 节点）
  const milestones = stageTimeline.filter(
    (item) => item.type === 'milestone' || item.type === 'reactivation',
  )

  // 统计
  const firstNode = nodes.length > 0 ? nodes[0] : null
  const daysSinceStart = firstNode
    ? Math.floor((Date.now() - firstNode.timestamp) / (1000 * 60 * 60 * 24))
    : 0

  return {
    unit,
    currentStage,
    currentCoverageRatio,
    missingLinkCount,
    dimensionCount,
    stageTimeline,
    activeBranches,
    milestones,
    totalNodes: nodes.length,
    totalEdges: edges.length,
    daysSinceStart,
  }
}

// ============================================================================
// 辅助
// ============================================================================

function buildStageTimeline(nodes: readonly GrowthNode[]): StageTimelineItem[] {
  return nodes.map((node) => {
    const typeMap: Record<string, StageTimelineItem['type']> = {
      exploration_start: 'start',
      delta: 'delta',
      milestone: 'milestone',
      branch: 'branch',
      merge: 'milestone',      // merge 视为里程碑
      reactivation: 'reactivation',
    }

    const label = generateLabel(node)

    return {
      nodeId: node.nodeId,
      type: typeMap[node.type] ?? 'delta',
      stage: node.snapshot.stage,
      coverageRatio: node.snapshot.coverageRatio,
      timestamp: node.timestamp,
      label,
    }
  })
}

/** 生成人类可读标签（Projection 层生成，非 Source 存储） */
function generateLabel(node: GrowthNode): string {
  switch (node.type) {
    case 'exploration_start':
      return '开始探索'
    case 'milestone':
      return `理解突破：${stageLabel(node.snapshot.stage)}`
    case 'reactivation':
      return '重新开始探索'
    case 'branch':
      return '新方向探索'
    case 'merge':
      return '理解汇聚'
    case 'delta':
    default: {
      const cov = node.snapshot.coverageRatio
      if (cov > 0) return `理解深化（覆盖 ${Math.round(cov * 100)}%）`
      return '认知变化'
    }
  }
}

function stageLabel(stage: UnderstandingStage): string {
  switch (stage) {
    case 'FACT': return '确认事实'
    case 'CONNECTION': return '建立关联'
    case 'UNDERSTANDING': return '形成理解'
    case 'NEW_QUESTION': return '产生新问题'
  }
}

/** 查找活跃分支（有 branches edge 但尚未 merge 的分支） */
function findActiveBranches(
  nodes: readonly GrowthNode[],
  edges: readonly GrowthEdge[],
): ActiveBranch[] {
  const branchEdges = edges.filter((e) => e.type === 'branches')
  const mergeEdges = edges.filter((e) => e.type === 'merges')
  const mergedToNodes = new Set(mergeEdges.map((e) => e.from))

  return branchEdges
    .filter((e) => !mergedToNodes.has(e.to))   // 未被 merge 的分支
    .map((e) => {
      const branchNodes = findBranchNodes(e.to, nodes)
      const latest = branchNodes.length > 0 ? branchNodes[branchNodes.length - 1] : null
      return {
        branchId: e.to,
        startNodeId: e.to,
        latestNodeId: latest?.nodeId ?? e.to,
        latestStage: latest?.snapshot.stage ?? 'FACT',
        nodeCount: branchNodes.length,
      }
    })
}

/** 从分支起点开始，沿 continues edge 找到所有后续节点 */
function findBranchNodes(
  startNodeId: string,
  nodes: readonly GrowthNode[],
): GrowthNode[] {
  const result: GrowthNode[] = []
  let currentId: string | null = startNodeId

  while (currentId) {
    const node = nodes.find((n) => n.nodeId === currentId)
    if (!node) break
    result.push(node)
    // 简单线性查找下一个 continues 节点
    const nextNode = nodes.find(
      (n) =>
        n.timestamp > node.timestamp &&
        n.type !== 'branch' &&
        n.type !== 'merge' &&
        !result.includes(n),
    )
    currentId = nextNode?.nodeId ?? null
    if (currentId && result.some((n) => n.nodeId === currentId)) break  // 防止循环
  }

  return result
}
