import { describe, it, expect } from 'vitest'
import {
  compareTemporalRanges,
  buildTemporalComparisonText,
} from '../data/compareTemporal'
import type { TemporalRange } from '../data/compareTemporal'

// Rome: 753 BC - 476 CE ; Han: 202 BC - 220 CE (per M7 product example).
const rome: TemporalRange = { start: { value: -753 }, end: { value: 476 } }
const han: TemporalRange = { start: { value: -202 }, end: { value: 220 } }

describe('compareTemporalRanges — Rome vs Han (full intervals)', () => {
  const cmp = compareTemporalRanges(rome, han)

  it('is comparable', () => {
    expect(cmp.comparable).toBe(true)
  })

  it('computes startGap (Rome began 551 years before Han)', () => {
    expect(cmp.startGapYears).toBe(-551)
  })

  it('computes overlap years (202 BC - 220 CE = 422)', () => {
    expect(cmp.overlapYears).toBe(422)
    expect(cmp.relations).toContain('overlap')
  })

  it('classifies Rome contains Han', () => {
    expect(cmp.relations).toContain('contains')
  })

  it('computes durations and difference (Rome 1229, Han 422, diff 807)', () => {
    expect(cmp.durationA).toBe(1229)
    expect(cmp.durationB).toBe(422)
    expect(cmp.durationDiffYears).toBe(807)
  })

  it('produces deterministic template text', () => {
    const txt = buildTemporalComparisonText(cmp, 'Rome', 'Han')
    expect(txt).toContain('Rome and Han overlapped for 422 years.')
    expect(txt).toContain('Rome encompassed the entire span of Han.')
    expect(txt).toContain('Rome began 551 years before Han.')
    expect(txt).toContain('Rome lasted 807 years longer than Han.')
  })
})

describe('relation: before', () => {
  it('a entirely before b', () => {
    const cmp = compareTemporalRanges(
      { start: { value: -500 }, end: { value: -400 } },
      { start: { value: -300 }, end: { value: -200 } },
    )
    expect(cmp.relations).toEqual(['before'])
    expect(cmp.overlapYears).toBeUndefined()
  })
})

describe('relation: after', () => {
  it('a entirely after b', () => {
    const cmp = compareTemporalRanges(
      { start: { value: 300 }, end: { value: 400 } },
      { start: { value: 100 }, end: { value: 200 } },
    )
    expect(cmp.relations).toEqual(['after'])
  })
})

describe('relation: contains', () => {
  it('a spans b fully', () => {
    const cmp = compareTemporalRanges(
      { start: { value: -100 }, end: { value: 500 } },
      { start: { value: 0 }, end: { value: 200 } },
    )
    expect(cmp.relations).toContain('contains')
    expect(cmp.relations).not.toContain('contained_by')
  })
})

describe('relation: contained_by', () => {
  it('a within b', () => {
    const cmp = compareTemporalRanges(
      { start: { value: 0 }, end: { value: 200 } },
      { start: { value: -100 }, end: { value: 500 } },
    )
    expect(cmp.relations).toContain('contained_by')
  })
})

describe('relation: equals', () => {
  it('identical span', () => {
    const cmp = compareTemporalRanges(
      { start: { value: -100 }, end: { value: 200 } },
      { start: { value: -100 }, end: { value: 200 } },
    )
    expect(cmp.relations).toEqual(['equals'])
  })
})

describe('partial intervals — no inference', () => {
  it('missing start: cannot infer overlap/duration', () => {
    const cmp = compareTemporalRanges(
      { start: { value: -753 }, end: { value: 476 } }, // Rome full
      { end: { value: 220 } }, // Han missing start
    )
    expect(cmp.comparable).toBe(true)
    expect(cmp.relations).toEqual([])
    expect(cmp.overlapYears).toBeUndefined()
    expect(cmp.durationB).toBeUndefined()
    expect(cmp.durationDiffYears).toBeUndefined()
    expect(cmp.startGapYears).toBeUndefined()
    expect(cmp.durationA).toBe(1229) // Rome duration still known
  })

  it('missing end: cannot infer overlap/duration', () => {
    const cmp = compareTemporalRanges(
      { start: { value: -753 } }, // Rome missing end
      { start: { value: -202 }, end: { value: 220 } }, // Han full
    )
    expect(cmp.comparable).toBe(true)
    expect(cmp.relations).toEqual([])
    expect(cmp.overlapYears).toBeUndefined()
    expect(cmp.durationA).toBeUndefined()
    expect(cmp.durationB).toBe(422) // Han full interval -> duration known
    expect(cmp.startGapYears).toBe(-551) // both starts present -> gap ok
  })

  it('only starts present: startGap allowed, no overlap/duration', () => {
    const cmp = compareTemporalRanges(
      { start: { value: -753 } },
      { start: { value: -202 } },
    )
    expect(cmp.comparable).toBe(true)
    expect(cmp.startGapYears).toBe(-551)
    expect(cmp.relations).toEqual([])
    expect(cmp.overlapYears).toBeUndefined()
    expect(cmp.durationA).toBeUndefined()
  })
})

describe('empty range', () => {
  it('one empty range -> not comparable', () => {
    const cmp = compareTemporalRanges(
      {},
      { start: { value: -202 }, end: { value: 220 } },
    )
    expect(cmp.comparable).toBe(false)
    expect(cmp.relations).toEqual([])
    expect(cmp.startGapYears).toBeUndefined()
    expect(cmp.overlapYears).toBeUndefined()
    expect(cmp.durationA).toBeUndefined()
    expect(cmp.durationB).toBe(422) // b (Han) full interval -> duration known
    expect(cmp.durationDiffYears).toBeUndefined()
  })

  it('both empty -> not comparable', () => {
    const cmp = compareTemporalRanges({}, {})
    expect(cmp.comparable).toBe(false)
  })
})

describe('determinism & purity', () => {
  it('same input -> identical output', () => {
    const a = compareTemporalRanges(rome, han)
    const b = compareTemporalRanges(rome, han)
    expect(a).toEqual(b)
  })

  it('does not mutate inputs', () => {
    const snap = JSON.parse(JSON.stringify({ a: rome, b: han }))
    compareTemporalRanges(rome, han)
    expect({ a: rome, b: han }).toEqual(snap)
  })
})
