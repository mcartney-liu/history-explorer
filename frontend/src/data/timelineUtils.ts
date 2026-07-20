// M6-P4: Deterministic timeline ordering + fixed time-bucket grouping.
//
// SCOPE (frozen): this module has a tiny, single responsibility:
//   - compareTimelineDate(): order two timeline items by year
//   - sortTimeline(): ascending by date.value (undated -> end, stable)
//   - groupTimeline(): group already-sorted items into FIXED time buckets
//
// PROHIBITED (per M6 Freeze):
//   - NO formatter: date -> label is delegated to temporalUtils.formatTimeValue
//   - NO UI / rendering
//   - NO era / civilization / "Ancient / Classical / Medieval" inference
//   - NO historical interpretation, importance, ranking, similarity, AI/LLM
//   - NO new dependencies
//
// "Time Bucket" means a FIXED calendar interval, not a historical era.
// All boundaries below are constants; the same year always maps to the same
// bucket. No cultural or historical judgement is applied.

import type { TimeValue } from './temporalUtils'

// A timeline item carrying an optional backend-provided `date`.
// `date` is optional so plain { period, event } items (M2-003 / SearchEntity
// fixtures) stay fully compatible.
export interface DatedTimelineItem {
  period: string
  event: string
  date?: TimeValue
}

// Fixed, deterministic time buckets. `min` is inclusive, `max` exclusive,
// except for the terminal buckets (which use +/-Infinity).
export interface TimeBucket {
  label: string
  min: number
  max: number
}

export const TIME_BUCKETS: TimeBucket[] = [
  { label: 'Before 500 BCE', min: -Infinity, max: -500 },
  { label: '500 BCE – 1 CE', min: -500, max: 1 },
  { label: '1 – 500 CE', min: 1, max: 500 },
  { label: '500 – 1000 CE', min: 500, max: 1000 },
  { label: '1000 – 1500 CE', min: 1000, max: 1500 },
  { label: 'After 1500 CE', min: 1500, max: Infinity },
]

// Sentinel bucket for items that carry no usable year. Items here are not
// "classified" into any era — they simply lack a determinable date.
export const UNDATED_BUCKET = 'Undated'

// Ascending comparator by year (date.value).
//   - both dated   -> numeric difference (BCE negative sorts before CE)
//   - one dated    -> dated item first
//   - neither dated-> 0: keeps original relative order under a stable sort
// No Date(), no random, no locale, no external state.
export function compareTimelineDate(
  a: DatedTimelineItem,
  b: DatedTimelineItem,
): number {
  const av = a.date?.value
  const bv = b.date?.value
  const aNum = typeof av === 'number' && !Number.isNaN(av)
  const bNum = typeof bv === 'number' && !Number.isNaN(bv)
  if (aNum && bNum) return av - bv
  if (aNum) return -1
  if (bNum) return 1
  return 0
}

// Returns a new array sorted ascending by year; undated items keep their
// relative order and are placed after all dated items. Input is not mutated.
export function sortTimeline(
  items: DatedTimelineItem[],
): DatedTimelineItem[] {
  return items.map((it) => it).sort(compareTimelineDate)
}

// Map a year to its fixed bucket label. Returns UNDATED_BUCKET when the year
// is missing or NaN. Pure and deterministic.
export function bucketForValue(value?: number): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return UNDATED_BUCKET
  for (const b of TIME_BUCKETS) {
    if (value >= b.min && value < b.max) return b.label
  }
  return UNDATED_BUCKET
}

export interface TimelineBucketGroup {
  bucket: string
  items: DatedTimelineItem[]
}

// Group an ALREADY-SORTED list of items into their fixed time buckets.
// Buckets are emitted in fixed TIME_BUCKETS order; empty buckets are omitted.
// Undated items (if any) are emitted last under UNDATED_BUCKET.
// Pure grouping only — callers must sort first (sortTimeline).
export function groupTimeline(
  items: DatedTimelineItem[],
): TimelineBucketGroup[] {
  const byBucket = new Map<string, DatedTimelineItem[]>()
  for (const b of TIME_BUCKETS) byBucket.set(b.label, [])
  byBucket.set(UNDATED_BUCKET, [])

  for (const it of items) {
    const key = bucketForValue(it.date?.value)
    byBucket.get(key)!.push(it)
  }

  const out: TimelineBucketGroup[] = []
  for (const b of TIME_BUCKETS) {
    const arr = byBucket.get(b.label)!
    if (arr.length > 0) out.push({ bucket: b.label, items: arr })
  }
  const undated = byBucket.get(UNDATED_BUCKET)!
  if (undated.length > 0) out.push({ bucket: UNDATED_BUCKET, items: undated })
  return out
}
