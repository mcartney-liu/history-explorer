// Gap-state client (cognitive loop, ADR-0018 extension).
//
// Mirrors ResearchHistory's anonymous session model but reads/writes the
// per-entity Gap snapshot persisted at /api/v1/research/gap. No new dependency,
// no AI. The snapshot is an opaque JSON blob decided by the caller; the
// backend (gap_ledger) stores it verbatim. Reuses the same X-Session-Id as
// ResearchHistory so gap + research share one anonymous ownership scope
// (P2_COGNITIVE_LOOP_DESIGN.md §4: single approved persistence point).

import { API_BASE } from '../config/api'
import { getSessionId } from './ResearchHistory'

const GAP_ENDPOINT = '/api/v1/research/gap'

export interface GapSnapshot {
  entity_id: string
  session_id?: string
  updated_at?: string
  [key: string]: unknown
}

/** Persist (insert/replace) one entity's gap snapshot. Best-effort. */
export async function saveGap(
  entityId: string,
  snapshot: Record<string, unknown>,
): Promise<void> {
  try {
    await fetch(`${API_BASE}${GAP_ENDPOINT}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-Id': getSessionId(),
      },
      body: JSON.stringify({ entity_id: entityId, snapshot }),
    })
  } catch {
    // Offline / backend not deployed — the loop simply won't persist yet.
  }
}

/** Fetch one entity's gap snapshot, or null if none stored yet. */
export async function loadGap(entityId: string): Promise<GapSnapshot | null> {
  try {
    const resp = await fetch(
      `${API_BASE}${GAP_ENDPOINT}?entity_id=${encodeURIComponent(entityId)}`,
      { headers: { 'X-Session-Id': getSessionId() } },
    )
    if (!resp.ok) return null
    const data: unknown = await resp.json().catch(() => null)
    if (
      typeof data === 'object' &&
      data !== null &&
      (data as Record<string, unknown>).snapshot
    ) {
      return data as GapSnapshot
    }
    return null
  } catch {
    return null
  }
}
