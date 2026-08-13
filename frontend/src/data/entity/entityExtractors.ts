// ============================================================
// M59-005 — Entity Extractors
// Pure functions extracting structured data from
// entity.summary (Record<string, unknown>) using
// candidate-field strategies. No hardcoded field names.
// ============================================================

import type { EntityDetail, EntityRelationship, GraphNode, GraphEdge } from './entityTypes'

/**
 * Relationship type → Chinese label map.
 * Covers all 20 types observed in production data (2026-08-13 audit).
 * Unknown types fall through to underscore-to-space + title-case formatting.
 */
const RELATION_TYPE_LABELS: Record<string, string> = {
  after: '晚于',
  before: '早于',
  caused: '导致',
  conquered: '征服',
  contemporary_with: '同时代',
  discovered: '发现',
  disputes: '冲突',
  influenced: '影响',
  inherited: '继承',
  invented: '发明',
  located_at: '位于',
  part_of: '属于',
  participated_in: '参与',
  practiced: '实践',
  reinterprets: '重新诠释',
  related_to: '相关',
  ruled: '统治',
  spoke: '使用语言',
  spread: '传播',
  traded_with: '贸易往来',
}

/** Translate a raw relation type key to a display label (Chinese). */
export function translateRelationType(type: string): string {
  return RELATION_TYPE_LABELS[type] ?? type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// ---- Time Extraction ----
export function extractTime(entity: EntityDetail): string {
  const summary = entity.summary
  const candidates = ['time_range', 'timeRange', 'period', 'date', 'years', 'year',
    'start_year', 'end_year', 'founded', 'duration', 'era']

  for (const key of candidates) {
    const val = summary[key]
    if (typeof val === 'string' && val.length > 0) return val
    if (typeof val === 'number') return String(val)
  }

  // Composite: start_year-end_year
  const start = summary['start_year'] ?? summary['birth'] ?? summary['birth_year']
  const end = summary['end_year'] ?? summary['death'] ?? summary['death_year']
  if (start != null && end != null) return `${start} – ${end}`
  if (start != null) return `${start}`
  if (end != null) return `– ${end}`

  return ''
}

// ---- Location Extraction ----
export function extractLocation(entity: EntityDetail): string {
  const summary = entity.summary
  const candidates = ['location', 'place', 'region', 'capital', 'city', 'country',
    'birth_place', 'origin', 'territory', 'area']

  for (const key of candidates) {
    const val = summary[key]
    if (typeof val === 'string' && val.length > 0) return val
  }

  return ''
}

// ---- Key Facts ----
export function extractKeyFacts(entity: EntityDetail): string[] {
  const summary = entity.summary
  const facts: string[] = []

  // Fact 1: Entity type label
  const type = entity.type
  if (type) facts.push(`Type: ${type}`)

  // Fact 2: Time
  const time = extractTime(entity)
  if (time) facts.push(`Time: ${time}`)

  // Fact 3: Location or significance
  const location = extractLocation(entity)
  if (location) {
    facts.push(`Location: ${location}`)
  } else {
    const sig = summary['significance'] ?? summary['historical_significance']
    if (typeof sig === 'string' && sig.length > 0) facts.push(sig)
  }

  // Additional facts from explicit fields
  const extraCandidates = ['population', 'area_km2', 'duration', 'notable_for']
  for (const key of extraCandidates) {
    const val = summary[key]
    if (val != null && facts.length < 5) {
      facts.push(`${key.replace(/_/g, ' ')}: ${val}`)
    }
  }

  return facts
}

// ---- Summary Text ----
export function extractSummary(entity: EntityDetail): string {
  const summary = entity.summary
  const candidates = ['summary', 'description', 'abstract', 'overview', 'bio']

  for (const key of candidates) {
    const val = summary[key]
    if (typeof val === 'string' && val.length > 0) return val
  }

  // Fallback: join all top-level string values
  const parts = Object.values(summary).filter((v) => typeof v === 'string' && v.length > 10)
  return parts.slice(0, 3).join('. ')
}

// ---- Significance ----
export function extractSignificance(entity: EntityDetail): string {
  const summary = entity.summary
  const candidates = ['significance', 'historical_significance', 'importance', 'legacy',
    'why_important']

  for (const key of candidates) {
    const val = summary[key]
    if (typeof val === 'string' && val.length > 0) return val
  }

  return ''
}

// ---- Graph Construction ----
export function buildGraph(
  entity: EntityDetail,
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [
    { id: entity.id, name: entity.name, type: entity.type },
  ]
  const edges: GraphEdge[] = []
  const seen = new Set<string>()
  seen.add(entity.id)

  for (const rel of entity.relationships) {
    const other = rel.other
    const otherId = other.global_id ?? other.id
    if (!otherId) continue

    if (!seen.has(otherId)) {
      nodes.push({ id: otherId, name: other.name, type: other.type })
      seen.add(otherId)
    }

    edges.push({
      source: entity.id,
      target: otherId,
      relation: rel.type,
      label: translateRelationType(rel.type),
    })
  }

  return { nodes, edges }
}

// ---- Top Relations ----
export function buildTopRelations(
  relationships: EntityRelationship[],
  limit: number = 5,
): EntityRelationship[] {
  return relationships.slice(0, limit)
}

// ---- AI Context ----
export function buildAIContext(entity: EntityDetail): string {
  const parts: string[] = []
  parts.push(`Entity: ${entity.name} (${entity.type})`)
  const time = extractTime(entity)
  if (time) parts.push(`Time: ${time}`)
  const loc = extractLocation(entity)
  if (loc) parts.push(`Location: ${loc}`)
  const sum = extractSummary(entity)
  if (sum) parts.push(sum)

  if (entity.relationships.length > 0) {
    const topNames = entity.relationships
      .slice(0, 5)
      .map((r) => `${r.other.name} (${r.type.replace(/_/g, ' ')})`)
      .join(', ')
    parts.push(`Connected to: ${topNames}`)
  }

  return parts.join('\n')
}
