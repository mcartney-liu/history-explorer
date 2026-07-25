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
