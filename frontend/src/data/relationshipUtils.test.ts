// M16 (Relationship Insight Visualization Layer) — pure function tests.
// Mirrors the style of pickerUtils.test.ts: deterministic, no React, no fetch.

import { describe, it, expect } from 'vitest'
import type { Candidate } from './candidateUtils'
import type { EntityRelationship } from '../components/EntityPage'
import {
  pairEntities,
  findExistingRelationships,
  timelineOverlap,
  geoComparison,
  aggregateRelationshipTypes,
  buildRelationshipTypeMatrix,
  buildMultiEntityTimelineBand,
  RELATIONSHIP_TYPES,
  RELATIONSHIP_FILTER_ALL,
  normalizeRelationshipFilter,
  filterRelationshipMatrixByType,
  sortRelationshipMatrixByCount,
  sortTimelineBands,
  normalizeTimelineRange,
  calculateRelationshipCentrality,
  filterEdgesBetweenPair,
  type RelationshipMatrixRow,
  type TimelineBandEntry,
} from './relationshipUtils'

const qin: Candidate = { gid: 'china:qin', name: '秦始皇', type: 'Person', topic: 'china' }
const alex: Candidate = { gid: 'greece:alex', name: '亚历山大', type: 'Person', topic: 'greece' }
const rome: Candidate = { gid: 'rome:empire', name: '罗马帝国', type: 'Empire', topic: 'rome' }
const augustus: Candidate = { gid: 'rome:augustus', name: '奥古斯都', type: 'Person', topic: 'rome' }

describe('pairEntities', () => {
  it('returns [] for fewer than 2 distinct candidates', () => {
    expect(pairEntities([])).toEqual([])
    expect(pairEntities([qin])).toEqual([])
  })

  it('returns the single pair for exactly 2 candidates, ordered by gid', () => {
    const pairs = pairEntities([alex, qin]) // reverse order on purpose
    expect(pairs).toHaveLength(1)
    // 'china:qin' < 'greece:alex' lexicographically
    expect(pairs[0][0].gid).toBe('china:qin')
    expect(pairs[0][1].gid).toBe('greece:alex')
  })

  it('returns all 3 unordered pairs for 3 candidates', () => {
    const pairs = pairEntities([qin, alex, rome])
    expect(pairs).toHaveLength(3)
    const keys = pairs.map(([a, b]) => `${a.gid}|${b.gid}`).sort()
    expect(keys).toEqual([
      'china:qin|greece:alex',
      'china:qin|rome:empire',
      'greece:alex|rome:empire',
    ])
  })

  it('de-duplicates candidates by gid and never self-pairs', () => {
    const pairs = pairEntities([qin, qin, alex])
    expect(pairs).toHaveLength(1)
    expect(pairs[0][0].gid).toBe('china:qin')
    expect(pairs[0][1].gid).toBe('greece:alex')
  })

  it('ignores malformed entries without a gid', () => {
    const bad = { name: '无标识' } as unknown as Candidate
    expect(pairEntities([bad, qin])).toEqual([])
  })
})

describe('findExistingRelationships', () => {
  // All relationships share source = main entity (罗马帝国).
  const mainGid = 'rome:empire'
  const relationships: EntityRelationship[] = [
    {
      type: 'conquered_by',
      source: 'empire',
      target: 'augustus',
      direction: 'outgoing',
      other: { id: 'augustus', name: '奥古斯都', type: 'Person', global_id: 'rome:augustus', topic: 'rome' },
    },
    {
      type: 'contemporary_of',
      source: 'empire',
      target: 'alex',
      direction: 'outgoing',
      other: { id: 'alex', name: '亚历山大', type: 'Person', global_id: 'greece:alex', topic: 'greece' },
    },
  ]

  it('returns [] when mainGlobalId is absent (source endpoint unconfirmed)', () => {
    const pairs = pairEntities([rome, alex])
    expect(findExistingRelationships(pairs[0], relationships)).toEqual([])
  })

  it('finds the relationship connecting main entity to a matched candidate', () => {
    const pairs = pairEntities([rome, alex])
    const found = findExistingRelationships(pairs[0], relationships, mainGid)
    expect(found).toHaveLength(1)
    expect(found[0].other.global_id).toBe('greece:alex')
    expect(found[0].type).toBe('contemporary_of')
  })

  it('returns [] for a pair with no existing edge (two related entities, neither is main)', () => {
    const pairs = pairEntities([alex, augustus])
    const found = findExistingRelationships(pairs[0], relationships, mainGid)
    expect(found).toEqual([])
  })

  it('returns [] for a candidate not present in any relationship', () => {
    const pairs = pairEntities([rome, qin]) // 秦始皇 is not in relationships
    const found = findExistingRelationships(pairs[0], relationships, mainGid)
    expect(found).toEqual([])
  })
})

