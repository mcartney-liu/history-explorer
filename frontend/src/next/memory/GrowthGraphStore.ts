/**
 * M86.2.4 Phase 2 — GrowthGraphStore
 *
 * Memory Module 的图存储层。
 * 基于 MemoryDecision 驱动 Append Only GrowthGraph。
 *
 * 约束（M86.2.3）：
 *   - Append Only（addNode/addEdge，禁止 update/delete）
 *   - 仅 cause='user_progress' 进入 GrowthGraph
 *   - milestone / delta / reactivation 三种 GrowthNode 类型
 *   - GrowthSnapshot 保存轻量认知快照
 */

import type { UnderstandingStage } from '../UnderstandingProjection'
import type { Decision } from '../../runtime/evaluation/Decision'
import type { ProjectionDelta, MemoryPersistencePayload } from './MemoryPolicy'

// ============================================================================
// GrowthGraph 类型
// ============================================================================

export type GrowthNodeType =
  | 'exploration_start'
  | 'delta'
  | 'milestone'
  | 'branch'
  | 'merge'
  | 'reactivation'

export type GrowthEdgeType =
  | 'continues'
  | 'branches'
  | 'merges'
  | 'references'

export interface GrowthSnapshot {
  stage: UnderstandingStage
  coverageRatio: number
  missingLinkCount: number
  dimensionCount: number
}

export interface GrowthNode {
  nodeId: string
  type: GrowthNodeType
  deltaRef?: string
  sessionRef: string
  timestamp: number
  cause: string
  snapshot: GrowthSnapshot
}

export interface GrowthEdge {
  edgeId: string
  from: string
  to: string
  type: GrowthEdgeType
}

export interface GrowthGraph {
  graphId: string
  ownerUnitId: string
  nodes: GrowthNode[]
  edges: GrowthEdge[]
  createdAt: number
  updatedAt: number
}

// ============================================================================
// GrowthGraphStore
// ============================================================================

export class GrowthGraphStore {
  private graph: GrowthGraph

  constructor(graphId: string, ownerUnitId: string) {
    this.graph = {
      graphId,
      ownerUnitId,
      nodes: [],
      edges: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
  }

  /** 获取当前 Graph 的只读快照 */
  getGraph(): Readonly<GrowthGraph> {
    return this.graph
  }

  /** 获取最新的 Node */
  getLatestNode(): GrowthNode | null {
    return this.graph.nodes.length > 0
      ? this.graph.nodes[this.graph.nodes.length - 1]
      : null
  }

  /**
   * 基于 MemoryDecision 和 ProjectionDelta 添加 GrowthNode。
   *
   * 规则（M86.2.3）：
   *   - 仅 shouldPersist=true + cause='user_progress' 时添加
   *   - policy_change / template_change 不进入 GrowthGraph
   *   - milestone → type='milestone'
   *   - delta → type='delta'
   */
  applyDecision(
    decision: Decision<MemoryPersistencePayload>,
    delta: ProjectionDelta,
    snapshot: GrowthSnapshot,
  ): GrowthNode | null {
    // 非 user_progress 不进入 GrowthGraph
    if (delta.cause !== 'user_progress') {
      return null
    }

    // shouldPersist=false 不进入
    if (!decision.output.shouldPersist) {
      return null
    }

    const nodeType: GrowthNodeType =
      decision.output.growthEventType === 'milestone' ? 'milestone' :
      decision.output.growthEventType === 'reactivation' ? 'reactivation' :
      'delta'

    const node: GrowthNode = {
      nodeId: `node-${Date.now()}-${this.graph.nodes.length}`,
      type: nodeType,
      deltaRef: delta.deltaId,
      sessionRef: delta.sessionRef,
      timestamp: delta.timestamp,
      cause: delta.cause,
      snapshot,
    }

    // 添加 Node（Append Only）
    this.graph.nodes.push(node)

    // 自动连接 Edge
    const prevNode = this.graph.nodes.length > 1
      ? this.graph.nodes[this.graph.nodes.length - 2]
      : null

    if (prevNode) {
      const edge: GrowthEdge = {
        edgeId: `edge-${prevNode.nodeId}→${node.nodeId}`,
        from: prevNode.nodeId,
        to: node.nodeId,
        type: nodeType === 'reactivation' ? 'continues' : 'continues',
      }
      this.graph.edges.push(edge)
    }

    this.graph.updatedAt = Date.now()
    return node
  }

  /**
   * 添加分支起点（同一主题的不同维度探索）。
   * 从指定 parentNode 分叉到新分支。
   */
  addBranch(
    parentNodeId: string,
    delta: ProjectionDelta,
    snapshot: GrowthSnapshot,
  ): GrowthNode | null {
    if (delta.cause !== 'user_progress') return null

    const parentNode = this.graph.nodes.find((n) => n.nodeId === parentNodeId)
    if (!parentNode) return null

    const node: GrowthNode = {
      nodeId: `node-${Date.now()}-${this.graph.nodes.length}`,
      type: 'branch',
      deltaRef: delta.deltaId,
      sessionRef: delta.sessionRef,
      timestamp: delta.timestamp,
      cause: delta.cause,
      snapshot,
    }

    this.graph.nodes.push(node)

    const edge: GrowthEdge = {
      edgeId: `edge-${parentNodeId}→${node.nodeId}`,
      from: parentNodeId,
      to: node.nodeId,
      type: 'branches',
    }
    this.graph.edges.push(edge)

    this.graph.updatedAt = Date.now()
    return node
  }

  /**
   * 添加探索起始节点。
   */
  addExplorationStart(
    sessionRef: string,
    snapshot: GrowthSnapshot,
  ): GrowthNode {
    const node: GrowthNode = {
      nodeId: `node-start-${Date.now()}`,
      type: 'exploration_start',
      sessionRef,
      timestamp: Date.now(),
      cause: 'user_progress',
      snapshot,
    }

    this.graph.nodes.push(node)
    this.graph.updatedAt = Date.now()
    return node
  }
}
