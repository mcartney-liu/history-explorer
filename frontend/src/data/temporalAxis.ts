// M8-P1: Deterministic multi-entity temporal axis layout.
//
// SCOPE (frozen, per M8 Design Freeze; inherits M7 Freeze + M3.5-000):
//   PURE geometry for placing N entity date ranges onto ONE shared year axis.
//     - computeAxisBounds(entities): the {min,max} year window covering all data
//     - layoutBars(entities, bounds): each entity's left% / width% + partial flag
//     - detectOverlaps(entities): pairwise overlaps, REUSING compareTemporalRanges
//
// PROHIBITED:
//   - NO React / UI / rendering
//   - NO API / network / IO
//   - NO Date() / random() / async
//   - NO era / civilization / historical-value inference
//   - NO importance / score / confidence / similarity / ranking / AI/LLM
//   - NO new dependencies
//
// Year axis: TimeValue.value, negative = BCE, positive = CE, on a continuous
// integer line (1 BC = 0 boundary) — the same convention as compareTemporal.ts.

import type { TimeValue } from './temporalUtils'
import {
  compareTemporalRanges,
  numericValue,
  type TemporalRange,
} from './compareTemporal'

// Input contract: any object carrying a name plus optional date bounds.
// Structurally compatible with M7's TemporalEntity and the runtime
// `result.entities` payload — no MainEntity type change needed (structural
// typing; the runtime carries start_date / end_date).
export interface TemporalBar {
  name: string
  start_date?: TimeValue
  end_date?: TimeValue
}

export interface AxisBounds {
  min: number
  max: number
}

// Whether a bar has both bounds, only one, or none. Drives rendering + overlap.
export type BarPartial = 'none' | 'start' | 'end' | 'full'

export interface LaidOutBar {
  name: string
  // Percent offset of the bar's left edge within [bounds.min, bounds.max].
  leftPct: number
  // Percent width of the bar. 0 for single-point (partial) or undated bars.
  widthPct: number
  partial: BarPartial
}

// A single overlap FACT between two full-interval entities. No score / rank.
export interface TemporalOverlap {
  a: string
  b: string
  relation: 'overlap'
  years: number
}

// Deterministic fallback window when NO entity carries any usable year.
const FALLBACK_BOUNDS: AxisBounds = { min: 0, max: 100 }

// Compute the smallest year window covering every KNOWN bound. Partially-dated
// entities participate (their single known year still fits on the axis). When
// no usable year exists at all, returns a deterministic fallback. A degenerate
// single-point window is padded by 1 year on each side so downstream width math
// never divides by zero. No missing bound is ever fabricated.
export function computeAxisBounds(
  entities: readonly TemporalBar[] | null | undefined,
): AxisBounds {
  const values: number[] = []
  for (const e of entities ?? []) {
    const s = numericValue(e?.start_date)
    const en = numericValue(e?.end_date)
    if (s !== undefined) values.push(s)
    if (en !== undefined) values.push(en)
  }
  if (values.length === 0) return { ...FALLBACK_BOUNDS }

  let min = values[0]
  let max = values[0]
  for (const v of values) {
    if (v < min) min = v
    if (v > max) max = v
  }
  if (min === max) return { min: min - 1, max: max + 1 }
  return { min, max }
}

// Project each entity onto [bounds.min, bounds.max] as a left% / width% bar.
// Preserves input order (no sorting / ranking). Missing bounds -> partial bar:
//   full : both bounds -> positioned span
//   start: only start  -> single-point marker at start
//   end  : only end    -> single-point marker at end
//   none : no dates    -> zero bar (caller shows "No date data")
export function layoutBars(
  entities: readonly TemporalBar[] | null | undefined,
  bounds: AxisBounds,
): LaidOutBar[] {
  const span = bounds.max - bounds.min
  const safeSpan = span > 0 ? span : 1
  const pct = (year: number) => ((year - bounds.min) / safeSpan) * 100
  const clamp = (n: number) => Math.min(100, Math.max(0, n))

  const out: LaidOutBar[] = []
  for (const e of entities ?? []) {
    const s = numericValue(e?.start_date)
    const en = numericValue(e?.end_date)

    if (s !== undefined && en !== undefined) {
      const left = clamp(pct(s))
      const right = clamp(pct(en))
      out.push({
        name: e.name,
        leftPct: Math.min(left, right),
        widthPct: Math.max(0, right - left),
        partial: 'full',
      })
    } else if (s !== undefined) {
      out.push({ name: e.name, leftPct: clamp(pct(s)), widthPct: 0, partial: 'start' })
    } else if (en !== undefined) {
      out.push({ name: e.name, leftPct: clamp(pct(en)), widthPct: 0, partial: 'end' })
    } else {
      out.push({ name: e.name, leftPct: 0, widthPct: 0, partial: 'none' })
    }
  }
  return out
}

// Pairwise overlap detection over FULL intervals only, in input order (i < j).
// Delegates the interval math to compareTemporalRanges (single source of truth)
// and emits only the mechanical "overlap for N years" fact. No ranking / score.
export function detectOverlaps(
  entities: readonly TemporalBar[] | null | undefined,
): TemporalOverlap[] {
  const list = (entities ?? []).filter(
    (e): e is TemporalBar => !!e && !!e.name,
  )
  const out: TemporalOverlap[] = []
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i]
      const b = list[j]
      // Only full intervals participate (both bounds on both entities).
      const full =
        numericValue(a.start_date) !== undefined &&
        numericValue(a.end_date) !== undefined &&
        numericValue(b.start_date) !== undefined &&
        numericValue(b.end_date) !== undefined
      if (!full) continue

      const rangeA: TemporalRange = { start: a.start_date, end: a.end_date }
      const rangeB: TemporalRange = { start: b.start_date, end: b.end_date }
      const cmp = compareTemporalRanges(rangeA, rangeB)
      if (cmp.relations.includes('overlap') && cmp.overlapYears !== undefined) {
        out.push({
          a: a.name,
          b: b.name,
          relation: 'overlap',
          years: cmp.overlapYears,
        })
      }
    }
  }
  return out
}
