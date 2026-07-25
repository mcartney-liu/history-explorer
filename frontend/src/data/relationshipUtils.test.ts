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
