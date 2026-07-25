// M15 (Multi Entity Reasoning Enhancement): pure helpers that thicken the
// Cross Topic Picker UX (topic filtering, sorting, selected reordering, clear).
//
// Hard constraints (M15 Scope Freeze — Theme A):
//   - PURE functions only. No React state, no hooks, no API/DB access, no
//     persistence. Every function returns a NEW array; inputs are never mutated.
//   - NO AI logic. This is a display/data-shaping layer, deliberately kept out
//     of aiContext.ts (the Grounded-AI context assembly layer).
//   - Candidate identity is `gid` (the graph global_id) and stays authoritative:
//     these helpers reorder / filter / sort the SAME candidates, never rewrite
//     or synthesize a gid.
//
// Reuses the M14 Candidate shape so the picker and the reasoning panel share one
// vocabulary.

import type { Candidate } from './candidateUtils'

/** Sort dimensions offered by the picker. `gid` gives a stable canonical order. */
export type SortKey = 'name' | 'type' | 'topic' | 'gid'

/**
 * Filter candidates down to a single topic. An empty / null / undefined topic
 * means "no filter" and the list is returned unchanged (as a fresh copy).
 * Matching is exact on the candidate's `topic` field. Pure.
 */
export function filterByTopic(
  candidates: Candidate[],
  topic?: string | null,
): Candidate[] {
  const wanted = typeof topic === 'string' ? topic.trim() : ''
  if (wanted.length === 0) return [...candidates]
  return candidates.filter((c) => c.topic === wanted)
}

/**
 * The distinct, non-empty topics present in a candidate list, in first-seen
 * order. Supports rendering topic-filter chips without duplicating logic in the
 * component. Pure.
 */
export function distinctTopics(candidates: Candidate[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const c of candidates) {
    const t = typeof c.topic === 'string' ? c.topic.trim() : ''
    if (t.length > 0 && !seen.has(t)) {
      seen.add(t)
      out.push(t)
    }
  }
  return out
}

// Compare two possibly-undefined fields: real values sort ascending (locale
// aware for Chinese); blanks always sink to the end so unlabeled rows never push
// named rows down.
function compareField(a?: string, b?: string): number {
  const av = typeof a === 'string' ? a.trim() : ''
  const bv = typeof b === 'string' ? b.trim() : ''
  if (av.length === 0 && bv.length === 0) return 0
  if (av.length === 0) return 1
  if (bv.length === 0) return -1
  return av.localeCompare(bv, 'zh-Hans-CN')
}

/**
 * Return a new array sorted by the chosen dimension. Non-mutating and stable for
 * equal keys (falls back to `gid` so ordering is deterministic across runs).
 * Blank type/topic values sort last. Pure.
 */
export function sortCandidates(candidates: Candidate[], key: SortKey): Candidate[] {
  const copy = [...candidates]
  copy.sort((a, b) => {
    let primary = 0
    switch (key) {
      case 'name':
        primary = compareField(a.name, b.name)
        break
      case 'type':
        primary = compareField(a.type, b.type)
        break
      case 'topic':
        primary = compareField(a.topic, b.topic)
        break
      case 'gid':
      default:
        primary = compareField(a.gid, b.gid)
        break
    }
    if (primary !== 0) return primary
    // Deterministic tie-break by gid (the authoritative identity).
    return compareField(a.gid, b.gid)
  })
  return copy
}

/**
 * Move the candidate at index `from` to index `to`, returning a new array. Used
 * to let the user reorder their SELECTED candidates. Out-of-range indices (or a
 * no-op move) return a fresh copy unchanged; identity (`gid`) is preserved. Pure.
 */
export function reorderCandidates(
  candidates: Candidate[],
  from: number,
  to: number,
): Candidate[] {
  const copy = [...candidates]
  const n = copy.length
  if (
    !Number.isInteger(from) ||
    !Number.isInteger(to) ||
    from < 0 ||
    to < 0 ||
    from >= n ||
    to >= n ||
    from === to
  ) {
    return copy
  }
  const [moved] = copy.splice(from, 1)
  copy.splice(to, 0, moved)
  return copy
}

/**
 * Clear the selection. Returns a brand-new empty array so callers can assign it
 * directly to state without aliasing. Pure.
 */
export function clearCandidates(): Candidate[] {
  return []
}
