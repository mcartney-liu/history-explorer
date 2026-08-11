/** M85.9.3 — Explorer Path Instrumentation.
 *
 * Records exploration paths for M86 Pattern discovery.
 * NOT user behavior tracking. NOT recommendation engine input.
 *
 * Principles:
 *   Record: "How do humans cognitively navigate civilization understanding?"
 *   NOT:    "What do users like? What should we recommend?"
 *
 * C1: Never feed into recommendation/ranking logic
 * C2: Never compute user preference profiles
 * C3: Never preload/pre-render based on path data
 * C4: Only used for M86 Pattern validation
 * C5: Must not alter the current Explorer experience
 */

const STORAGE_KEY_PATHS = 'explorer_paths'
const STORAGE_KEY_CURRENT = 'current_explorer_path'
const MAX_SESSIONS = 50
const STORE_VERSION = 1

export interface ExplorerSessionPath {
  sessionId: string
  seedId: string
  /** The question text the Explorer started from (e.g. "一个庞大的国家，如何解决治理千万人的问题？") */
  seedQuestion: string
  visitedObjects: string[]
  depth: number
  /** A question the Explorer generated themselves during the session (O3) */
  explorerQuestion?: string
  timestamp: number
}

interface ExplorerPathStore {
  version: number
  paths: ExplorerSessionPath[]
}

function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function loadStore(): ExplorerPathStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PATHS)
    if (!raw) return { version: STORE_VERSION, paths: [] }
    const parsed = JSON.parse(raw)
    if (parsed?.version === STORE_VERSION && Array.isArray(parsed.paths)) {
      return parsed as ExplorerPathStore
    }
  } catch {
    // Corrupted data — reset
  }
  return { version: STORE_VERSION, paths: [] }
}

function saveStore(store: ExplorerPathStore): void {
  try {
    localStorage.setItem(STORAGE_KEY_PATHS, JSON.stringify(store))
  } catch {
    // Storage unavailable — degrade silently
  }
}

/** Start or resume a session path. Call when the Explorer enters a Seed. */
export function startPath(seedId: string, seedQuestion: string): void {
  try {
    const path: ExplorerSessionPath = {
      sessionId: generateSessionId(),
      seedId,
      seedQuestion,
      visitedObjects: [],
      depth: 0,
      timestamp: Date.now(),
    }
    localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(path))
  } catch {
    // Storage unavailable
  }
}

/** Record a CausalObject visit on the current session path. */
export function recordVisit(objectId: string): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CURRENT)
    if (!raw) return
    const path: ExplorerSessionPath = JSON.parse(raw)
    if (!path.visitedObjects.includes(objectId)) {
      path.visitedObjects.push(objectId)
      path.depth = path.visitedObjects.length
    }
    localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(path))
  } catch {
    // Storage unavailable
  }
}

/** Record an Explorer-generated question on the current session path. */
export function recordQuestion(question: string): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CURRENT)
    if (!raw) return
    const path: ExplorerSessionPath = JSON.parse(raw)
    path.explorerQuestion = question
    localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(path))
  } catch {
    // Storage unavailable
  }
}

/** Complete the current session and persist it to the paths store. */
export function completePath(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CURRENT)
    if (!raw) return
    const path: ExplorerSessionPath = JSON.parse(raw)
    if (path.visitedObjects.length === 0) return

    const store = loadStore()
    store.paths.push(path)
    if (store.paths.length > MAX_SESSIONS) {
      store.paths = store.paths.slice(-MAX_SESSIONS)
    }
    saveStore(store)
    localStorage.removeItem(STORAGE_KEY_CURRENT)
  } catch {
    // Storage unavailable
  }
}

/** Discard the current session (e.g. on premature exit). */
export function discardPath(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_CURRENT)
  } catch {
    // Storage unavailable
  }
}

/** Get all recorded session paths (for M86 analysis). */
export function getPaths(): ExplorerSessionPath[] {
  return loadStore().paths
}

/** Clear all recorded paths. */
export function clearPaths(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_PATHS)
    localStorage.removeItem(STORAGE_KEY_CURRENT)
  } catch {
    // Storage unavailable
  }
}
