// localStorage persistence for Recent Explorations (M2-003).
//
// Thin storage wrapper only — all dedup/cap logic lives in navigation.ts
// (addRecent). Access is guarded so it is a no-op in non-browser
// environments (SSR / Node test runner), which keeps tests dependency-free.

import { NavNode, addRecent, RECENT_MAX } from './navigation'

const STORAGE_KEY = 'he_recent_explorations'

export function loadRecent(): NavNode[] {
  try {
    if (typeof localStorage === 'undefined') return []
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.slice(0, RECENT_MAX) : []
  } catch {
    return []
  }
}

export function saveRecent(list: NavNode[]): void {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, RECENT_MAX)))
  } catch {
    // Storage may be unavailable (private mode / quota) — degrade silently.
  }
}

// Add a node to the in-memory list and persist it. Returns the new list so
// the caller can update state in one step.
export function pushRecent(list: NavNode[], node: NavNode): NavNode[] {
  const next = addRecent(list, node)
  saveRecent(next)
  return next
}