describe('timelineOverlap', () => {
  const timeMap: Record<string, string> = {
    秦始皇: '259 BC - 210 BC',
    亚历山大: '356 BC - 323 BC',
    罗马帝国: '27 BC - 476 CE',
    周朝: '1046 BC - 256 BC',
  }

  it('reports a gap between non-overlapping BCE ranges', () => {
    const pairs = pairEntities([qin, alex]) // -259..-210 vs -356..-323
    const r = timelineOverlap(pairs[0], timeMap)
    expect(r.available).toBe(true)
    expect(r.status).toBe('gap')
    expect(r.note).toContain('No overlap')
  })

  it('reports overlap between overlapping ranges', () => {
    const pairs = pairEntities([qin, { gid: 'c:zhou', name: '周朝' } as Candidate])
    const r = timelineOverlap(pairs[0], timeMap)
    expect(r.available).toBe(true)
    expect(r.status).toBe('overlap')
    expect(r.overlapStart).toBe(-259)
    expect(r.overlapEnd).toBe(-256)
  })

  it('reports partial when only one entity has timeline data', () => {
    const pairs = pairEntities([qin, { gid: 'x:unknown', name: '未知实体' } as Candidate])
    const r = timelineOverlap(pairs[0], timeMap)
    expect(r.available).toBe(true)
    expect(r.status).toBe('partial')
  })

  it('reports unknown when no timeline data exists for either entity', () => {
    const pairs = pairEntities([
      { gid: 'x:a', name: '甲' } as Candidate,
      { gid: 'x:b', name: '乙' } as Candidate,
    ])
    const r = timelineOverlap(pairs[0], {})
    expect(r.available).toBe(false)
    expect(r.status).toBe('unknown')
  })

  it('parses a single-token range as a point without throwing', () => {
    const pairs = pairEntities([{ gid: 'x:p', name: '起点' } as Candidate, qin])
    const r = timelineOverlap(pairs[0], { 起点: '221 BC' })
    expect(r.available).toBe(true)
    expect(r.status).toBe('partial')
  })
})

