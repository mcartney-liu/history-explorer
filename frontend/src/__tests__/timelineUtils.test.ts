import { describe, it, expect } from 'vitest'
import {
  TIME_BUCKETS,
  UNDATED_BUCKET,
  compareTimelineDate,
  sortTimeline,
  bucketForValue,
  groupTimeline,
  type DatedTimelineItem,
} from '../data/timelineUtils'

const item = (period: string, event: string, value?: number): DatedTimelineItem => ({
  period: period,
  event: event,
  date: value === undefined ? undefined : { value, label: `${value}` },
})

describe('bucketForValue', () => {
  it('maps years to fixed buckets deterministically', () => {
    expect(bucketForValue(-509)).toBe('Before 500 BCE')
    expect(bucketForValue(-500)).toBe('500 BCE – 1 CE')
    expect(bucketForValue(-27)).toBe('500 BCE – 1 CE')
    expect(bucketForValue(0)).toBe('500 BCE – 1 CE')
    expect(bucketForValue(1)).toBe('1 – 500 CE')
    expect(bucketForValue(499)).toBe('1 – 500 CE')
    expect(bucketForValue(500)).toBe('500 – 1000 CE')
    expect(bucketForValue(999)).toBe('500 – 1000 CE')
    expect(bucketForValue(1000)).toBe('1000 – 1500 CE')
    expect(bucketForValue(1499)).toBe('1000 – 1500 CE')
    expect(bucketForValue(1500)).toBe('After 1500 CE')
    expect(bucketForValue(2024)).toBe('After 1500 CE')
  })

  it('returns UNDATED_BUCKET for missing / NaN years', () => {
    expect(bucketForValue(undefined)).toBe(UNDATED_BUCKET)
    expect(bucketForValue(Number.NaN)).toBe(UNDATED_BUCKET)
  })
})

describe('compareTimelineDate', () => {
  it('sorts BCE (negative) before CE (positive)', () => {
    expect(compareTimelineDate(item('a', 'a', -63), item('b', 'b', 14))).toBeLessThan(0)
    expect(compareTimelineDate(item('b', 'b', 14), item('a', 'a', -63))).toBeGreaterThan(0)
  })

  it('orders by year ascending when both dated', () => {
    expect(compareTimelineDate(item('a', 'a', 100), item('b', 'b', 200))).toBeLessThan(0)
    expect(compareTimelineDate(item('a', 'a', 200), item('b', 'b', 100))).toBeGreaterThan(0)
  })

  it('places dated before undated', () => {
    expect(compareTimelineDate(item('a', 'a', 1), item('b', 'b'))).toBeLessThan(0)
    expect(compareTimelineDate(item('a', 'a'), item('b', 'b', 1))).toBeGreaterThan(0)
  })

  it('returns 0 for two undated items (stable)', () => {
    expect(compareTimelineDate(item('a', 'a'), item('b', 'b'))).toBe(0)
  })
})

describe('sortTimeline', () => {
  it('sorts ascending by year with BCE before CE', () => {
    const input = [
      item('e3', 'Event 3', 14),
      item('e1', 'Event 1', -63),
      item('e2', 'Event 2', -27),
    ]
    const out = sortTimeline(input)
    expect(out.map((i) => i.event)).toEqual(['Event 1', 'Event 2', 'Event 3'])
  })

  it('keeps undated items after dated ones and preserves relative order', () => {
    const input = [
      item('u2', 'Undated B'),
      item('d1', 'Dated 1', 100),
      item('u1', 'Undated A'),
    ]
    const out = sortTimeline(input)
    expect(out.map((i) => i.event)).toEqual(['Dated 1', 'Undated B', 'Undated A'])
  })

  it('does not mutate the input array', () => {
    const input = [item('e2', 'B', 14), item('e1', 'A', -63)]
    const snapshot = input.map((i) => i.event)
    sortTimeline(input)
    expect(input.map((i) => i.event)).toEqual(snapshot)
  })

  it('handles items without a date field at all (M2 compatibility)', () => {
    const plain = [{ period: '27 BC', event: 'Roman Empire Established' }]
    const out = sortTimeline(plain)
    expect(out).toHaveLength(1)
    expect(out[0].event).toBe('Roman Empire Established')
  })
})

describe('groupTimeline', () => {
  it('groups sorted items into the correct fixed buckets in order', () => {
    const input = [
      item('a', 'A', -63), // 500 BCE - 1 CE
      item('b', 'B', 800), // 500 - 1000 CE
      item('c', 'C', 1200), // 1000 - 1500 CE
    ]
    const groups = groupTimeline(input)
    expect(groups.map((g) => g.bucket)).toEqual([
      '500 BCE – 1 CE',
      '500 – 1000 CE',
      '1000 – 1500 CE',
    ])
    expect(groups[0].items[0].event).toBe('A')
  })

  it('omits empty buckets', () => {
    const input = [item('a', 'A', 1200)]
    const groups = groupTimeline(input)
    expect(groups).toHaveLength(1)
    expect(groups[0].bucket).toBe('1000 – 1500 CE')
  })

  it('collects undated items under the UNDATED_BUCKET at the end', () => {
    const input = [item('d', 'D', -63), item('u', 'U')]
    const groups = groupTimeline(input)
    expect(groups.map((g) => g.bucket)).toEqual(['500 BCE – 1 CE', UNDATED_BUCKET])
  })

  it('only groups (does not re-sort): order within a bucket matches input', () => {
    // Both items fall in the same bucket (1 - 500 CE) but are given in
    // descending order. groupTimeline must NOT re-sort them.
    const input = [item('z', 'Z', 100), item('a', 'A', 200)]
    const groups = groupTimeline(input)
    expect(groups).toHaveLength(1)
    expect(groups[0].bucket).toBe('1 – 500 CE')
    expect(groups[0].items.map((i) => i.event)).toEqual(['Z', 'A'])
  })

  it('exposes a fixed, non-empty TIME_BUCKETS constant', () => {
    expect(TIME_BUCKETS.length).toBe(6)
    expect(TIME_BUCKETS[0].label).toBe('Before 500 BCE')
    expect(TIME_BUCKETS[5].label).toBe('After 1500 CE')
  })
})
