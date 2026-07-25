// M16 (Relationship Insight Visualization Layer): pure relationship inspectors.
//
// SCOPE (frozen): this module is a PURE data-inspection layer for the
// RelationshipInsightPanel. It carries NO React state, NO API/fetch, NO AI,
// NO causal inference, and introduces NO new KG semantics.
//
// It operates strictly on data that already exists in the client:
//   - Candidate[]           (already-selected entities from the picker)
//   - EntityRelationship[]  (already-fetched relationship metadata)
//   - a name -> time-range string map (buildEntityTimeMap output)
//   - an optional name/gid -> geo point map (backend currently exposes none)
//
// Allowed (per M16 corrections): existing relationship metadata display,
// relation type display, timeline overlap comparison, geographic comparison.
// Forbidden: causal inference, relationship discovery, inferred edges,
// new KG schema, any network/DB access.
//
// Every export is a deterministic pure function: same inputs -> same output,
// no side effects, no Date/Math.random, no module-level mutable state.

import type { Candidate } from './candidateUtils'
import type { EntityRelationship } from '../components/EntityPage'

// ---------------------------------------------------------------------------
// Pairing
// ---------------------------------------------------------------------------

/**
 * Return every unique unordered pair of candidates (combinations of 2).
 * Candidates are de-duplicated by `gid` (first occurrence wins) so a candidate
 * is never compared with itself. Each returned pair is ordered by `gid`
 * ascending for deterministic output. Returns [] when fewer than 2 distinct
 * candidates are supplied.
 */
export function pairEntities(candidates: Candidate[]): Array<[Candidate, Candidate]> {
  const seen = new Set<string>()
  const distinct: Candidate[] = []
  for (const c of candidates ?? []) {
    if (!c || typeof c.gid !== 'string') continue
    if (seen.has(c.gid)) continue
    seen.add(c.gid)
    distinct.push(c)
  }
  const pairs: Array<[Candidate, Candidate]> = []
  for (let i = 0; i < distinct.length; i++) {
    for (let j = i + 1; j < distinct.length; j++) {
      const a = distinct[i]
      const b = distinct[j]
      pairs.push(a.gid <= b.gid ? [a, b] : [b, a])
    }
  }
  return pairs
}

// ---------------------------------------------------------------------------
// Existing relationship lookup (metadata only, never inferred)
// ---------------------------------------------------------------------------

function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false
  for (const v of a) if (!b.has(v)) return false
  return true
}

/**
 * Find relationships from `relationships` that connect the two candidates in
 * `pair`. Every entry in `relationships` (the exploration's related-entity
 * list) has a single shared `source` entity — the current exploration's main
 * entity — and `mainGlobalId` is that source's global_id. A relationship
 * matches the pair when its two endpoint global_ids equal the pair's two
 * global_ids: i.e. one candidate IS the main entity and the other matches
 * `rel.other.global_id`.
 *
 * This is a lookup over EXISTING metadata only; it never invents edges. When
 * `mainGlobalId` is absent the source endpoint cannot be confirmed, so no
 * relationship can be matched (returns []).
 */
export function findExistingRelationships(
  pair: [Candidate, Candidate],
  relationships: EntityRelationship[],
  mainGlobalId?: string,
): EntityRelationship[] {
  if (!mainGlobalId || !pair) return []
  const pairGids = new Set([pair[0]?.gid, pair[1]?.gid])
  if (pairGids.size < 2) return []
  const matches: EntityRelationship[] = []
  for (const rel of relationships ?? []) {
    if (!rel?.other?.global_id) continue
    const endpointGids = new Set([mainGlobalId, rel.other.global_id])
    if (endpointGids.size === 2 && setsEqual(endpointGids, pairGids)) {
      matches.push(rel)
    }
  }
  return matches
}

// ---------------------------------------------------------------------------
// Timeline overlap comparison
// ---------------------------------------------------------------------------

export type ParsedRange = {
  // negative = BCE, positive = CE; null = unknown bound
  start: number | null
  end: number | null
}

export type TimelineOverlapStatus = 'overlap' | 'gap' | 'partial' | 'unknown'

export type TimelineOverlapResult = {
  available: boolean
  aRange: ParsedRange | null
  bRange: ParsedRange | null
  status: TimelineOverlapStatus
  overlapStart: number | null
  overlapEnd: number | null
  note: string
}

function fmtYear(v: number): string {
  const n = Math.round(v)
  return n < 0 ? `${Math.abs(n)} BC` : `${n} CE`
}

