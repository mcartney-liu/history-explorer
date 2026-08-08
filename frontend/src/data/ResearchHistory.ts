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

// Remote persistence (T1). Same externalized base URL aiClient.ts uses.
const API_BASE: string = import.meta.env.VITE_API_BASE || 'http://localhost:8000'
const RESEARCH_ENDPOINT = '/api/v1/research'
const SESSION_KEY = 'history-explorer.session.v1'

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

// ============================================================
// T1 — Remote persistence (POST/GET/DELETE /api/v1/research)
//
// The remote layer is ADDITIVE and NEVER destructive: every call
// degrades to the existing localStorage store when the request
// fails (offline, backend not deployed, non-2xx). The local store
// therefore stays the source of truth the UI can always read
// synchronously.
// ============================================================

/** Stable per-browser session id sent as the `X-Session-Id` header. */
export function getSessionId(): string {
  try {
    const existing = localStorage.getItem(SESSION_KEY)
    if (existing) return existing
    const generated =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `s_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
    localStorage.setItem(SESSION_KEY, generated)
    return generated
  } catch {
    return `s_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
  }
}

export interface SaveResearchInput {
  entityName: string
  entityType: string
  entityGlobalId: string
  comparedNames?: string[]
  dimensions: ResearchDimension[]
  summaryAnswer?: string
  summaryCitations?: AICitation[]
  /** The research question that opened the session. */
  question?: string
  /** Primary entity + comparison entities. */
  contextGlobalIds?: string[]
  /** Entity ids already visited in this exploration. */
  visited?: string[]
  /** Raw citations gathered across all dimensions. */
  citations?: AICitation[]
  /** Verified evidence entries, when the backend returned any. */
  evidence?: unknown[]
  /** Aggregate confidence reported by the backend. */
  confidence?: string
}

/** Backend wire payload — snake_case per the /api/v1/research contract. */
function toRemotePayload(params: SaveResearchInput): Record<string, unknown> {
  return {
    question: params.question ?? `关于${params.entityName}的多维度分析`,
    context_global_ids: params.contextGlobalIds ?? [params.entityGlobalId],
    visited: params.visited ?? [],
    citations: (params.citations ?? []).map(citToSaved),
    evidence: params.evidence ?? [],
    confidence: params.confidence ?? null,
    dimensions: params.dimensions.map(dimToSaved),
    summary: params.summaryAnswer ?? null,
    summary_citations: (params.summaryCitations ?? []).map(citToSaved),
    entity_global_id: params.entityGlobalId,
    entity_name: params.entityName,
  }
}

/**
 * Normalize an unknown backend record into a SavedResearch. Accepts both the
 * canonical SavedResearch shape and the snake_case wire payload, so the client
 * keeps working whichever the backend echoes back.
 */
function fromRemote(raw: unknown): SavedResearch | null {
  if (typeof raw !== 'object' || raw === null) return null
  const o = raw as Record<string, unknown>
  const id = typeof o.id === 'string' ? o.id : null
  if (!id) return null
  const createdAt =
    typeof o.createdAt === 'string'
      ? o.createdAt
      : typeof o.created_at === 'string'
        ? o.created_at
        : new Date().toISOString()
  return {
    id,
    version: typeof o.version === 'number' ? o.version : CURRENT_VERSION,
    createdAt,
    updatedAt:
      typeof o.updatedAt === 'string'
        ? o.updatedAt
        : typeof o.updated_at === 'string'
          ? o.updated_at
          : createdAt,
    entityName:
      typeof o.entityName === 'string'
        ? o.entityName
        : typeof o.entity_name === 'string'
          ? o.entity_name
          : '',
    entityType: typeof o.entityType === 'string' ? o.entityType : 'Civilization',
    entityGlobalId:
      typeof o.entityGlobalId === 'string'
        ? o.entityGlobalId
        : typeof o.entity_global_id === 'string'
          ? o.entity_global_id
          : '',
    comparedNames: Array.isArray(o.comparedNames) ? (o.comparedNames as string[]) : [],
    dimensions: Array.isArray(o.dimensions) ? (o.dimensions as SavedDimension[]) : [],
    summaryAnswer:
      typeof o.summaryAnswer === 'string'
        ? o.summaryAnswer
        : typeof o.summary === 'string'
          ? o.summary
          : undefined,
    summaryCitations: Array.isArray(o.summaryCitations)
      ? (o.summaryCitations as SavedCitation[])
      : Array.isArray(o.summary_citations)
        ? (o.summary_citations as SavedCitation[])
        : [],
    bookmarked: o.bookmarked === true,
    labels: Array.isArray(o.labels) ? (o.labels as string[]) : [],
  }
}

/**
 * Persist a research to the backend, falling back to localStorage when the
 * request fails. ALWAYS mirrors into localStorage so the library renders
 * immediately and stays readable offline.
 *
 * @returns the saved record plus whether it reached the backend.
 */
export async function saveResearchRemote(
  params: SaveResearchInput,
): Promise<{ research: SavedResearch; remote: boolean }> {
  // Local mirror first — a failed network call must never lose the research.
  const local = saveResearch(params)

  try {
    const resp = await fetch(`${API_BASE}${RESEARCH_ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-Id': getSessionId(),
      },
      body: JSON.stringify(toRemotePayload(params)),
    })
    if (!resp.ok) throw new Error(`save research failed (${resp.status})`)
    const body: unknown = await resp.json().catch(() => null)
    const remote = fromRemote(body)
    if (remote) {
      // Adopt the backend id so a later remote delete targets the same record.
      const items = readAll()
      const idx = items.findIndex((r) => r.id === local.id)
      if (idx !== -1) {
        items[idx] = { ...items[idx], id: remote.id }
        writeAll(items)
      }
      return { research: { ...local, id: remote.id }, remote: true }
    }
    return { research: local, remote: true }
  } catch {
    return { research: local, remote: false }
  }
}

/** Fetch this session's researches from the backend. Returns [] on failure. */
export async function fetchRemoteResearch(): Promise<SavedResearch[]> {
  try {
    const resp = await fetch(`${API_BASE}${RESEARCH_ENDPOINT}`, {
      method: 'GET',
      headers: { 'X-Session-Id': getSessionId() },
    })
    if (!resp.ok) return []
    const body: unknown = await resp.json().catch(() => null)
    const rows: unknown[] = Array.isArray(body)
      ? body
      : typeof body === 'object' && body !== null && Array.isArray((body as Record<string, unknown>).items)
        ? ((body as Record<string, unknown>).items as unknown[])
        : []
    return rows.map(fromRemote).filter((r): r is SavedResearch => r !== null)
  } catch {
    return []
  }
}

/**
 * Merge backend records (by session) with the local store. Local wins on id
 * collision because it carries the user's bookmark / label edits.
 */
export async function listResearchMerged(): Promise<SavedResearch[]> {
  const local = listResearch()
  const remote = await fetchRemoteResearch()
  const byId = new Map<string, SavedResearch>()
  for (const r of remote) byId.set(r.id, r)
  for (const r of local) byId.set(r.id, r)
  return [...byId.values()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
}

/** Delete remotely and locally. Local deletion always happens. */
export async function deleteResearchRemote(id: string): Promise<boolean> {
  const localDeleted = deleteResearch(id)
  try {
    await fetch(`${API_BASE}${RESEARCH_ENDPOINT}/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { 'X-Session-Id': getSessionId() },
    })
  } catch {
    // Offline / not deployed — the local delete already took effect.
  }
  return localDeleted
}
