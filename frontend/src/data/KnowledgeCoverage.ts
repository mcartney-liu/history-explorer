// ============================================================
// M42 Phase 3 — KnowledgeCoverage
// Data quality analysis tool for content builders.
// Internal utility — NOT user-facing. NOT AI. NOT backend.
// ============================================================

// -----------------------------------------------------------
// Types
// -----------------------------------------------------------

export interface EntityRecord {
  id: string
  type: string
  name?: string
}

export interface SourceRecord {
  id: string
  type?: string
  title?: string
}

export interface ClaimRecord {
  id: string
  subject_type?: string
  subject_id?: string
  source_id?: string
  source_ids?: string[]
}

export interface CoverageMetrics {
  entityType: string
  entityCount: number
  sourceCount: number
  claimCount: number
  relationshipCount: number
  avgDimensionsCovered: number
}

export interface CoverageWarning {
  entityType: string
  level: 'low' | 'medium' | 'good'
  reason: string
}

// -----------------------------------------------------------
// Constants
// -----------------------------------------------------------

const ENTITY_TYPES = [
  'Civilization',
  'Event',
  'Person',
  'Religion',
  'Technology',
  'Location',
  'Idea',
]

// -----------------------------------------------------------
// Calculation
// -----------------------------------------------------------

export function calculateKnowledgeCoverage(
  entities: EntityRecord[],
  _sources?: SourceRecord[],
  claims?: ClaimRecord[],
): CoverageMetrics[] {
  const safeEntities = entities.filter((e) => e && typeof e.type === 'string')
  const safeClaims = claims ?? []

  // Group entities by type
  const entityByType = new Map<string, EntityRecord[]>()
  for (const e of safeEntities) {
    if (!entityByType.has(e.type)) entityByType.set(e.type, [])
    entityByType.get(e.type)!.push(e)
  }

  // Group claims by subject_id prefix for type inference
  const claimByType = new Map<string, ClaimRecord[]>()
  for (const c of safeClaims) {
    // Infer entity type from subject_id pattern if possible
    // Otherwise assign based on which entities the subject_id matches
    const matchedType = safeEntities.find((e) => e.id === c.subject_id)?.type
    const typeKey = matchedType ?? 'unknown'
    if (!claimByType.has(typeKey)) claimByType.set(typeKey, [])
    claimByType.get(typeKey)!.push(c)
  }

  // Count unique sources per entity type
  const sourcesByType = new Map<string, Set<string>>()
  for (const c of safeClaims) {
    const matchedType = safeEntities.find((e) => e.id === c.subject_id)?.type ?? 'unknown'
    if (!sourcesByType.has(matchedType)) sourcesByType.set(matchedType, new Set())
    const set = sourcesByType.get(matchedType)!
    if (c.source_id) set.add(c.source_id)
    for (const sid of c.source_ids ?? []) set.add(sid)
  }

  return ENTITY_TYPES.map((type) => {
    const ents = entityByType.get(type) ?? []
    const entityCount = ents.length
    const claims_for_type = claimByType.get(type) ?? []
    const claimCount = claims_for_type.length
    const sourceSet = sourcesByType.get(type)
    const sourceCount = sourceSet ? sourceSet.size : 0

    // Relationship count: count claims with subject_type === 'relationship'
    const relationshipCount = claims_for_type.filter(
      (c) => c.subject_type === 'relationship',
    ).length

    // Average dimensions: claims per entity (a proxy for dimension coverage)
    const avgDimensions =
      entityCount > 0
        ? Math.round((claimCount / entityCount) * 10) / 10
        : 0

    return {
      entityType: type,
      entityCount,
      sourceCount,
      claimCount,
      relationshipCount,
      avgDimensionsCovered: avgDimensions,
    }
  })
}

// -----------------------------------------------------------
// Quality Helpers
// -----------------------------------------------------------

export function getCoverageWarnings(
  metrics: CoverageMetrics[],
): CoverageWarning[] {
  return metrics
    .map((m) => {
      if (m.entityCount === 0) {
        return { entityType: m.entityType, level: 'low' as const, reason: 'no_entities' }
      }
      if (m.sourceCount < 3) {
        return { entityType: m.entityType, level: 'low' as const, reason: 'source_count_low' }
      }
      if (m.claimCount < 5) {
        return { entityType: m.entityType, level: 'low' as const, reason: 'claim_count_low' }
      }
      if (m.avgDimensionsCovered < 2) {
        return { entityType: m.entityType, level: 'medium' as const, reason: 'dimension_coverage_low' }
      }
      return { entityType: m.entityType, level: 'good' as const, reason: 'adequate' }
    })
    .filter((w) => w.level !== 'good')
}

export function coverageSummary(metrics: CoverageMetrics[]): string {
  const totalEntities = metrics.reduce((s, m) => s + m.entityCount, 0)
  const totalSources = metrics.reduce((s, m) => s + m.sourceCount, 0)
  const totalClaims = metrics.reduce((s, m) => s + m.claimCount, 0)
  const weakTypes = metrics.filter((m) => m.entityCount > 0 && m.sourceCount < 3)

  let summary = `Total entities: ${totalEntities}. Sources: ${totalSources}. Claims: ${totalClaims}.`
  if (weakTypes.length > 0) {
    summary += ` Low coverage: ${weakTypes.map((m) => m.entityType).join(', ')}.`
  }
  return summary
}