describe('geoComparison', () => {
  it('reports unavailable when no geo map is supplied (backend has none)', () => {
    const pairs = pairEntities([qin, rome])
    const r = geoComparison(pairs[0])
    expect(r.available).toBe(false)
    expect(r.note).toContain('No geographic data')
  })

  it('reports a great-circle distance when both points are present', () => {
    const pairs = pairEntities([qin, rome])
    const geoMap: Record<string, { lat: number; lon: number }> = {
      秦始皇: { lat: 34.34, lon: 108.94 },
      罗马帝国: { lat: 41.9, lon: 12.5 },
    }
    const r = geoComparison(pairs[0], geoMap)
    expect(r.available).toBe(true)
    expect(r.a).toEqual({ lat: 34.34, lon: 108.94 })
    expect(r.b).toEqual({ lat: 41.9, lon: 12.5 })
    expect(typeof r.distanceKm).toBe('number')
    expect(r.distanceKm!).toBeGreaterThan(1000)
  })

  it('reports unavailable when only one entity has geo data', () => {
    const pairs = pairEntities([qin, rome])
    const geoMap: Record<string, { lat: number; lon: number }> = {
      秦始皇: { lat: 34.34, lon: 108.94 },
    }
    const r = geoComparison(pairs[0], geoMap)
    expect(r.available).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// M17 (Relationship Insight Enhancement) — aggregated type analytics.
// ---------------------------------------------------------------------------

const zhou: Candidate = { gid: 'china:zhou', name: '周朝', type: 'Time Period', topic: 'china' }

function rel(
  type: string,
  other: { id: string; name: string; global_id: string; topic?: string },
): EntityRelationship {
  return {
    type,
    source: 'empire',
    target: other.id,
    direction: 'outgoing',
    other: { id: other.id, name: other.name, type: 'Person', global_id: other.global_id, topic: other.topic ?? 'rome' },
  }
}

describe('aggregateRelationshipTypes', () => {
  it('counts multiple relationship types and returns a tally', () => {
    const relationships: EntityRelationship[] = [
      rel('conquered', { id: 'alex', name: '亚历山大', global_id: 'greece:alex' }),
      rel('inherited', { id: 'augustus', name: '奥古斯都', global_id: 'rome:augustus' }),
      rel('part_of', { id: 'rome', name: '罗马帝国', global_id: 'rome:empire' }),
      rel('conquered', { id: 'persia', name: '波斯', global_id: 'persia:empire' }),
    ]
    const counts = aggregateRelationshipTypes(relationships)
    expect(counts).toEqual({ conquered: 2, inherited: 1, part_of: 1 })
  })

  it('buckets types outside the frozen 18-type vocabulary as "unknown"', () => {
    const relationships: EntityRelationship[] = [
      rel('conquered_by', { id: 'alex', name: '亚历山大', global_id: 'greece:alex' }),
      rel('conquered', { id: 'persia', name: '波斯', global_id: 'persia:empire' }),
    ]
    const counts = aggregateRelationshipTypes(relationships)
    expect(counts).toEqual({ conquered: 1, unknown: 1 })
  })

  it('returns {} for empty input', () => {
    expect(aggregateRelationshipTypes([])).toEqual({})
    expect(aggregateRelationshipTypes(undefined as unknown as EntityRelationship[])).toEqual({})
  })

  it('does not mutate the input array', () => {
    const relationships: EntityRelationship[] = [rel('ruled', { id: 'aug', name: '奥', global_id: 'rome:aug' })]
    const snapshot = JSON.parse(JSON.stringify(relationships))
    aggregateRelationshipTypes(relationships)
    expect(relationships).toEqual(snapshot)
  })

  it('mirrors the backend 18-type vocabulary', () => {
    expect(RELATIONSHIP_TYPES.size).toBe(18)
    expect(RELATIONSHIP_TYPES.has('contemporary_with')).toBe(true)
    expect(RELATIONSHIP_TYPES.has('conquered')).toBe(true)
  })
})

describe('buildRelationshipTypeMatrix', () => {
  const relationships: EntityRelationship[] = [
    rel('conquered', { id: 'alex', name: '亚历山大', global_id: 'greece:alex', topic: 'greece' }),
    rel('inherited', { id: 'augustus', name: '奥古斯都', global_id: 'rome:augustus' }),
  ]

  it('produces one source→type→target row per relationship', () => {
    const rows: RelationshipMatrixRow[] = buildRelationshipTypeMatrix(relationships, {
      mainGlobalId: 'rome:empire',
      sourceName: '罗马帝国',
    })
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({
      source: '罗马帝国',
      relationType: 'conquered',
      target: '亚历山大',
    })
    expect(rows[1]).toMatchObject({
      source: '罗马帝国',
      relationType: 'inherited',
      target: '奥古斯都',
    })
  })

  it('falls back to the global id as source name when no friendly name is provided', () => {
    const rows = buildRelationshipTypeMatrix(relationships, { mainGlobalId: 'rome:empire' })
    expect(rows[0].source).toBe('rome:empire')
  })

  it('never invents a target — only uses existing metadata', () => {
    const rows = buildRelationshipTypeMatrix(relationships, { mainGlobalId: 'rome:empire', sourceName: '罗马帝国' })
    for (const r of rows) {
      expect(r.target).toBeTruthy()
      expect(r.targetGlobalId).toBeTruthy()
    }
  })
})

describe('buildMultiEntityTimelineBand', () => {
  const timeMap: Record<string, string> = {
    秦始皇: '259 BC - 210 BC',
    亚历山大: '356 BC - 323 BC',
    罗马帝国: '27 BC - 476 CE',
    周朝: '1046 BC - 256 BC',
  }

  it('reports an overlap between two BCE entities whose ranges intersect', () => {
    const band: TimelineBandEntry[] = buildMultiEntityTimelineBand([qin, zhou], timeMap)
    expect(band).toHaveLength(2)
    const qinEntry = band.find((e) => e.name === '秦始皇')!
    const zhouEntry = band.find((e) => e.name === '周朝')!
    expect(qinEntry.overlaps).toContain('周朝')
    expect(zhouEntry.overlaps).toContain('秦始皇')
  })

  it('builds a band of three entities with correct bounds and no false overlaps', () => {
    const band = buildMultiEntityTimelineBand([qin, alex, rome], timeMap)
    expect(band).toHaveLength(3)
    const qinEntry = band.find((e) => e.name === '秦始皇')!
    expect(qinEntry.start).toBe(-259)
    expect(qinEntry.end).toBe(-210)
    const romeEntry = band.find((e) => e.name === '罗马帝国')!
    expect(romeEntry.start).toBe(-27)
    expect(romeEntry.end).toBe(476)
    // All three are mutually non-overlapping in this dataset.
    for (const e of band) expect(e.overlaps).toEqual([])
  })

  it('parses the BC→CE boundary correctly (no year zero leakage)', () => {
    const band = buildMultiEntityTimelineBand(
      [{ gid: 'x:p', name: '跨年' } as Candidate],
      { 跨年: '1 BC - 1 CE' },
    )
    expect(band[0].start).toBe(-1)
    expect(band[0].end).toBe(1)
  })

  it('keeps entities without time data with null bounds and empty overlaps (no fabrication)', () => {
    const band = buildMultiEntityTimelineBand([qin, { gid: 'x:u', name: '未知' } as Candidate], timeMap)
    const unknown = band.find((e) => e.name === '未知')!
    expect(unknown.start).toBeNull()
    expect(unknown.end).toBeNull()
    expect(unknown.overlaps).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// M18 — interactive control helpers (pure filter / sort / normalize).
// ---------------------------------------------------------------------------

const mkRow = (relationType: string, target: string): RelationshipMatrixRow => ({
  source: '罗马帝国',
  sourceGlobalId: 'rome:empire',
  relationType,
  target,
  targetGlobalId: `x:${target}`,
})

describe('normalizeRelationshipFilter', () => {
  it('maps empty / null / undefined / "all" (any casing) to the ALL sentinel', () => {
    expect(normalizeRelationshipFilter()).toBe(RELATIONSHIP_FILTER_ALL)
    expect(normalizeRelationshipFilter(null)).toBe(RELATIONSHIP_FILTER_ALL)
    expect(normalizeRelationshipFilter('')).toBe(RELATIONSHIP_FILTER_ALL)
    expect(normalizeRelationshipFilter('  ALL ')).toBe(RELATIONSHIP_FILTER_ALL)
  })

  it('passes through canonical vocabulary values (trimmed, lowercased)', () => {
    expect(normalizeRelationshipFilter('conquered')).toBe('conquered')
    expect(normalizeRelationshipFilter('  Influenced ')).toBe('influenced')
    for (const t of RELATIONSHIP_TYPES) {
      expect(normalizeRelationshipFilter(t)).toBe(t)
    }
  })

  it('buckets out-of-vocabulary values as unknown (consistent with aggregation)', () => {
    expect(normalizeRelationshipFilter('conquered_by')).toBe('unknown')
    expect(normalizeRelationshipFilter('unknown')).toBe('unknown')
    expect(normalizeRelationshipFilter('nonsense')).toBe('unknown')
  })
})

describe('filterRelationshipMatrixByType', () => {
  const rows: RelationshipMatrixRow[] = [
    mkRow('conquered', '高卢'),
    mkRow('ruled', '奥古斯都'),
    mkRow('conquered_by', '西哥特'),
    mkRow('conquered', '埃及'),
  ]

  it('"all" returns a shallow copy of every row in original order', () => {
    const out = filterRelationshipMatrixByType(rows, RELATIONSHIP_FILTER_ALL)
    expect(out).toEqual(rows)
    expect(out).not.toBe(rows) // copy, not the same array
  })

  it('filters by a canonical type', () => {
    const out = filterRelationshipMatrixByType(rows, 'conquered')
    expect(out.map((r) => r.target)).toEqual(['高卢', '埃及'])
  })

  it('"unknown" matches only out-of-vocabulary rows', () => {
    const out = filterRelationshipMatrixByType(rows, 'unknown')
    expect(out.map((r) => r.relationType)).toEqual(['conquered_by'])
  })

  it('does not mutate the input array', () => {
    const before = rows.map((r) => ({ ...r }))
    filterRelationshipMatrixByType(rows, 'conquered')
    expect(rows).toEqual(before)
  })
})

describe('sortRelationshipMatrixByCount', () => {
  const rows: RelationshipMatrixRow[] = [
    mkRow('ruled', '奥古斯都'),
    mkRow('conquered', '高卢'),
    mkRow('conquered_by', '西哥特'),
    mkRow('conquered', '埃及'),
  ]
  const counts = { conquered: 2, ruled: 1, unknown: 1 }

  it('sorts descending by bucket count by default (stable within ties)', () => {
    const out = sortRelationshipMatrixByCount(rows, counts)
    expect(out.map((r) => r.target)).toEqual(['高卢', '埃及', '奥古斯都', '西哥特'])
  })

  it('sorts ascending when requested, keeping original order within ties', () => {
    const out = sortRelationshipMatrixByCount(rows, counts, 'asc')
    // ruled(1) and conquered_by->unknown(1) tie: original order 奥古斯都 then 西哥特.
    expect(out.map((r) => r.target)).toEqual(['奥古斯都', '西哥特', '高卢', '埃及'])
  })

  it('reads the unknown bucket for out-of-vocabulary types and treats missing counts as 0', () => {
    const out = sortRelationshipMatrixByCount(rows, { conquered: 2 }, 'desc')
    expect(out[0].relationType).toBe('conquered')
    // rows with no count data (0) keep original relative order at the end.
    expect(out.slice(2).map((r) => r.target)).toEqual(['奥古斯都', '西哥特'])
  })

  it('does not mutate the input', () => {
    const before = rows.map((r) => ({ ...r }))
    sortRelationshipMatrixByCount(rows, counts, 'asc')
    expect(rows).toEqual(before)
  })
})

describe('sortTimelineBands', () => {
  const bands: TimelineBandEntry[] = [
    { name: '罗马帝国', gid: 'rome:empire', start: -27, end: 476, overlaps: [] },
    { name: '秦始皇', gid: 'china:qin', start: -259, end: -210, overlaps: [] },
    { name: '未知', gid: 'x:u', start: null, end: null, overlaps: [] },
    { name: '亚历山大', gid: 'greece:alex', start: -356, end: -323, overlaps: [] },
  ]

  it('sorts by start ascending by default, null bounds always last', () => {
    const out = sortTimelineBands(bands)
    expect(out.map((b) => b.name)).toEqual(['亚历山大', '秦始皇', '罗马帝国', '未知'])
  })

  it('sorts by start descending, null bounds still last', () => {
    const out = sortTimelineBands(bands, { by: 'start', dir: 'desc' })
    expect(out.map((b) => b.name)).toEqual(['罗马帝国', '秦始皇', '亚历山大', '未知'])
  })

  it('sorts by name using deterministic code-point comparison', () => {
    const out = sortTimelineBands(bands, { by: 'name', dir: 'asc' })
    const expected = [...bands.map((b) => b.name)].sort()
    expect(out.map((b) => b.name)).toEqual(expected)
  })

  it('does not mutate the input array', () => {
    const namesBefore = bands.map((b) => b.name)
    sortTimelineBands(bands, { by: 'start', dir: 'desc' })
    expect(bands.map((b) => b.name)).toEqual(namesBefore)
  })
})

describe('normalizeTimelineRange', () => {
  it('passes well-formed bounds through unchanged', () => {
    const band: TimelineBandEntry = { name: 'a', start: -259, end: -210, overlaps: [] }
    expect(normalizeTimelineRange(band)).toEqual({ start: -259, end: -210 })
  })

  it('swaps reversed bounds without widening the range', () => {
    const band: TimelineBandEntry = { name: 'b', start: 476, end: -27, overlaps: [] }
    expect(normalizeTimelineRange(band)).toEqual({ start: -27, end: 476 })
  })

  it('keeps null bounds null (no fabrication) and never mutates the band', () => {
    const band: TimelineBandEntry = { name: 'c', start: null, end: 100, overlaps: [] }
    expect(normalizeTimelineRange(band)).toEqual({ start: null, end: 100 })
    expect(band.start).toBeNull()
    expect(band.end).toBe(100)
  })
})

// ---------------------------------------------------------------------------
// M19 (Relationship Centrality / Pair Explorer) — pure function tests.
// Deterministic, no React, no fetch. These helpers only read an existing
// RelationshipMatrixRow[]; they never invent edges or attach meaning.
// ---------------------------------------------------------------------------

const m19Rows: RelationshipMatrixRow[] = [
  {
    source: '罗马帝国',
    sourceGlobalId: 'rome:empire',
    relationType: 'contemporary_of',
    target: '亚历山大',
    targetGlobalId: 'greece:alex',
  },
  {
    source: '罗马帝国',
    sourceGlobalId: 'rome:empire',
    relationType: 'conquered_by',
    target: '奥古斯都',
    targetGlobalId: 'rome:augustus',
  },
  {
    source: '罗马帝国',
    sourceGlobalId: 'rome:empire',
    relationType: 'related_to',
    target: '秦始皇',
    targetGlobalId: 'china:qin',
  },
]

describe('calculateRelationshipCentrality (M19)', () => {
  it('counts each endpoint as one incident edge (undirected degree)', () => {
    const c = calculateRelationshipCentrality(m19Rows)
    expect(c['rome:empire']).toBe(3)
    expect(c['greece:alex']).toBe(1)
    expect(c['rome:augustus']).toBe(1)
    expect(c['china:qin']).toBe(1)
  })

  it('skips a row endpoint with a missing global_id (never fabricated)', () => {
    const partial: RelationshipMatrixRow[] = [
      {
        source: '罗马帝国',
        sourceGlobalId: 'rome:empire',
        relationType: 'related_to',
        target: '秦始皇',
        targetGlobalId: 'china:qin',
      },
      {
        source: '罗马帝国',
        sourceGlobalId: undefined,
        relationType: 'related_to',
        target: '亚历山大',
        targetGlobalId: 'greece:alex',
      },
      {
        source: '罗马帝国',
        sourceGlobalId: 'rome:empire',
        relationType: 'related_to',
        target: '秦始皇',
        targetGlobalId: '',
      },
    ]
    const c = calculateRelationshipCentrality(partial)
    // Present endpoints still count (rome:empire appears in 2 rows, china:qin
    // and greece:alex in 1 each).
    expect(c['rome:empire']).toBe(2)
    expect(c['china:qin']).toBe(1)
    expect(c['greece:alex']).toBe(1)
    // A missing endpoint is never turned into a bogus '' key.
    expect(c['']).toBeUndefined()
  })

  it('returns {} for empty or undefined input', () => {
    expect(calculateRelationshipCentrality([])).toEqual({})
    expect(calculateRelationshipCentrality(undefined as unknown as RelationshipMatrixRow[])).toEqual({})
  })

  it('does not mutate the input array', () => {
    const snapshot = JSON.stringify(m19Rows)
    calculateRelationshipCentrality(m19Rows)
    expect(JSON.stringify(m19Rows)).toBe(snapshot)
  })
})

describe('filterEdgesBetweenPair (M19)', () => {
  const rows: RelationshipMatrixRow[] = [
    {
      source: '罗马帝国',
      sourceGlobalId: 'rome:empire',
      relationType: 'contemporary_of',
      target: '亚历山大',
      targetGlobalId: 'greece:alex',
    },
    {
      source: '罗马帝国',
      sourceGlobalId: 'rome:empire',
      relationType: 'contemporary_of',
      target: '奥古斯都',
      targetGlobalId: 'rome:augustus',
    },
  ]

  it('returns only the rows whose two endpoints are exactly A and B (either direction)', () => {
    const fwd = filterEdgesBetweenPair('rome:empire', 'greece:alex', rows)
    expect(fwd).toHaveLength(1)
    expect(fwd[0].targetGlobalId).toBe('greece:alex')
    const rev = filterEdgesBetweenPair('greece:alex', 'rome:empire', rows)
    expect(rev).toHaveLength(1)
    expect(rev[0].targetGlobalId).toBe('greece:alex')
  })

  it('returns [] when no edge connects the pair', () => {
    expect(filterEdgesBetweenPair('rome:augustus', 'greece:alex', rows)).toHaveLength(0)
  })

  it('returns [] for empty, equal, or missing gids', () => {
    expect(filterEdgesBetweenPair('rome:empire', 'rome:empire', rows)).toHaveLength(0)
    expect(filterEdgesBetweenPair('', 'greece:alex', rows)).toHaveLength(0)
    expect(filterEdgesBetweenPair('rome:empire', '', rows)).toHaveLength(0)
  })

  it('returns [] for empty or undefined rows and never invents edges', () => {
    expect(filterEdgesBetweenPair('rome:empire', 'greece:alex', [])).toHaveLength(0)
    expect(
      filterEdgesBetweenPair('rome:empire', 'greece:alex', undefined as unknown as RelationshipMatrixRow[]),
    ).toHaveLength(0)
  })
})
