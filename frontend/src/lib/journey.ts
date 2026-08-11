// M35 Feature D — Journey trace (localStorage only, pure frontend).
//
// Records every navigation made through the single `navigateTo` entry point so
// the user can review their exploration path. Storage is keyed separately from
// the existing Recent Explorations store (`he_recent_explorations`) to avoid
// coupling the two concerns. All access is guarded so it is a no-op outside the
// browser (Node test runner / SSR), keeping tests dependency-free.

import type { NavNode } from '../components/navigation'
import { getCausalObjectName } from '../data/causalObjectNames'

export type JourneyKind = 'topic' | 'entity' | 'causal_object'

export interface JourneyEntry {
  globalId: string
  kind: JourneyKind
  label: string
  ts: number
}

const STORAGE_KEY = 'history_explorer_journey'
const JOURNEY_MAX = 50

function read(): JourneyEntry[] {
  try {
    if (typeof localStorage === 'undefined') return []
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as JourneyEntry[]) : []
  } catch {
    return []
  }
}

function write(entries: JourneyEntry[]): void {
  try {
    if (typeof localStorage === 'undefined') return
    // Keep the most recent JOURNEY_MAX entries (a journey trace is read newest-first).
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-JOURNEY_MAX)))
  } catch {
    // Storage may be unavailable (private mode / quota) — degrade silently.
  }
}

// Build a JourneyEntry from a navigation node. `globalId` is the topic slug for
// topics and the entity global_id for entities (matches narrative.ts keys).
export function entryFromNode(node: NavNode): Omit<JourneyEntry, 'ts'> {
  if (node.type === 'topic') {
    return { globalId: node.topic, kind: 'topic', label: node.title || node.topic }
  }
  if (node.type === 'causal_object') {
    return { globalId: node.objectId, kind: 'causal_object', label: getCausalObjectName(node.objectId) }
  }
  return { globalId: node.id, kind: 'entity', label: node.name || node.id }
}

export function addJourneyEntry(e: Omit<JourneyEntry, 'ts'>): void {
  const entry: JourneyEntry = { ...e, ts: Date.now() }
  const list = read()
  list.push(entry)
  write(list)
}

export function getJourney(): JourneyEntry[] {
  return read()
}

export function clearJourney(): void {
  write([])
}
