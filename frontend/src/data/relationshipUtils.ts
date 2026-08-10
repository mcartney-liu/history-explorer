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

// ---------------------------------------------------------------------------
// M17 (Relationship Insight Enhancement): aggregated type analytics.
// ---------------------------------------------------------------------------
//
// SCOPE (frozen): still a PURE data-inspection layer. Everything below
// operates on data already present in the client, introduces NO new KG
// semantics, performs NO causal inference, invents NO edges, and touches NO
// network/AI. Relationship metadata is summarized and tabulated only.

/**
 * Frozen frontend mirror of the backend enum `RELATIONSHIP_TYPES`
 * (backend/app/validation.py, Schema Freeze M3.5-000, 20 types after
 * ADR-0019 disputes/reinterprets). This is a DISPLAY-ONLY constant: it does
 * not change the backend enum, the schema, or any relationship semantics.
 * It exists so that relationship types emitted by the API can be validated
 * against the known vocabulary and any value outside the frozen set is
 * bucketed as `unknown` (honest, not silently accepted).
 */
export const RELATIONSHIP_TYPES: ReadonlySet<string> = new Set<string>([
  'caused',
  'influenced',
  'participated_in',
  'located_at',
  'related_to',
  'before',
  'after',
  'contemporary_with',
  'part_of',
  'ruled',
  'traded_with',
  'invented',
  'discovered',
  'practiced',
  'spoke',
  'inherited',
  'conquered',
  'spread',
  'disputes',
  'reinterprets',
])

/**
 * Count relationships by their `type`. Returns `{ [relationshipType]: count }`.
 * Types that are NOT part of the frozen 18-type vocabulary are aggregated under
 * the key `unknown` (so data-quality drift is visible, never hidden). The input
 * array and its members are never mutated.
 *
 * This is a pure tally — it attaches no meaning, cause, or narrative to any
 * relationship type.
 */
export function aggregateRelationshipTypes(
  relationships: EntityRelationship[],
): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const rel of relationships ?? []) {
    if (!rel || typeof rel.type !== 'string') continue
    const key = RELATIONSHIP_TYPES.has(rel.type) ? rel.type : 'unknown'
    counts[key] = (counts[key] ?? 0) + 1
  }
  return counts
}

export type RelationshipMatrixRow = {
  /** Source entity display name (the exploration's main entity). */
  source: string
  sourceGlobalId?: string
  /** The relationship type exactly as emitted by the API. */
  relationType: string
  /** Target entity display name (`rel.other.name`). */
  target: string
  targetGlobalId?: string
}

/**
 * Tabulate the existing relationship edges as a flat matrix of
 * `source —(relationType)—> target` rows, one per relationship. This is a
 * tabular VIEW of metadata that already exists; it never infers edges, never
 * invents a target, and never attaches causal meaning. The `source` is resolved
 * from `opts.sourceName` / `opts.nameByGlobalId[mainGlobalId]` and falls back to
 * the raw id when no friendly name is available (no fabrication).
 */
export function buildRelationshipTypeMatrix(
  relationships: EntityRelationship[],
  opts?: {
    mainGlobalId?: string
    sourceName?: string
    nameByGlobalId?: Record<string, string>
  },
): RelationshipMatrixRow[] {
  const nameByGid = opts?.nameByGlobalId ?? {}
  const mainGid = opts?.mainGlobalId
  const rows: RelationshipMatrixRow[] = []
  for (const rel of relationships ?? []) {
    if (!rel || !rel.other) continue
    const relationType = typeof rel.type === 'string' ? rel.type : ''
    const targetGid = rel.other.global_id
    const target = rel.other.name || targetGid || rel.target || ''
    const sourceGid =
      mainGid ?? (typeof rel.source === 'string' ? rel.source : undefined)
    const source =
      opts?.sourceName ||
      (sourceGid && nameByGid[sourceGid]) ||
      sourceGid ||
      rel.source ||
      ''
    rows.push({
      source,
      sourceGlobalId: sourceGid,
      relationType,
      target,
      targetGlobalId: targetGid,
    })
  }
  return rows
}

export type TimelineBandEntry = {
  name: string
  gid?: string
  /** negative = BCE, positive = CE, null = unknown bound. */
  start: number | null
  end: number | null
  /** Names of OTHER entities whose time bounds overlap this one. */
  overlaps: string[]
}

/**
 * Build a multi-entity timeline band from candidates and a name -> time-range
 * map. Each entry carries `{ name, start, end, overlaps }`. Overlap detection is
 * a PURE bounds comparison (max(start) <= min(end)) between two entities' time
 * ranges — it carries NO historical/causal interpretation and emits NO
 * narrative. Entities without parseable time data appear with null bounds and
 * an empty `overlaps` list (honest "no data"), never fabricated dates.
 */
