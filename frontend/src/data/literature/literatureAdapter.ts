// ============================================================
// 文学板块（预览版）— 数据适配器
// 把策展种子数据（LitNode / LitEdge）映射成现有组件能直接消费的
// 形状：GraphNode / GraphEdge / TimelineEvent。
//
// 关键点：ConnectionExplorer 只用 node.id / node.name / node.type，
// 图标与类型标签由 node.type（8 种冻结类型之一）本地解析，因此
// 这里无需把文学节点注册进任何后端数据集，零耦合。
// ============================================================

import type { GraphNode, GraphEdge, TimelineEvent } from '../entity/entityTypes'
import { LIT_NODES, LIT_EDGES, type LitNode } from './literatureData'

/** 全部节点 → GraphNode[] */
export function allGraphNodes(): GraphNode[] {
  return LIT_NODES.map((n) => ({ id: n.id, name: n.name, type: n.type }))
}

/** 全部关系边 → GraphEdge[] */
export function allGraphEdges(): GraphEdge[] {
  return LIT_EDGES.map((e) => ({
    source: e.source,
    target: e.target,
    relation: e.relation,
    label: e.label,
  }))
}

/** 带年份的节点 → 时间线事件 */
export function allTimeline(): TimelineEvent[] {
  return LIT_NODES.filter((n) => typeof n.year === 'number').map((n) => ({
    year: n.year,
    label: n.name,
    name: n.name,
    event: n.name,
  }))
}

/** 按 id 取节点 */
export function getNode(id: string): LitNode | undefined {
  return LIT_NODES.find((n) => n.id === id)
}

/**
 * 聚焦节点的「邻域」：聚焦节点本身 + 其直接相连的节点，以及所有
 * 与它相关的边。用于「聚焦关系」视图，让每次只看一个局部小图。
 */
export function neighborhoodOf(id: string): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const node = getNode(id)
  if (!node) return { nodes: [], edges: [] }

  const incident = LIT_EDGES.filter((e) => e.source === id || e.target === id)
  const neighborIds = new Set<string>()
  incident.forEach((e) => {
    neighborIds.add(e.source === id ? e.target : e.source)
  })

  const nodes: GraphNode[] = [
    node,
    ...LIT_NODES.filter((n) => neighborIds.has(n.id)),
  ].map((n) => ({ id: n.id, name: n.name, type: n.type }))

  const edges: GraphEdge[] = incident.map((e) => ({
    source: e.source,
    target: e.target,
    relation: e.relation,
    label: e.label,
  }))

  return { nodes, edges }
}
