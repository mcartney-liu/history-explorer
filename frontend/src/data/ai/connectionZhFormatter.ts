// ============================================================
// 2026-08-13 (PO) — ContinueExploringPanel 关系描述中文化
//
// 后端返回的 explanation 是英文结构化句（"X influenced Y; Y was
// influenced by Z"），用户看不懂。这里用结构数据（path + steps）
// 重新拼一条中文链：罗马文明 → 影响 → 希腊文明 → 受影响于 → 波斯。
//
// 纯前端，不改后端。getEntityDisplayName / getRelationshipLabel
// 均来自既有模块。
// ============================================================

import { getEntityDisplayName } from '../explorationPackages'
import { getRelationshipLabel } from '../entity/entityLabels'
import type { ConnectionExplained } from '../../components/ConnectionsExplainedPanel'

type PathStep = {
  from_global_id: string
  to_global_id: string
  relationship: string
  direction: string
  weight?: number
}

/**
 * 用 path + steps 拼一条中文推理链描述。
 *
 * @param item    ConnectionExplained（path 为 global_id 数组，steps 为边）
 * @param locale  当前语言（zh/en/ja）
 * @returns      中文链文本，如「罗马文明 → 影响 → 希腊文明 → 受影响于 → 波斯」；
 *               无 path 时回退到原文 explanation。
 */
export function formatConnectionZh(
  item: ConnectionExplained,
  locale: 'zh' | 'en' | 'ja' = 'zh',
): string {
  const path = Array.isArray(item.path) ? (item.path as string[]) : []
  if (path.length === 0) {
    return item.explanation || ''
  }
  const steps = Array.isArray(item.steps) ? (item.steps as PathStep[]) : []

  const name = (gid: string): string => getEntityDisplayName(gid, locale)
  const rel = (edge?: PathStep): string => {
    if (!edge) return '→'
    return getRelationshipLabel(edge.relationship, locale)
  }

  const parts: string[] = []
  path.forEach((node, i) => {
    parts.push(name(node))
    if (i < path.length - 1) {
      const edge = steps.find(
        (s) => s.from_global_id === node && s.to_global_id === path[i + 1],
      )
      parts.push(rel(edge))
    }
  })
  return parts.join(' → ')
}

/**
 * 兼容旧用法：主实体名 + 一条中文链的完整描述。
 * 若调用方只需要链路（不含主实体前缀），可只调 formatConnectionZh。
 */
export { getEntityDisplayName }