export function buildMultiEntityTimelineBand(
  candidates: Candidate[],
  timeMap: Record<string, string>,
): TimelineBandEntry[] {
  const entries: TimelineBandEntry[] = []
  for (const c of candidates ?? []) {
    if (!c || !c.name) continue
    const range = parseTimeRange(timeMap?.[c.name])
    entries.push({
      name: c.name,
      gid: c.gid,
      start: range?.start ?? null,
      end: range?.end ?? null,
      overlaps: [],
    })
  }
  for (let i = 0; i < entries.length; i++) {
    const a = entries[i]
    if (a.start == null || a.end == null) continue
    for (let j = 0; j < entries.length; j++) {
      if (i === j) continue
      const b = entries[j]
      if (b.start == null || b.end == null) continue
      const aStart = a.start ?? -Infinity
      const aEnd = a.end ?? Infinity
      const bStart = b.start ?? -Infinity
      const bEnd = b.end ?? Infinity
      const ovStart = Math.max(aStart, bStart)
      const ovEnd = Math.min(aEnd, bEnd)
      if (ovStart <= ovEnd) a.overlaps.push(b.name)
    }
  }
  return entries
}

// ---------------------------------------------------------------------------
// M18 (Relationship Insight: Interactive Controls & Export): pure view helpers.
// ---------------------------------------------------------------------------
//
// SCOPE (frozen): still a PURE data-inspection layer. The helpers below only
// FILTER, SORT, and NORMALIZE rows/bands that were already built by the M17
// functions above. They introduce NO new KG semantics, NO inferred edges, NO
// causal reasoning, NO persistence, and NO network/AI access. Deterministic:
// same input -> same output, inputs are never mutated.

/**
 * Sentinel filter value meaning "no filtering, show every row".
 * Kept as an exported constant so the panel and the helpers agree on it.
 */
export const RELATIONSHIP_FILTER_ALL = 'all'

/**
 * Normalize a raw relationship-type filter string coming from a UI control.
 * - empty / null / undefined / 'all' (any casing, padded) -> RELATIONSHIP_FILTER_ALL
 * - a value inside the frozen 18-type vocabulary -> that canonical value
 * - anything else (including 'unknown' itself) -> 'unknown' bucket, consistent
 *   with how aggregateRelationshipTypes() buckets out-of-vocabulary types.
 * Pure string normalization; no new semantics are introduced.
 */
export function normalizeRelationshipFilter(
  input?: string | null,
): string {
  if (typeof input !== 'string') return RELATIONSHIP_FILTER_ALL
  const v = input.trim().toLowerCase()
  if (v === '' || v === RELATIONSHIP_FILTER_ALL) return RELATIONSHIP_FILTER_ALL
  if (RELATIONSHIP_TYPES.has(v)) return v
  return 'unknown'
}

/**
 * Return the subset of matrix rows whose relationType matches the (normalized)
 * filter. `'all'` returns a shallow copy of every row; `'unknown'` matches rows
 * whose type falls outside the frozen 18-type vocabulary. Rows are never
 * mutated and row order is preserved (this is a view filter, not a ranking).
 */
export function filterRelationshipMatrixByType(
  rows: RelationshipMatrixRow[],
  filter?: string | null,
): RelationshipMatrixRow[] {
  const f = normalizeRelationshipFilter(filter)
  const all = rows ?? []
  if (f === RELATIONSHIP_FILTER_ALL) return all.slice()
  if (f === 'unknown') {
    return all.filter((r) => !RELATIONSHIP_TYPES.has(r.relationType))
  }
  return all.filter((r) => r.relationType === f)
}

/**
 * Sort matrix rows by how frequent each row's relationship-type bucket is,
 * using the counts produced by aggregateRelationshipTypes(). Out-of-vocabulary
 * types read the `unknown` bucket, mirroring the aggregation. The sort is
 * STABLE: rows with equal counts keep their original relative order. Returns a
 * new array; the input array and its rows are never mutated.
 */
export function sortRelationshipMatrixByCount(
  rows: RelationshipMatrixRow[],
  counts: Record<string, number>,
  dir: 'asc' | 'desc' = 'desc',
): RelationshipMatrixRow[] {
  const all = rows ?? []
  const countOf = (r: RelationshipMatrixRow): number => {
    const key = RELATIONSHIP_TYPES.has(r.relationType) ? r.relationType : 'unknown'
    return counts?.[key] ?? 0
  }
  const sign = dir === 'asc' ? 1 : -1
  return all
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      const d = countOf(a.row) - countOf(b.row)
      if (d !== 0) return d * sign
      return a.index - b.index // stable tie-break: original order
    })
    .map((e) => e.row)
}