// Parse a buildEntityTimeMap value, e.g. "221 BC - 14 CE". Also accepts a
// single token ("221 BC" / "14 CE"). Returns null when no usable bound.
function parseTimeRange(s?: string | null): ParsedRange | null {
  if (!s || !s.trim()) return null
  const parts = s
    .split('-')
    .map((p) => p.trim())
    .filter(Boolean)
  if (parts.length === 0) return null
  const parseToken = (tok: string): number | null => {
    const m = /^(\d+)\s*(BC|CE|BCE|AD)$/i.exec(tok)
    if (!m) return null
    const n = parseInt(m[1], 10)
    const era = m[2].toUpperCase()
    return era === 'BC' || era === 'BCE' ? -n : n
  }
  if (parts.length === 2) {
    const s0 = parseToken(parts[0])
    const s1 = parseToken(parts[1])
    if (s0 === null || s1 === null) return null
    return { start: s0, end: s1 }
  }
  // Single token: we cannot tell whether it is a start-only or end-only bound,
  // so we treat it as a point (start === end). The result's note signals the
  // limited basis so the UI never over-claims an overlap.
  const v = parseToken(parts[0])
  if (v === null) return null
  return { start: v, end: v }
}

/**
 * Compare the time ranges of two candidates using a pre-built name -> range
 * map (buildEntityTimeMap output). Fully deterministic; reports overlap, gap,
 * or partial/unknown when data is insufficient. Never infers a relationship
 * from a temporal coincidence — it only displays the available bounds.
 */
export function timelineOverlap(
  pair: [Candidate, Candidate],
  timeMap: Record<string, string>,
): TimelineOverlapResult {
  const aName = pair?.[0]?.name
  const bName = pair?.[1]?.name
  const aRange = aName != null ? parseTimeRange(timeMap?.[aName]) : null
  const bRange = bName != null ? parseTimeRange(timeMap?.[bName]) : null

  if (!aRange && !bRange) {
    return {
      available: false,
      aRange: null,
      bRange: null,
      status: 'unknown',
      overlapStart: null,
      overlapEnd: null,
      note: 'No timeline data available for the selected entities.',
    }
  }

  // Only one side carries data: a full comparison is impossible.
  if (!aRange || !bRange) {
    return {
      available: true,
      aRange,
      bRange,
      status: 'partial',
      overlapStart: null,
      overlapEnd: null,
      note: 'Only one entity has timeline data; overlap cannot be fully determined.',
    }
  }

  const aStart = aRange.start ?? -Infinity
  const aEnd = aRange.end ?? Infinity
  const bStart = bRange.start ?? -Infinity
  const bEnd = bRange.end ?? Infinity
  const ovStart = Math.max(aStart, bStart)
  const ovEnd = Math.min(aEnd, bEnd)

  let status: TimelineOverlapStatus
  let overlapStart: number | null = null
  let overlapEnd: number | null = null
  let note: string

  if (ovStart <= ovEnd) {
    status = 'overlap'
    overlapStart = Number.isFinite(ovStart) ? ovStart : null
    overlapEnd = Number.isFinite(ovEnd) ? ovEnd : null
    const span = ovEnd - ovStart
    note = Number.isFinite(span)
      ? `Timelines overlap from ${fmtYear(ovStart)} to ${fmtYear(ovEnd)} (about ${Math.round(span)} years).`
      : 'Timelines overlap (one or both ranges are open-ended).'
  } else {
    status = 'gap'
    const gap = ovStart - ovEnd
    note = `No overlap; a gap of about ${Math.round(gap)} years separates the timelines.`
  }

  return { available: true, aRange, bRange, status, overlapStart, overlapEnd, note }
}

// ---------------------------------------------------------------------------
// Geographic comparison (backend exposes no geo data today)
// ---------------------------------------------------------------------------

export type GeoPoint = { lat: number; lon: number }

export type GeoComparisonResult = {
  available: boolean
  a?: GeoPoint
  b?: GeoPoint
  distanceKm?: number
  note: string
}

function haversine(a: GeoPoint, b: GeoPoint): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

/**
 * Compare the geographic coordinates of two candidates. The backend currently
 * exposes NO geo data, so in practice `geoMap` is empty/undefined and this
 * returns `available: false` with an honest note. When coordinates are present
 * it reports both points and their great-circle distance (deterministic math,
 * not an inference). It never invents locations.
 */
export function geoComparison(
  pair: [Candidate, Candidate],
  geoMap?: Record<string, GeoPoint>,
): GeoComparisonResult {
  if (!geoMap) {
    return { available: false, note: 'No geographic data available for comparison.' }
  }
  const resolve = (c?: Candidate): GeoPoint | undefined => {
    if (!c) return undefined
    return geoMap[c.name] ?? (c.gid ? geoMap[c.gid] : undefined)
  }
  const a = resolve(pair?.[0])
  const b = resolve(pair?.[1])
  if (!a || !b) {
    return {
      available: false,
      a,
      b,
      note:
        !a && !b
          ? 'No geographic data available for the selected entities.'
          : 'Geographic data available for only one entity; comparison requires both.',
    }
  }
  const distanceKm = haversine(a, b)
  return {
    available: true,
    a,
    b,
    distanceKm,
    note: `Great-circle distance ≈ ${Math.round(distanceKm)} km.`,
  }
}
