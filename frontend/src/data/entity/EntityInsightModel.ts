// ============================================================
// M59-019 — EntityInsightModel
// Builds an "insight" summary from EntityViewModel data.
// No AI. Pure deterministic extraction. Future: generateInsight().
// ============================================================

import type { EntityDetail } from './entityTypes'

export interface EntityInsight {
  text: string
  sourceFields: string[]
}

/**
 * Build an insight summary from entity summary data.
 * Returns a human-readable paragraph of key facts.
 * Future: replace with generateInsight(entity, context) that calls AIOrchestrator.
 */
export function buildInsight(entity: EntityDetail): EntityInsight {
  const summary = entity.summary
  const parts: string[] = []

  // Try known fields
  const description = summary['description'] ?? summary['summary'] ?? summary['abstract']
  if (typeof description === 'string' && description.length > 20) {
    parts.push(description)
  }

  const significance = summary['significance'] ?? summary['historical_significance'] ?? summary['legacy']
  if (typeof significance === 'string' && significance.length > 10) {
    parts.push(significance)
  }

  // Relationships hint
  if (entity.relationships.length > 0 && parts.length === 0) {
    const names = entity.relationships
      .slice(0, 3)
      .map((r) => r.other.name)
      .join('、')
    parts.push(`${entity.name} 与 ${names} 等重要历史对象存在关联。`)
  }

  // Timeline hint
  if (entity.timeline.length > 0 && parts.length === 0) {
    parts.push(`${entity.name} 的历史时间线包含 ${entity.timeline.length} 个关键时间节点。`)
  }

  const text = parts.join(' ') || `${entity.name} 是一个${entity.type}类型的历史实体。`

  return {
    text,
    sourceFields: parts.length > 0
      ? ['summary.description', 'summary.significance', 'relationships', 'timeline']
      : ['entity.type'],
  }
}
