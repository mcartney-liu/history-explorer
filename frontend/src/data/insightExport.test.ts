// M18 (Insight Export) — pure serialization tests.
// Deterministic, no React, no fetch, no browser APIs.

import { describe, it, expect } from 'vitest'
import type { RelationshipMatrixRow, TimelineBandEntry } from './relationshipUtils'
import {
  serializeInsightReport,
  buildPrintableInsight,
  INSIGHT_REPORT_SCHEMA,
  type InsightReportInput,
} from './insightExport'

const matrixRows: RelationshipMatrixRow[] = [
  {
    source: '罗马帝国',
    sourceGlobalId: 'rome:empire',
    relationType: 'conquered',
    target: '高卢',
    targetGlobalId: 'rome:gaul',
  },
  {
    source: '罗马帝国',
    sourceGlobalId: 'rome:empire',
    relationType: 'inherited',
    target: '奥古斯都',
    targetGlobalId: 'rome:augustus',
  },
]

const timelineBand: TimelineBandEntry[] = [
  { name: '秦始皇', gid: 'china:qin', start: -259, end: -210, overlaps: ['周朝'] },
  { name: '未知', gid: 'x:u', start: null, end: null, overlaps: [] },
]

const input: InsightReportInput = {
  mainEntityName: '罗马帝国',
  mainGlobalId: 'rome:empire',
  entities: [
    { name: '罗马帝国', gid: 'rome:empire' },
    { name: '秦始皇', gid: 'china:qin' },
  ],
  relationshipTypeCounts: { inherited: 1, conquered: 1 },
  matrixRows,
  timelineBand,
}

describe('serializeInsightReport', () => {
  it('produces valid JSON with the schema id and a faithful copy of the view data', () => {
    const json = serializeInsightReport(input)
    const parsed = JSON.parse(json)
    expect(parsed.schema).toBe(INSIGHT_REPORT_SCHEMA)
    expect(parsed.mainEntity).toEqual({ name: '罗马帝国', globalId: 'rome:empire' })
    expect(parsed.entities).toHaveLength(2)
    expect(parsed.matrix).toHaveLength(2)
    expect(parsed.matrix[0]).toEqual({
      source: '罗马帝国',
      sourceGlobalId: 'rome:empire',
      relationType: 'conquered',
      target: '高卢',
      targetGlobalId: 'rome:gaul',
    })
    expect(parsed.timelineBand[0]).toEqual({
      name: '秦始皇',
      globalId: 'china:qin',
      start: -259,
      end: -210,
      overlaps: ['周朝'],
    })
  })

  it('is deterministic: same input -> byte-identical output (no timestamps/randomness)', () => {
    expect(serializeInsightReport(input)).toBe(serializeInsightReport(input))
  })

  it('sorts type counts alphabetically for stable serialization', () => {
    const json = serializeInsightReport(input)
    const parsed = JSON.parse(json)
    expect(Object.keys(parsed.relationshipTypeCounts)).toEqual(['conquered', 'inherited'])
  })

  it('keeps null bounds null (no fabricated dates) and never mutates the input', () => {
    const before = JSON.stringify(input.timelineBand)
    const parsed = JSON.parse(serializeInsightReport(input))
    expect(parsed.timelineBand[1].start).toBeNull()
    expect(parsed.timelineBand[1].end).toBeNull()
    expect(JSON.stringify(input.timelineBand)).toBe(before)
  })

  it('handles a missing main entity and empty collections honestly', () => {
    const parsed = JSON.parse(
      serializeInsightReport({
        entities: [],
        relationshipTypeCounts: {},
        matrixRows: [],
        timelineBand: [],
      }),
    )
    expect(parsed.mainEntity).toEqual({ name: null, globalId: null })
    expect(parsed.entities).toEqual([])
    expect(parsed.matrix).toEqual([])
    expect(parsed.timelineBand).toEqual([])
  })
})

describe('buildPrintableInsight', () => {
  it('builds a self-contained HTML document with all three sections', () => {
    const html = buildPrintableInsight(input)
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('关系洞察报告 — 罗马帝国')
    expect(html).toContain('实体清单')
    expect(html).toContain('关系类型汇总')
    expect(html).toContain('关系类型矩阵')
    expect(html).toContain('多实体时间线带')
    expect(html).toContain('高卢')
    expect(html).toContain('259 BC – 210 BC')
  })

  it('contains no script tags and no external resources (print-only, no network)', () => {
    const html = buildPrintableInsight(input)
    expect(html).not.toContain('<script')
    expect(html).not.toContain('http://')
    expect(html).not.toContain('https://')
    expect(html).not.toContain('src=')
  })

  it('escapes HTML in entity-derived values', () => {
    const html = buildPrintableInsight({
      ...input,
      entities: [{ name: '<img onerror=x>', gid: 'a:b' }],
    })
    expect(html).not.toContain('<img onerror')
    expect(html).toContain('&lt;img onerror=x&gt;')
  })

  it('is deterministic and carries the metadata-only disclaimer (no narrative)', () => {
    expect(buildPrintableInsight(input)).toBe(buildPrintableInsight(input))
    const html = buildPrintableInsight(input)
    expect(html).toContain('不包含任何历史解释或自动结论')
    expect(html).not.toContain('推断')
    expect(html).not.toContain('导致')
  })

  it('renders honest empty-state text when there is no data', () => {
    const html = buildPrintableInsight({
      entities: [],
      relationshipTypeCounts: {},
      matrixRows: [],
      timelineBand: [],
    })
    expect(html).toContain('关系洞察报告')
    expect(html).toContain('无实体')
    expect(html).toContain('无既有关系元数据')
    expect(html).toContain('无时间线数据')
  })
})
