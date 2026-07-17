// Pure navigation model for the Exploration Loop (M2-003).
//
// No React, no DOM, no storage — just deterministic functions over plain
// data so they can be unit-tested in a Node environment (matching the
// established searchNav.ts pattern, no new test dependency). The UI layer
// (App) owns the state and calls these; storage lives in recentStore.ts.

export type NavNode =
  | { type: 'topic'; topic: string; title: string }
  | { type: 'entity'; id: string; name: string }

export type HistoryState = {
  history: NavNode[]
  cursor: number
}

export const HISTORY_MAX = 100
export const RECENT_MAX = 10

// Stable identity for a node, used for deduplication in both history and
// recent lists. Topic and entity namespaces never collide (different types).
export function nodeKey(node: NavNode): string {
  return node.type === 'topic' ? `topic:${node.topic}` : `entity:${node.id}`
}

export function eqNode(a: NavNode, b: NavNode): boolean {
  if (a.type === 'topic' && b.type === 'topic') return a.topic === b.topic
  if (a.type === 'entity' && b.type === 'entity') return a.id === b.id
  return false
}

// Append a node to the history, moving the cursor to it.
// - Dedup: navigating to the node already at the cursor is a no-op (avoids
//   growing the stack when re-selecting the current view).
// - Truncate forward: any "future" entries beyond the cursor are dropped,
//   mirroring browser back/forward behaviour when you branch.
// - Cap: the oldest entries are dropped once HISTORY_MAX is exceeded, which
//   bounds memory and prevents an effectively infinite loop.
export function pushHistory(
  history: NavNode[],
  cursor: number,
  node: NavNode,
  max: number = HISTORY_MAX,
): HistoryState {
  if (cursor >= 0 && cursor < history.length && eqNode(history[cursor], node)) {
    return { history, cursor }
  }
  let next = history.slice(0, cursor + 1)
  next.push(node)
  if (next.length > max) {
    next = next.slice(next.length - max)
  }
  return { history: next, cursor: next.length - 1 }
}

export function canBack(cursor: number): boolean {
  return cursor > 0
}

export function canForward(cursor: number, length: number): boolean {
  return cursor < length - 1
}

export function backCursor(cursor: number): number {
  return Math.max(0, cursor - 1)
}

export function forwardCursor(cursor: number, length: number): number {
  return Math.min(length - 1, cursor + 1)
}

// Jump to a breadcrumb index. Index 0 is the synthetic "Home" root and is
// handled by the caller (reset); index N maps to history[N-1].
export function crumbCursor(index: number): number {
  return index - 1
}

// Build the breadcrumb trail: Home + every visited node up to the cursor.
// Clicking a crumb calls goTo with its history index (crumb index - 1).
export function buildBreadcrumb(
  history: NavNode[],
  cursor: number,
): { key: string; label: string; index: number }[] {
  const crumbs = [{ key: 'home', label: 'Home', index: 0 }]
  for (let i = 0; i <= cursor && i < history.length; i++) {
    const n = history[i]
    crumbs.push({
      key: nodeKey(n),
      label: n.type === 'topic' ? n.title : n.name,
      index: i + 1,
    })
  }
  return crumbs
}

// Add a node to the recent list: deduplicated (moved to front if it already
// existed) and capped at RECENT_MAX, most-recent first.
export function addRecent(
  recent: NavNode[],
  node: NavNode,
  max: number = RECENT_MAX,
): NavNode[] {
  const key = nodeKey(node)
  const filtered = recent.filter((n) => nodeKey(n) !== key)
  return [node, ...filtered].slice(0, max)
}
