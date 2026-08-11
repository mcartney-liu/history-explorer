// M6-P1: Deterministic TimeValue -> label formatter.
//
// SCOPE (frozen): this module is a PURE formatter. It converts a backend
// TimeValue object into a human-readable date / date-range string.
//
// PROHIBITED (per M6 Freeze):
//   - NO era reasoning / classification
//   - NO historical interpretation or "why"
//   - NO importance / ranking / similarity
//   - NO new dependencies
//
// Output is fully deterministic: same input -> same string.

export interface TimeValue {
  value?: number
  label?: string
  precision?: string
  certainty?: string
}

// Single date -> label.
// Prefers the backend-provided `label` verbatim; falls back to a deterministic
// BCE/CE derivation from `value` (negative value = BCE). Returns null when no
// usable date information is present.
// 2026-08-12 (PO): locale-aware — zh renders 公元前/公元 (e.g. 公元前 27 年),
// en keeps the original BC/CE suffix (27 BC). Default 'en' = backward compat.
export function formatTimeValue(tv?: TimeValue | null, locale = 'en'): string | null {
  if (!tv) return null
  if (tv.label && tv.label.trim().length > 0) return tv.label.trim()
  if (typeof tv.value !== 'number' || Number.isNaN(tv.value)) return null
  if (locale === 'zh') {
    return tv.value < 0 ? `公元前 ${Math.abs(tv.value)} 年` : `公元 ${tv.value} 年`
  }
  return tv.value < 0 ? `${Math.abs(tv.value)} BC` : `${tv.value} CE`
}

// Range (start -> end). Returns:
//   "START - END"  when both present
//   "START"        when only start present
//   "END"          when only end present
//   null           when neither present
export function formatDateRange(
  start?: TimeValue | null,
  end?: TimeValue | null,
  locale = 'en',
): string | null {
  const s = formatTimeValue(start, locale)
  const e = formatTimeValue(end, locale)
  if (s && e) return `${s} - ${e}`
  return s ?? e ?? null
}

// Build a name -> formatted-range lookup from a list of entities.
//
// The parameter type is intentionally structural: an entity only needs
// `name` plus optional `start_date`/`end_date` fields, so any backend-shaped
// entity object (including ones whose TS type does not declare the date
// fields) works without a cast. Runtime date fields are read directly.
export function buildEntityTimeMap(
  entities: Array<
    | { name?: string; start_date?: TimeValue; end_date?: TimeValue }
    | undefined
    | null
  >,
  locale = 'en',
): Record<string, string> {
  const map: Record<string, string> = {}
  for (const e of entities) {
    if (!e || !e.name) continue
    const range = formatDateRange(e.start_date, e.end_date, locale)
    if (range) map[e.name] = range
  }
  return map
}
