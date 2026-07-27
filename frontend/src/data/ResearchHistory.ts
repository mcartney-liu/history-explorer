import type { ResearchDimension } from '../components/ResearchDimensionCard'
import type { AICitation } from './aiClient'

// ============================================================
// Types
// ============================================================

export interface SavedResearch {
  id: string
  version: number
  createdAt: string
  updatedAt: string
  entityName: string
  entityType: string
  entityGlobalId: string
  /** Comparison entity names (multi-entity research). */
  comparedNames: string[]
  /** Serialized research dimensions with answers. */
  dimensions: SavedDimension[]
  /** ResearchSummary answer (if available). */
  summaryAnswer?: string
  /** Aggregated citations from summary. */
  summaryCitations: SavedCitation[]
  /** Bookmark state. */
  bookmarked: boolean
  /** User-defined labels for categorization. */
  labels: string[]
}

export interface SavedDimension {
  id: string
  title: string
  question: string
  status: string
  answer?: string
  grounded?: boolean
  citationCount: number
}

export interface SavedCitation {
  global_id: string
  kind: string
  label: string
}

// ============================================================
// Constants
// ============================================================

const STORAGE_KEY = 'history-explorer.research.v1'
const CURRENT_VERSION = 1

// ============================================================
// Serialization helpers
// ============================================================

function dimToSaved(dim: ResearchDimension): SavedDimension {
  return {
    id: dim.id,
    title: dim.title,
    question: dim.question,
    status: dim.status,
    answer: dim.answer,
    grounded: dim.grounded,
    citationCount: (dim.citations ?? []).length,
  }
}

function citToSaved(c: AICitation): SavedCitation {
  return { global_id: c.global_id, kind: c.kind, label: c.label }
}

// ============================================================
// Core API
// ============================================================

function readAll(): SavedResearch[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item: unknown) => {
      if (typeof item !== 'object' || item === null) return false
      const obj = item as Record<string, unknown>
      return typeof obj.id === 'string' && typeof obj.version === 'number'
    })
  } catch {
    return []
  }
}

function writeAll(items: SavedResearch[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

function generateId(): string {
  return `r_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

// ============================================================
// Public API
// ============================================================

export function saveResearch(params: {
  entityName: string
  entityType: string
  entityGlobalId: string
  comparedNames?: string[]
  dimensions: ResearchDimension[]
  summaryAnswer?: string
  summaryCitations?: AICitation[]
}): SavedResearch {
  const items = readAll()
  const now = new Date().toISOString()
  const research: SavedResearch = {
    id: generateId(),
    version: CURRENT_VERSION,
    createdAt: now,
    updatedAt: now,
    entityName: params.entityName,
    entityType: params.entityType,
    entityGlobalId: params.entityGlobalId,
    comparedNames: params.comparedNames ?? [],
    dimensions: params.dimensions.map(dimToSaved),
    summaryAnswer: params.summaryAnswer,
    summaryCitations: (params.summaryCitations ?? []).map(citToSaved),
    bookmarked: false,
    labels: [],
  }
  items.push(research)
  writeAll(items)
  return research
}

export function loadResearch(id: string): SavedResearch | null {
  const items = readAll()
  const found = items.find((r) => r.id === id)
  if (!found) return null
  if (found.version !== CURRENT_VERSION) {
    return null // Future: trigger migration
  }
  return found
}

export function listResearch(): SavedResearch[] {
  return readAll()
    .filter((r) => r.version === CURRENT_VERSION)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export function deleteResearch(id: string): boolean {
  const items = readAll()
  const idx = items.findIndex((r) => r.id === id)
  if (idx === -1) return false
  items.splice(idx, 1)
  writeAll(items)
  return true
}

export function updateResearch(id: string, patch: Partial<Pick<SavedResearch, 'bookmarked' | 'labels'>>): SavedResearch | null {
  const items = readAll()
  const found = items.find((r) => r.id === id)
  if (!found) return null
  if (patch.bookmarked !== undefined) found.bookmarked = patch.bookmarked
  if (patch.labels !== undefined) found.labels = patch.labels
  found.updatedAt = new Date().toISOString()
  writeAll(items)
  return found
}

export function getStorageKey(): string {
  return STORAGE_KEY
}
