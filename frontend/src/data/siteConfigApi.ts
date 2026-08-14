// ============================================================
// Site Configuration API client (ADR-0021 sibling)
//
// Runtime-tunable product switches — feature flags, landing-page topic
// ordering, entity-page section visibility, exploration starters. This
// module is the ONLY place the frontend talks to that layer.
//
// Design rule (mirror of contentApi): three-tier fallback, never a hard
// dependency. With the backend down every surface renders exactly as it
// did before this layer existed. Every function here fails soft: no throw
// reaches the render path.
//
// Compiled defaults (tier ②) are mirrored from
// `backend/app/content/site_config_store.DEFAULT_*`. They MUST stay in
// sync so the offline fallback equals factory state.
// ============================================================

import { API_BASE } from '../config/api'

export interface EntitySectionValue {
  id: string
  visible: boolean
}

export interface SiteConfigDocument {
  version: number
  updated_at: string | null
  feature_flags: Record<string, boolean>
  topic_ordering: string[]
  entity_sections: EntitySectionValue[]
  exploration_starters: string[]
}

/** Compiled-in feature flag defaults (tier ②). MUST match the backend registry. */
export const DEFAULT_FEATURE_FLAGS: Record<string, boolean> = {
  related_entities: true,
  journey_trail: true,
}

/** Compiled-in "featured" topic order (tier ②). MUST match DEFAULT_TOPIC_ORDERING. */
export const DEFAULT_TOPIC_ORDERING: readonly string[] = [
  'roman_empire',
  'greek_philosophy',
  'persian_empire',
  'ancient_india',
]

/** Compiled-in exploration starters (tier ②). MUST match DEFAULT_STARTERS. */
export const DEFAULT_STARTERS: readonly string[] = [
  '罗马帝国的兴衰',
  '希腊哲学的源头',
  '波斯帝国的扩张',
  '古印度的文明脉络',
]

/** Field limits, mirrored from the backend so the admin console counts match. */
export const SLUG_LIMIT = 64
export const STARTER_LIMIT = 60
export const MAX_TOPICS = 12
export const MAX_STARTERS = 8

export interface WriteResult<T> {
  ok: boolean
  data?: T
  error?: string
}

async function readDocument(path: string, signal?: AbortSignal): Promise<SiteConfigDocument | null> {
  try {
    const response = await fetch(`${API_BASE}${path}`, { signal })
    if (!response.ok) return null
    const body = (await response.json()) as SiteConfigDocument
    if (!body || typeof body !== 'object') return null
    if (!body.feature_flags || !Array.isArray(body.topic_ordering)) return null
    return body
  } catch {
    return null
  }
}

/** Read product switches. Returns null on ANY failure. */
export async function fetchSiteConfig(signal?: AbortSignal): Promise<SiteConfigDocument | null> {
  return readDocument('/api/v1/site-config', signal)
}

/** Read factory defaults (tier ② for the admin "restore" affordance). */
export async function fetchSiteConfigDefaults(signal?: AbortSignal): Promise<SiteConfigDocument | null> {
  return readDocument('/api/v1/site-config/defaults', signal)
}

/** Whether this backend accepts config edits (drives the admin UI banner). */
export async function fetchSiteConfigAdminEnabled(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/api/v1/site-config/status`)
    if (!response.ok) return false
    const body = (await response.json()) as { admin_enabled?: boolean }
    return body.admin_enabled === true
  } catch {
    return false
  }
}

export async function saveSiteConfig(
  payload: Partial<SiteConfigDocument>,
): Promise<WriteResult<SiteConfigDocument>> {
  try {
    const response = await fetch(`${API_BASE}/api/v1/site-config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!response.ok) return { ok: false, error: await readError(response) }
    return { ok: true, data: (await response.json()) as SiteConfigDocument }
  } catch (error) {
    return { ok: false, error: describeNetworkError(error) }
  }
}

export async function resetSiteConfig(): Promise<WriteResult<SiteConfigDocument>> {
  try {
    const response = await fetch(`${API_BASE}/api/v1/site-config/reset`, { method: 'POST' })
    if (!response.ok) return { ok: false, error: await readError(response) }
    return { ok: true, data: (await response.json()) as SiteConfigDocument }
  } catch (error) {
    return { ok: false, error: describeNetworkError(error) }
  }
}

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: string }
    if (typeof body.detail === 'string' && body.detail) return body.detail
  } catch {
    /* fall through */
  }
  return `请求失败（HTTP ${response.status}）`
}

function describeNetworkError(error: unknown): string {
  if (error instanceof Error && error.name === 'AbortError') return '请求已取消'
  return '无法连接后端服务，请确认后端已启动'
}