/**
 * Sort timeline band entries for display. `by: 'start'` (default) orders by
 * the numeric start bound; `by: 'name'` orders by code-point comparison of the
 * entity name (locale-independent, deterministic). Entries with a null sort
 * key are always placed LAST regardless of direction (honest "no data" stays
 * out of the way, never fabricated into a position). Stable; returns a new
 * array without mutating the input.
 */
export function sortTimelineBands(
  bands: TimelineBandEntry[],
  opts?: { by?: 'start' | 'name'; dir?: 'asc' | 'desc' },
): TimelineBandEntry[] {
  const by = opts?.by ?? 'start'
  const dir = opts?.dir ?? 'asc'
  const sign = dir === 'asc' ? 1 : -1
  const all = bands ?? []
  return all
    .map((band, index) => ({ band, index }))
    .sort((a, b) => {
      if (by === 'name') {
        const an = a.band.name ?? ''
        const bn = b.band.name ?? ''
        if (an < bn) return -1 * sign
        if (an > bn) return 1 * sign
        return a.index - b.index
      }
      const as = a.band.start
      const bs = b.band.start
      if (as == null && bs == null) return a.index - b.index
      if (as == null) return 1 // null bounds always last
      if (bs == null) return -1
      if (as !== bs) return (as - bs) * sign
      return a.index - b.index
    })
    .map((e) => e.band)
}

/**
 * Normalize a band's `{ start, end }` bounds for display: if BOTH bounds are
 * present and reversed (start > end), they are swapped; otherwise the bounds
 * are passed through unchanged. A missing bound stays null — this helper never
 * invents a date, never widens a range, and attaches no interpretation.
 * Returns a fresh object; the input band is not mutated.
 */
export function normalizeTimelineRange(
  band: TimelineBandEntry,
): { start: number | null; end: number | null } {
  const start = band?.start ?? null
  const end = band?.end ?? null
  if (start != null && end != null && start > end) {
    return { start: end, end: start }
  }
  return { start, end }
}

// ---------------------------------------------------------------------------
// M19 (Relationship Centrality / Pair Explorer): pure inspectors (additive).
// ---------------------------------------------------------------------------
//
// SCOPE (frozen): still a PURE data-inspection layer. The two helpers below
// operate ONLY on RelationshipMatrixRow[] that were already built by
// buildRelationshipTypeMatrix(). They introduce NO new KG semantics, NO
// invented edges, NO causal reasoning, NO network/AI. Deterministic: same
// input -> same output, inputs are never mutated, no Date/Math.random.

export type RelationshipCentrality = Record<string, number>

/**
 * Degree centrality over an EXISTING relationship matrix. For every row, each
 * endpoint global_id (`sourceGlobalId`, `targetGlobalId`) that is present gets
 * +1. This is an undirected incident-edge count over the metadata already on
 * the client — it attaches no meaning, cause, or narrative to any edge. Rows
 * with a missing endpoint global_id are skipped for that endpoint only (the
 * value is never fabricated). Returns a fresh object; the input array and its
 * rows are never mutated.
 */
export function calculateRelationshipCentrality(
  rows: RelationshipMatrixRow[],
): RelationshipCentrality {
  const counts: RelationshipCentrality = {}
  for (const row of rows ?? []) {
    if (!row) continue
    const endpoints = [row.sourceGlobalId, row.targetGlobalId]
    for (const gid of endpoints) {
      if (typeof gid === 'string' && gid.length > 0) {
        counts[gid] = (counts[gid] ?? 0) + 1
      }
    }
  }
  return counts
}

/**
 * Return ONLY the matrix rows whose two endpoints are exactly `gidA` and
 * `gidB` (unordered: either direction matches). This is a LOOKUP over EXISTING
 * edges — it never invents an edge, never implies a relationship, and never
 * changes relationship semantics. When either gid is empty/missing, or the two
 * gids are equal, returns [] (a node never forms an edge with itself here).
 * Preserves the original row order; returns a new array (no mutation).
 */
