// M65 Phase 3B — unified Workspace persistence layer (localStorage-backed).
// Aggregates all workspace state under a single key for future expansion
// (notes, compare queue, metadata) while maintaining backward compatibility
// with the legacy he-pinned key.
//
// Structure:
//   he-workspace → { pinned: PinnedEntity[], version: 1 }
//
// Migrates from legacy he-pinned on first load if he-workspace does not exist.

import type { PinnedEntity } from './pinnedStore'

const WORKSPACE_KEY = 'he-workspace'
const LEGACY_PINNED_KEY = 'he-pinned'
const CURRENT_VERSION = 1

interface WorkspaceData {
  pinned: PinnedEntity[]
  version: number
}

// ---- Internal helpers ----

function loadWorkspace(): WorkspaceData {
  try {
    const raw = localStorage.getItem(WORKSPACE_KEY)
    if (!raw) return migrateFromLegacy()
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.pinned)) {
      return parsed as WorkspaceData
    }
  } catch {
    // Corrupt data — fall through to migration
  }
  return migrateFromLegacy()
}

function migrateFromLegacy(): WorkspaceData {
  try {
    const raw = localStorage.getItem(LEGACY_PINNED_KEY)
    if (!raw) return { pinned: [], version: CURRENT_VERSION }
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.length > 0) {
      const data: WorkspaceData = { pinned: parsed, version: CURRENT_VERSION }
      saveWorkspace(data)
      localStorage.removeItem(LEGACY_PINNED_KEY)
      return data
    }
  } catch {
    // Silently fail
  }
  return { pinned: [], version: CURRENT_VERSION }
}

function saveWorkspace(data: WorkspaceData): void {
  try {
    localStorage.setItem(WORKSPACE_KEY, JSON.stringify(data))
  } catch {
    // Storage full or private mode — silently fail
  }
}

// ---- Public API ----

/** Load complete workspace data snapshot */
export function getWorkspaceData(): WorkspaceData {
  return loadWorkspace()
}

/** Get pinned entities (delegates to unified store) */
export function getPinnedEntities(): PinnedEntity[] {
  return loadWorkspace().pinned
}

/** Add entity to pinned list. Deduplicates by id. Returns updated list. */
export function addPinnedEntity(entity: PinnedEntity): PinnedEntity[] {
  const data = loadWorkspace()
  if (data.pinned.some((e) => e.id === entity.id)) return data.pinned
  const next: WorkspaceData = {
    ...data,
    pinned: [entity, ...data.pinned],
  }
  saveWorkspace(next)
  // Also update legacy key for backward compat (pinnedStore.ts consumers)
  syncLegacyPinned(next.pinned)
  return next.pinned
}

/** Remove entity from pinned list. Returns updated list. */
export function removePinnedEntity(id: string): PinnedEntity[] {
  const data = loadWorkspace()
  const next: WorkspaceData = {
    ...data,
    pinned: data.pinned.filter((e) => e.id !== id),
  }
  saveWorkspace(next)
  syncLegacyPinned(next.pinned)
  return next.pinned
}

/** Check if an entity is pinned */
export function isPinned(id: string): boolean {
  return loadWorkspace().pinned.some((e) => e.id === id)
}

/** Clear all workspace data */
export function clearWorkspace(): void {
  try {
    localStorage.removeItem(WORKSPACE_KEY)
    localStorage.removeItem(LEGACY_PINNED_KEY)
  } catch {
    // Silently fail
  }
}

// ---- Legacy sync ----
function syncLegacyPinned(pinned: PinnedEntity[]): void {
  try {
    localStorage.setItem(LEGACY_PINNED_KEY, JSON.stringify(pinned))
  } catch {
    // Silently fail
  }
}
