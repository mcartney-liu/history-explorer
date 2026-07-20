// M7-P1: Deterministic Temporal Range Comparison Engine.
//
// SCOPE (frozen): PURE interval arithmetic over two entities' date ranges.
//   - compareTemporalRanges(a, b): classify the temporal relationship
//   - buildTemporalComparisonText(cmp, aName, bName): deterministic template sentences
//
// PROHIBITED (per M7 Freeze + M3.5-000):
//   - NO React / UI / rendering
//   - NO API / network / IO
//   - NO Date() / random() / async
//   - NO era / civilization / historical-value inference
//   - NO importance / score / confidence / similarity / ranking / AI/LLM
//   - NO generated historical interpretation (only mechanical interval facts)
//   - NO new dependencies
//
// Year axis: TimeValue.value, negative = BCE, positive = CE. The axis is a
// continuous integer line (1 BC = 0 boundary); historical year-0 absence is a
// known, documented simplification in favor of determinism.

import type { TimeValue } from './temporalUtils'

// A temporal span derived from an entity's summary.start_date / end_date.
// Both bounds optional so partially-dated entities stay representable.
export interface TemporalRange {
  start?: TimeValue
  end?: TimeValue
}

// The only relationship kinds this engine may emit. Deliberately excludes any
// qualitative judgement (importance / influence / cause).
export type TemporalRelation =
  | 'before'
  | 'after'
  | 'overlap'
  | 'contains'
  | 'contained_by'
  | 'equals'

export interface TemporalComparison {
  // false when either range is completely empty (no usable bound at all).
  comparable: boolean
  relations: TemporalRelation[]
  // a.start - b.start (negative => a began earlier). Defined when both starts known.
  startGapYears?: number
  // length of the intersecting interval, when both ranges are fully bounded and overlap.
  overlapYears?: number
  durationA?: number
  durationB?: number
  // durationA - durationB (positive => a lasted longer). Defined when both fully bounded.
  durationDiffYears?: number
}

// Extract a finite numeric value from a TimeValue, or undefined when absent/NaN.
// M8-P1: exported (additive) so temporalAxis.ts can reuse the exact same
// bound-extraction rule. Behavior is unchanged for existing callers.
export function numericValue(tv?: TimeValue): number | undefined {
  if (tv && typeof tv.value === 'number' && !Number.isNaN(tv.value)) return tv.value
  return undefined
}

export function compareTemporalRanges(
  a: TemporalRange,
  b: TemporalRange,
): TemporalComparison {
  const aS = numericValue(a.start)
  const aE = numericValue(a.end)
  const bS = numericValue(b.start)
  const bE = numericValue(b.end)

  const aEmpty = aS === undefined && aE === undefined
  const bEmpty = bS === undefined && bE === undefined
  const comparable = !aEmpty && !bEmpty

  const relations: TemporalRelation[] = []
  let startGapYears: number | undefined
  let overlapYears: number | undefined
  let durationA: number | undefined
  let durationB: number | undefined
  let durationDiffYears: number | undefined

  // startGap only needs both starts (valid for partial OR full ranges).
  if (aS !== undefined && bS !== undefined) {
    startGapYears = aS - bS
  }

  // durations only when a single range has BOTH bounds.
  if (aS !== undefined && aE !== undefined) durationA = aE - aS
  if (bS !== undefined && bE !== undefined) durationB = bE - bS
  if (durationA !== undefined && durationB !== undefined) {
    durationDiffYears = durationA - durationB
  }

  // Full-interval relations require BOTH bounds on BOTH ranges. Without them,
  // overlap / containment / before / after cannot be inferred — we stay silent
  // rather than guess (no historical inference).
  const full =
    aS !== undefined && aE !== undefined && bS !== undefined && bE !== undefined
  if (full) {
    if (aS === bS && aE === bE) {
      relations.push('equals')
    } else {
      // a ended on or before b began -> a entirely precedes b.
      if (aE <= bS) relations.push('before')
      // a began on or after b ended -> a entirely follows b.
      if (aS >= bE) relations.push('after')
      // overlap: intervals intersect (strictly; mere touching is not an overlap).
      const ovStart = Math.max(aS, bS)
      const ovEnd = Math.min(aE, bE)
      if (ovStart < ovEnd) {
        relations.push('overlap')
        overlapYears = ovEnd - ovStart
      }
      // a contains b.
      if (aS <= bS && aE >= bE) relations.push('contains')
      // a contained by b.
      if (aS >= bS && aE <= bE) relations.push('contained_by')
    }
  }

  return {
    comparable,
    relations,
    startGapYears,
    overlapYears,
    durationA,
    durationB,
    durationDiffYears,
  }
}

// Deterministic template sentences. Same input -> same output. No judgement,
// no "importance", no "influence", no "cause" — only mechanical interval facts.
export function buildTemporalComparisonText(
  cmp: TemporalComparison,
  aName: string,
  bName: string,
): string[] {
  const out: string[] = []

  for (const r of cmp.relations) {
    switch (r) {
      case 'before':
        out.push(`${aName} existed entirely before ${bName}.`)
        break
      case 'after':
        out.push(`${aName} existed entirely after ${bName}.`)
        break
      case 'overlap':
        out.push(`${aName} and ${bName} overlapped for ${cmp.overlapYears} years.`)
        break
      case 'contains':
        out.push(`${aName} encompassed the entire span of ${bName}.`)
        break
      case 'contained_by':
        out.push(`${aName} was entirely contained within ${bName}.`)
        break
      case 'equals':
        out.push(`${aName} and ${bName} occupied the exact same time span.`)
        break
    }
  }

  if (cmp.startGapYears !== undefined) {
    if (cmp.startGapYears === 0) {
      out.push(`${aName} began in the same year as ${bName}.`)
    } else {
      const abs = Math.abs(cmp.startGapYears)
      const dir = cmp.startGapYears < 0 ? 'before' : 'after'
      out.push(`${aName} began ${abs} years ${dir} ${bName}.`)
    }
  }

  if (cmp.durationDiffYears !== undefined) {
    if (cmp.durationDiffYears === 0) {
      out.push(`${aName} and ${bName} lasted the same number of years.`)
    } else {
      const abs = Math.abs(cmp.durationDiffYears)
      const dir = cmp.durationDiffYears > 0 ? 'longer' : 'shorter'
      out.push(`${aName} lasted ${abs} years ${dir} than ${bName}.`)
    }
  }

  return out
}
