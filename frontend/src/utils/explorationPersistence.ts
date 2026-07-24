// localStorage persistence adapter for the Exploration Trail (M10-1).
//
// Thin storage wrapper ONLY — it never owns or mutates navigation state.
// The single source of truth is App's history/cursor/journeyReasons
// (navigation.ts pure functions + App's useState). This adapter sits BELOW
// that state and translates it to/from localStorage:
//
//   App (history, cursor, journeyReasons)   <-- single navigation truth
//            |  navigateTo / goTo / goHome
//            v
//   explorationPersistence.savePath / saveReasons   <-- adapter, no state
//            |
//            v
//   localStorage: he_exploration_path / he_journey_reasons
//
// Mirrors recentStore.ts (load/save + no-op when storage is unavailable),
// but deliberately contains NO dedup/cap/state logic — that stays in
// navigation.ts. This keeps navigation state single-sourced: there is no
// second store that App must reconcile against.
//
// Access is guarded so it is a no-op in non-browser environments (SSR / Node
// test runner), which keeps tests dependency-free.

import { NavNode, HISTORY_MAX } from '../components/navigation'
import type { JourneyWhyPayload } from '../components/ExplorationJourney'

const PATH_KEY = 'he_exploration_path'
const REASONS_KEY = 'he_journey_reasons'

interface PathEnvelope {
  v: number
  history: NavNode[]
  cursor: number
}

interface ReasonEntry {
  gid: string
  payload: JourneyWhyPayload
}

interface ReasonEnvelope {
  v: number
  entries: ReasonEntry[]
}

// --- Path (history + cursor) ---

export function loadPath(): { history: NavNode[]; cursor: number } | null {
  try {
    if (typeof localStorage === 'undefined') return null
    const raw = localStorage.getItem(PATH_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PathEnvelope
    if (parsed.v !== 1 || !Array.isArray(parsed.history)) return null
    const history = parsed.history.slice(-HISTORY_MAX)
    const cursor = Math.min(Math.max(parsed.cursor ?? -1, -1), history.length - 1)
    return { history, cursor }
  } catch {
    return null
  }
}

export function savePath(history: NavNode[], cursor: number): void {
  try {
    if (typeof localStorage === 'undefined') return
    const env: PathEnvelope = {
      v: 1,
      history: history.slice(-HISTORY_MAX),
      cursor,
    }
    localStorage.setItem(PATH_KEY, JSON.stringify(env))
  } catch {
    // Storage may be unavailable (private mode / quota) — degrade silently.
  }
}

// --- Journey reasons (annotation map) ---

export function loadReasons(): Map<string, JourneyWhyPayload> | null {
  try {
    if (typeof localStorage === 'undefined') return null
    const raw = localStorage.getItem(REASONS_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ReasonEnvelope
    if (parsed.v !== 1 || !Array.isArray(parsed.entries)) return null
    return new Map(parsed.entries.map((e) => [e.gid, e.payload]))
  } catch {
    return null
  }
}

export function saveReasons(reasons: Map<string, JourneyWhyPayload>): void {
  try {
    if (typeof localStorage === 'undefined') return
    const entries: ReasonEntry[] = Array.from(reasons.entries()).map(([gid, payload]) => ({
      gid,
      payload,
    }))
    const env: ReasonEnvelope = { v: 1, entries }
    localStorage.setItem(REASONS_KEY, JSON.stringify(env))
  } catch {
    // Storage may be unavailable (private mode / quota) — degrade silently.
  }
}
