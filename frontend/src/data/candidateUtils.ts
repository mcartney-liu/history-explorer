// M14 (Cross Topic Selection Picker): candidate normalization.
//
// This module turns a raw /search result row (SearchResultItem) into a
// friendly, selectable Candidate carrying the graph global_id plus the
// human-readable name/type/topic used by the picker UI.
//
// Hard constraints (M14 Scope Freeze):
//   - PURE functions only. No state, no API/DB access, no persistence.
//   - NO AI logic. This is a display/data-mapping layer, deliberately kept
//     out of aiContext.ts (the Grounded-AI context assembly layer).
//   - Only real Entity rows become candidates. Topic rows and rows missing an
//     id are not resolvable graph nodes and are dropped (returns null).
//
// global_id derivation: the current /search API strips global_id in
// backend `_entity_result`, so the canonical shape `${topic}:${id}` is derived
// on the client. If a payload ever carries an explicit `global_id`, it wins.

import type { SearchResultItem } from '../components/SearchResults'

/** A friendly, selectable entity for the Cross Topic Picker. */
export type Candidate = {
  gid: string
  name: string
  type?: string
  topic?: string
}

/**
 * Derive a real graph global_id for a search row, or null when the row cannot
 * resolve to one. Prefers an explicit `global_id`; otherwise builds the
 * canonical `${topic}:${id}` shape (verified across all seeded entities).
 */
export function deriveGlobalId(item: SearchResultItem): string | null {
  const explicit = typeof item.global_id === 'string' ? item.global_id.trim() : ''
  if (explicit.length > 0) return explicit

  const topic = typeof item.topic === 'string' ? item.topic.trim() : ''
  const id = typeof item.id === 'string' ? item.id.trim() : ''
  if (topic.length > 0 && id.length > 0) return `${topic}:${id}`

  return null
}

/**
 * Normalize a search row into a Candidate, or null when it is not a selectable
 * real entity. Topic rows are never candidates; Entity rows require a
 * resolvable global_id.
 */
export function toCandidate(item: SearchResultItem): Candidate | null {
  if (item.result_type === 'Topic') return null
  const gid = deriveGlobalId(item)
  if (!gid) return null
  return {
    gid,
    name: item.name,
    type: item.type,
    topic: item.topic,
  }
}
