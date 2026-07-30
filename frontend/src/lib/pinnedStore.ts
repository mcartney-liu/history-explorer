// M65 Phase 3B — pinned entities store (localStorage-backed).
// Minimal: load / add / remove / clear. No Context, no dependency.

const STORAGE_KEY = 'he-pinned'

export interface PinnedEntity {
  id: string
  title: string
  subtitle: string
  icon: string
  pinnedAt: number // timestamp
}

function loadPinned(): PinnedEntity[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function savePinned(entities: PinnedEntity[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entities))
  } catch {
    // Storage full or private mode — silently fail
  }
}

export function getPinnedEntities(): PinnedEntity[] {
  return loadPinned()
}

export function addPinnedEntity(entity: PinnedEntity): PinnedEntity[] {
  const current = loadPinned()
  // Deduplicate by id
  if (current.some((e) => e.id === entity.id)) return current
  const next = [entity, ...current]
  savePinned(next)
  return next
}

export function removePinnedEntity(id: string): PinnedEntity[] {
  const next = loadPinned().filter((e) => e.id !== id)
  savePinned(next)
  return next
}

export function isPinned(id: string): boolean {
  return loadPinned().some((e) => e.id === id)
}

export function clearPinned(): void {
  localStorage.removeItem(STORAGE_KEY)
}
