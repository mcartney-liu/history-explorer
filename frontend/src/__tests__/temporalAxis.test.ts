import { describe, it, expect } from 'vitest'
import {
  computeAxisBounds,
  layoutBars,
  detectOverlaps,
  type TemporalBar,
} from '../data/temporalAxis'

// Real-world-shaped fixtures (BCE = negative, CE = positive).
const rome: TemporalBar = {
  name: 'Rome',
  start_date: { value: -753 },
  end_date: { value: 476 },
}
const han: TemporalBar = {
  name: 'Han Dynasty',
  start_date: { value: -202 },
  end_date: { value: 220 },
}
const egypt: TemporalBar = {
  name: 'Ancient Egypt',
  start_date: { value: -3100 },
  end_date: { value: -30 },
}

describe('computeAxisBounds', () => {
  it('covers the min start and max end across entities', () => {
    expect(computeAxisBounds([rome, han])).toEqual({ min: -753, max: 476 })
  })

  it('lets partially-dated entities participate in the bounds', () => {
    const b = computeAxisBounds([
      { name: 'OnlyStart', start_date: { value: -900 } },
      { name: 'OnlyEnd', end_date: { value: 800 } },
    ])
    expect(b).toEqual({ min: -900, max: 800 })
  })

  it('returns a single entity own span', () => {
    expect(computeAxisBounds([rome])).toEqual({ min: -753, max: 476 })
  })

  it('pads a degenerate single-point window by one year each side', () => {
    expect(
      computeAxisBounds([{ name: 'Point', start_date: { value: 100 } }]),
    ).toEqual({ min: 99, max: 101 })
  })

  it('returns a deterministic fallback when no dates exist', () => {
    expect(computeAxisBounds([{ name: 'X' }, { name: 'Y' }])).toEqual({
      min: 0,
      max: 100,
    })
  })

  it('handles empty and nullish input', () => {
    expect(computeAxisBounds([])).toEqual({ min: 0, max: 100 })
    expect(computeAxisBounds(null)).toEqual({ min: 0, max: 100 })
    expect(computeAxisBounds(undefined)).toEqual({ min: 0, max: 100 })
  })
})

describe('layoutBars', () => {
  const bounds = { min: -3100, max: 476 } // span 3576

  it('positions a full interval by left% / width%', () => {
    const [bar] = layoutBars([rome], bounds)
    expect(bar.partial).toBe('full')
    expect(bar.leftPct).toBeCloseTo(((-753 - -3100) / 3576) * 100, 6)
    expect(bar.widthPct).toBeCloseTo(((476 - -753) / 3576) * 100, 6)
  })

  it('marks a missing-end entity as partial=start with zero width', () => {
    const [bar] = layoutBars(
      [{ name: 'S', start_date: { value: -500 } }],
      bounds,
    )
    expect(bar.partial).toBe('start')
    expect(bar.widthPct).toBe(0)
  })

  it('marks a missing-start entity as partial=end with zero width', () => {
    const [bar] = layoutBars([{ name: 'E', end_date: { value: 100 } }], bounds)
    expect(bar.partial).toBe('end')
    expect(bar.widthPct).toBe(0)
  })

  it('marks an undated entity as partial=none', () => {
    const [bar] = layoutBars([{ name: 'N' }], bounds)
    expect(bar).toEqual({ name: 'N', leftPct: 0, widthPct: 0, partial: 'none' })
  })

  it('preserves input order (no sorting / ranking)', () => {
    const bars = layoutBars([rome, han, egypt], bounds)
    expect(bars.map((b) => b.name)).toEqual([
      'Rome',
      'Han Dynasty',
      'Ancient Egypt',
    ])
  })
})

describe('detectOverlaps', () => {
  it('reports the Rome / Han overlap of 422 years', () => {
    expect(detectOverlaps([rome, han])).toEqual([
      { a: 'Rome', b: 'Han Dynasty', relation: 'overlap', years: 422 },
    ])
  })

  it('reports the Egypt / Rome overlap of 723 years (real interval math)', () => {
    expect(detectOverlaps([egypt, rome])).toEqual([
      { a: 'Ancient Egypt', b: 'Rome', relation: 'overlap', years: 723 },
    ])
  })

  it('reports no overlap for fully separated intervals', () => {
    const early: TemporalBar = {
      name: 'Early',
      start_date: { value: -1000 },
      end_date: { value: -600 },
    }
    const late: TemporalBar = {
      name: 'Late',
      start_date: { value: 100 },
      end_date: { value: 400 },
    }
    expect(detectOverlaps([early, late])).toEqual([])
  })

  it('skips partial intervals (no historical inference)', () => {
    expect(
      detectOverlaps([{ name: 'P', start_date: { value: -300 } }, han]),
    ).toEqual([])
  })

  it('never emits importance / score / ranking fields', () => {
    for (const o of detectOverlaps([rome, han, egypt])) {
      expect(Object.keys(o).sort()).toEqual(['a', 'b', 'relation', 'years'])
    }
  })
})

describe('purity / determinism', () => {
  it('returns deepEqual output for the same input', () => {
    const input = [rome, han, egypt]
    expect(computeAxisBounds(input)).toEqual(computeAxisBounds(input))
    const b = computeAxisBounds(input)
    expect(layoutBars(input, b)).toEqual(layoutBars(input, b))
    expect(detectOverlaps(input)).toEqual(detectOverlaps(input))
  })

  it('does not mutate its input', () => {
    const input: TemporalBar[] = [{ ...rome }, { ...han }]
    const snapshot = JSON.parse(JSON.stringify(input))
    computeAxisBounds(input)
    layoutBars(input, { min: -753, max: 476 })
    detectOverlaps(input)
    expect(input).toEqual(snapshot)
  })
})