export function filterEdgesBetweenPair(
  gidA: string,
  gidB: string,
  rows: RelationshipMatrixRow[],
): RelationshipMatrixRow[] {
  if (typeof gidA !== 'string' || typeof gidB !== 'string') return []
  if (gidA.length === 0 || gidB.length === 0) return []
  if (gidA === gidB) return []
  const out: RelationshipMatrixRow[] = []
  for (const row of rows ?? []) {
    if (!row) continue
    const s = row.sourceGlobalId
    const t = row.targetGlobalId
    if ((s === gidA && t === gidB) || (s === gidB && t === gidA)) {
      out.push(row)
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// M20 (Relationship Connectivity / Path Explorer): pure path finder (additive).
// ---------------------------------------------------------------------------
//
// SCOPE (frozen): still a PURE data-inspection layer. findRelationshipPaths()
// runs a BOUNDED traversal over the EXISTING RelationshipMatrixRow[] edges that
// were already built by buildRelationshipTypeMatrix(). It introduces NO new KG
// semantics, NO invented edges, NO guessed connections, NO causal reasoning,
// NO network/AI. Deterministic: same input -> same output, inputs are never
// mutated, no Date/Math.random. Edges are followed in their literal stored
// direction (sourceGlobalId -> targetGlobalId); the function never reverses or
// fabricates an edge to "complete" a path.

export type RelationshipPath = {
  /** Ordered global_id sequence: nodes.length === edges.length + 1. */
  nodes: string[]
  /** Ordered relationship_type sequence, one per traversed edge. */
  edges: string[]
}

/**
 * Enumerate every SIMPLE path (no repeated node) composed solely of EXISTING
 * relationship edges from `gidA` to `gidB`, bounded by `maxHops` (max edges).
 *
 * - Directed traversal: each row contributes one edge sourceGlobalId ->
 *   targetGlobalId with its literal `relationType`. No edge is reversed or
 *   invented; a connection is never guessed when no edge exists.
 * - Bounded: `maxHops` (default 3) caps path length to prevent graph explosion;
 *   a non-positive / non-integer `maxHops` is clamped to 1.
 * - Returns [] when either gid is empty / missing / non-string, or no
 *   existing-edge path within `maxHops` reaches `gidB`. When `gidA === gidB`,
 *   only non-trivial cycle paths (length >= 1) are returned — e.g. a cycle
 *   A→B→A yields the path [A, B, A].
 * - Pure: builds a fresh adjacency map; the input array and its rows are never
 *   mutated; every returned array is a new object.
 */
export function findRelationshipPaths(
  rows: RelationshipMatrixRow[],
  gidA: string,
  gidB: string,
  maxHops: number = 3,
): RelationshipPath[] {
  if (typeof gidA !== 'string' || typeof gidB !== 'string') return []
  if (gidA.length === 0 || gidB.length === 0) return []

  let hops = maxHops
  if (!Number.isInteger(hops) || hops < 1) hops = 1

  // Build directed adjacency from EXISTING edges only.
  const adj = new Map<string, Array<{ to: string; relationType: string }>>()
  for (const row of rows ?? []) {
    if (!row) continue
    const from = row.sourceGlobalId
    const to = row.targetGlobalId
    const rel = row.relationType
    if (typeof from !== 'string' || from.length === 0) continue
    if (typeof to !== 'string' || to.length === 0) continue
    if (typeof rel !== 'string' || rel.length === 0) continue
    let list = adj.get(from)
    if (!list) {
      list = []
      adj.set(from, list)
    }
    list.push({ to, relationType: rel })
  }

  const results: RelationshipPath[] = []
  const seen = new Set<string>()

  const dfs = (current: string, pathNodes: string[], pathEdges: string[]): void => {
    const edgeCount = pathNodes.length - 1
    if (edgeCount > hops) return
    if (current === gidB && edgeCount >= 1) {
      const sig = pathNodes.join('\u0000') + '\u0000' + pathEdges.join('\u0000')
      if (!seen.has(sig)) {
        seen.add(sig)
        results.push({ nodes: [...pathNodes], edges: [...pathEdges] })
      }
      // A simple path cannot revisit gidB, so no extension from here can end at
      // gidB again; stop descending to keep the traversal bounded and cheap.
      return
    }
    if (edgeCount >= hops) return
    const neighbors = adj.get(current)
    if (!neighbors) return
    for (const { to, relationType } of neighbors) {
      // Simple path: no repeated INTERMEDIATE node. The target gidB is allowed
      // to reappear only as the terminal node — this is exactly what a cycle
      // back to the start (gidA === gidB, e.g. A→B→A) is, and reaching gidB
      // always terminates the branch, so it can never become an intermediate.
      if (pathNodes.includes(to) && to !== gidB) continue
      pathNodes.push(to)
      pathEdges.push(relationType)
      dfs(to, pathNodes, pathEdges)
      pathNodes.pop()
      pathEdges.pop()
    }
  }

  dfs(gidA, [gidA], [])
  return results
}
