// ============================================================
// M43 Phase 3 — UserBehaviorEvent
// Local behavior telemetry. Records user actions as structured
// events for future product validation. localStorage only.
//
// Domain Boundary: Platform Capability. Event types are
// domain-neutral — reusable for History, Science, Business,
// Education, etc. No history-specific logic.
//
// Zero AI. Zero backend. Zero UI impact.
// ============================================================

// -----------------------------------------------------------
// Types
// -----------------------------------------------------------

/** All tracked user behavior actions. Domain-neutral. */
export type BehaviorAction =
  // Discovery funnel
  | 'open_discover'
  | 'click_entity'
  // Exploration funnel
  | 'open_entity'
  | 'switch_tab'
  | 'click_relationship'
  | 'click_journey'
  | 'start_chat'
  // Exploration Package funnel (M71 — behavior-analysis only)
  | 'open_package'
  | 'click_guide_next'
  | 'view_source'
  | 'complete_package'
  // Research funnel
  | 'start_research'
  | 'save_research'
  | 'restore_research'
  | 'start_comparison'
  | 'click_recommendation'
  // Persistence
  | 'delete_research'
  // Meta
  | 'reset'

export interface UserBehaviorEvent {
  /** What the user did. */
  action: BehaviorAction
  /** Entity identifier (optional — not all actions relate to an entity). */
  entityGlobalId?: string
  /** Entity type category (optional). */
  entityType?: string
  /** Which tab was involved (for switch_tab events). */
  tab?: string
  /** Exploration Package slug (for open_package / complete_package / related). */
  packageSlug?: string
  /** Source record id (for view_source events). */
  sourceId?: string
  /** ISO 8601 timestamp of the event. */
  timestamp: string
}

// -----------------------------------------------------------
// Constants
// -----------------------------------------------------------

const STORAGE_KEY = 'history-explorer.events.v1'
const MAX_EVENTS = 1000

// -----------------------------------------------------------
// Core API
// -----------------------------------------------------------

function readAll(): UserBehaviorEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item: unknown): item is UserBehaviorEvent =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as UserBehaviorEvent).action === 'string' &&
        typeof (item as UserBehaviorEvent).timestamp === 'string',
    )
  } catch {
    return []
  }
}

function writeAll(events: UserBehaviorEvent[]): void {
  try {
    const capped = events.slice(-MAX_EVENTS)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(capped))
  } catch { /* storage full — silently drop */ }
}

// -----------------------------------------------------------
// Public API
// -----------------------------------------------------------

export function recordEvent(
  event: Omit<UserBehaviorEvent, 'timestamp'>,
  timestampOverride?: string,
): void {
  const full: UserBehaviorEvent = {
    ...event,
    timestamp: timestampOverride ?? new Date().toISOString(),
  }
  const events = readAll()
  events.push(full)
  writeAll(events)
}

export function getEvents(): UserBehaviorEvent[] {
  return readAll()
}

export function getEventsByAction(action: BehaviorAction): UserBehaviorEvent[] {
  return readAll().filter((e) => e.action === action)
}

export function getRecentEvents(limit = 20): UserBehaviorEvent[] {
  return readAll().slice(-limit)
}

export function getEventCount(): number {
  return readAll().length
}

export function clearEvents(): void {
  localStorage.removeItem(STORAGE_KEY)
}

// -----------------------------------------------------------
// Analysis helpers — domain-neutral
// -----------------------------------------------------------

export interface FunnelStep {
  action: BehaviorAction
  count: number
}

export function actionFrequencies(): FunnelStep[] {
  const events = readAll()
  const map = new Map<BehaviorAction, number>()
  for (const e of events) {
    map.set(e.action, (map.get(e.action) ?? 0) + 1)
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([action, count]) => ({ action, count }))
}

export function uniqueEntities(): number {
  const ids = new Set<string>()
  for (const e of readAll()) {
    if (e.entityGlobalId) ids.add(e.entityGlobalId)
  }
  return ids.size
}

export function firstEventTime(): string | null {
  const events = readAll()
  return events.length > 0 ? events[0].timestamp : null
}

export function lastsOver(sessionMinutes: number): boolean {
  const events = readAll()
  if (events.length < 2) return false
  const first = new Date(events[0].timestamp).getTime()
  const last = new Date(events[events.length - 1].timestamp).getTime()
  return (last - first) / 60000 >= sessionMinutes
}

export function tabUsage(): { tab: string; count: number }[] {
  const events = readAll().filter((e) => e.action === 'switch_tab' && e.tab)
  const map = new Map<string, number>()
  for (const e of events) {
    map.set(e.tab!, (map.get(e.tab!) ?? 0) + 1)
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([tab, count]) => ({ tab, count }))
}
