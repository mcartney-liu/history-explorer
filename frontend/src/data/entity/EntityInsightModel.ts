// ============================================================
// M60 — EntityInsightModel (upgraded)
// Builds a human-readable narrative from EntityViewModel data.
// No AI. Uses existing data: summary, timeline, relationships.
// Future: generateInsight(entity, context) → AIOrchestrator.
// ============================================================

import type { EntityDetail } from './entityTypes'

export interface InsightKey {
  name: string
  /** Global id used for navigation (other.global_id ?? other.id) */
  id: string
}

export interface EntityInsight {
  text: string
  /** Key relationships as clickable badges: name + global id for navigation */
  keyNames: InsightKey[]
  /** Timeline highlights for UI timeline chip */
  timelineHighlights: string[]
  sourceFields: string[]
}

const TYPE_NAMES: Record<string, string> = {
  Person: '人物',
  Event: '历史事件',
  Civilization: '文明',
  Dynasty: '朝代',
  Battle: '战役',
  Period: '历史时期',
  Document: '典籍',
  Concept: '思想',
  Location: '地区',
}

/**
 * Build a natural-language insight narrative from entity data.
 * Priority: description → significance → relationships → timeline.
 * Future: replace with generateInsight(entity, context) that calls AIOrchestrator.
 */
export function buildInsight(entity: EntityDetail): EntityInsight {
  const name = entity.name
  const typeLabel = TYPE_NAMES[entity.type] || entity.type
  const summary = entity.summary ?? {}
  const timeline = entity.timeline ?? []
  const relationships = entity.relationships ?? []

  // Extract description
  const description =
    (typeof summary['description'] === 'string' && summary['description'].length > 20
      ? summary['description']
      : typeof summary['summary'] === 'string' && summary['summary'].length > 20
        ? summary['summary']
        : typeof summary['abstract'] === 'string' && summary['abstract'].length > 20
          ? summary['abstract']
          : '')

  // Extract significance
  const significance =
    (typeof summary['significance'] === 'string' && summary['significance'].length > 10
      ? summary['significance']
      : '')

  // Build narrative
  const parts: string[] = []

  if (description) {
    // Truncate very long descriptions
    const short = description.length > 300 ? description.slice(0, 300) + '...' : description
    parts.push(short)
  } else {
    // Fallback: build from structure
    parts.push(`${name} 是历史上重要的${typeLabel}。`)
  }

  if (significance && !description?.includes(significance.slice(0, 20))) {
    parts.push(significance)
  }

  // Relationship narrative — meaningful, not "exists"
  const topRelations = relationships.slice(0, 5)
  if (topRelations.length > 0) {
    const names = [...new Set(topRelations.map((r) => r.other.name))]
    if (names.length === 1) {
      parts.push(`${name} 与 ${names[0]} 有着密不可分的历史关联。`)
    } else if (names.length > 1) {
      parts.push(`${name} 与 ${names.join('、')} 等重要历史对象紧密关联。`)
    }
  }

  // Timeline narrative
  const topEvents = timeline.slice(0, 4)
  const timelineHighlights: string[] = topEvents
    .map((t) => String(t.event ?? t.period ?? ''))
    .filter(Boolean)

  if (timelineHighlights.length > 0) {
    const eventList = timelineHighlights.slice(0, 3).join('、')
    parts.push(`关键事件包括：${eventList}。`)
  }

  const text = parts.join(' ')

  // Key relationships as clickable badges: dedupe by name, carry global id
  // so the UI can navigate to the related entity on click.
  const seenNames = new Set<string>()
  const keyNames: InsightKey[] = []
  for (const r of relationships.slice(0, 5)) {
    const nm = r.other?.name
    if (!nm || seenNames.has(nm)) continue
    seenNames.add(nm)
    keyNames.push({ name: nm, id: r.other.global_id ?? r.other.id })
  }

  return {
    text,
    keyNames,
    timelineHighlights: timelineHighlights.slice(0, 5),
    sourceFields: [
      ...(description ? ['summary.description'] : []),
      ...(significance ? ['summary.significance'] : []),
      ...(relationships.length > 0 ? ['relationships'] : []),
      ...(timeline.length > 0 ? ['timeline'] : []),
    ],
  }
}

/**
 * Strip residual Markdown markers from AI/backend text so the UI (which
 * renders plain text) doesn't surface **bold** / __italic__ / # headings /
 * `code`. Backend also constrains pure-text output; this is a front-end net.
 */
export function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
}
