// ============================================================
// Content Configuration API client (ADR-0021)
//
// Display copy + artwork across the product live as runtime data so
// the product owner can edit them without a code change. This module
// is the ONLY place the frontend talks to that layer.
//
// Registry-driven (ADR-0021 R2)
// -----------------------------
// Editable surfaces ("slots") are declared once in
// `backend/app/content/content_store.CONTENT_SLOTS`. The document this
// client fetches carries each slot's METADATA (module, label, where it
// shows up, whether it takes artwork or a bullet list) alongside its
// values — so the admin console renders itself from the payload and a
// newly editable card needs no frontend change here at all.
//
// A slot id is `<module>.<slot>`, e.g. `landing.story`.
//
// Design rule (ADR-0021 D5) — three-tier fallback, never a hard
// dependency:
//   ① backend value          (GET /api/v1/content)
//   ② compiled-in default    (each surface keeps its own shipped copy)
//   ③ CSS placeholder        (img onError hides, card gradient shows)
//
// With the backend down every surface must render exactly as it did
// before this layer existed. Every function here therefore fails soft:
// no throw reaches the render path.
// ============================================================

import { API_BASE } from '../config/api'

/** Modules the registry currently groups slots into. */
export type SlotModule = 'landing' | 'entity_tabs' | 'exploration_flow' | 'ai_capabilities' | 'site'

/** The editable half of a slot — what an author actually changes. */
export interface CapabilityCard {
  id: string
  title: string
  desc: string
  /** Stored media filename, or null to use the built-in artwork. */
  image: string | null
  /** Cover focal point as 'x% y%' for object-position; null = center. */
  image_focus?: string | null
}

/**
 * A slot as the backend describes it: editable values + registry metadata.
 *
 * The metadata is READ-ONLY for the client. It is echoed back on save purely
 * so the admin console can keep working with whole objects; the server drops
 * everything but the editable fields.
 */
export interface ContentCard extends CapabilityCard {
  module: string
  module_label: string
  /** Human name of this slot, e.g. "能力卡 1 · 历史叙事". */
  label: string
  /** Where the copy surfaces in the product — shown as an admin hint. */
  where: string
  theme: string | null
  supports_image: boolean
  supports_items: boolean
  /** Whether this slot exposes trilingual title/summary overrides in the console. */
  supports_text_i18n?: boolean
  /** Trilingual title override (zh/en/ja); null/undefined = use data source. */
  title_i18n?: Record<string, string> | null
  /** Trilingual summary override (zh/en/ja); null/undefined = use data source. */
  summary_i18n?: Record<string, string> | null
  /** Whether this slot exposes a guided-questions list in the console. */
  supports_guided_questions?: boolean
  /** Guided exploration questions (featured topics); null/undefined = use data source. */
  guided_questions?: string[] | null
  /** What the bullet list is called on this slot ("推荐动作" / "示例问题"). */
  items_label: string
  items: string[]
}

export interface ContentModule {
  module: string
  label: string
  card_ids: string[]
}

export interface ContentDocument {
  version: number
  updated_at: string | null
  modules: ContentModule[]
  cards: ContentCard[]
}

/**
 * Landing-card defaults — tier ② for `ProductIntro`.
 *
 * Only the landing module is mirrored here: it is the one surface whose copy
 * has no other home in the source tree. Every other module keeps its shipped
 * copy in the component that already owned it (`EntityTabGuidance`,
 * `AICapabilities`), so this layer never becomes a
 * second source of truth for text that already exists.
 *
 * MUST stay in sync with the `landing.*` entries of `CONTENT_SLOTS`.
 */
export const DEFAULT_CARDS: readonly CapabilityCard[] = [
  {
    id: 'landing.story',
    title: '历史叙事',
    desc: '把人、事件、文明串成你能读懂的故事线，看清一件事为何发生、如何走到今天。叙事由真实史料手写，不靠 AI 编造。',
    image: null,
  },
  {
    id: 'landing.explore',
    title: '关系探索',
    desc: '看清人物、文明之间如何相连——谁影响了谁、什么导致了什么。每一层关系都附上证据，让你理解而非盲信。',
    image: null,
  },
  {
    id: 'landing.research',
    title: '深度研究',
    desc: '从政治、军事、经济、文化多个角度，把一个疑问拆透；还能把几个对象放一起比，帮你形成自己的判断。',
    image: null,
  },
  {
    id: 'landing.chat',
    title: 'AI 历史学家',
    desc: '像身边随时有位历史学者：你用大白话说疑问，它用史料与知识图谱作答，并讲清依据在哪、可信度有几分。',
    image: null,
  },
] as const

/**
 * The trailing segment of a slot id — `landing.story` -> `story`.
 *
 * Asset filenames and CSS class names were minted before slots were namespaced
 * and still use the bare key, so the dot never reaches a selector (`.a.b` would
 * parse as two classes).
 */
export function slotKey(slotId: string): string {
  const dot = slotId.lastIndexOf('.')
  return dot === -1 ? slotId : slotId.slice(dot + 1)
}

/** Card keys paired with the visual theme the stylesheet expects. */
export const CARD_THEMES: Record<string, 'parchment' | 'network' | 'ledger' | 'cosmos'> = {
  story: 'parchment',
  explore: 'network',
  research: 'ledger',
  chat: 'cosmos',
}

/** Theme for a card, accepting either a bare key or a namespaced slot id. */
export function cardTheme(slotId: string): 'parchment' | 'network' | 'ledger' | 'cosmos' {
  return CARD_THEMES[slotKey(slotId)] ?? 'parchment'
}

/**
 * Built-in artwork path — the drop-in convention that predates this layer.
 *
 * Most cards live at `assets/cards/card-<key>.jpg`, but the explore-pack,
 * explore-topic and research-dimension slots keep their artwork in dedicated
 * folders (`assets/packs`, `assets/topics`, `assets/research`) that the
 * registry layer was laid on top of. Route those modules to their real
 * location so the console preview shows the same artwork the front-end cards
 * render (the preview then falls back png/jpg/jpeg just like the cards do).
 */
export function defaultImageSrc(slotId: string): string {
  const key = slotKey(slotId)
  if (slotId.startsWith('explore_packs.')) {
    return `${import.meta.env.BASE_URL}assets/packs/${key}.webp`
  }
  if (slotId.startsWith('explore_topics.')) {
    return `${import.meta.env.BASE_URL}assets/topics/${key}.webp`
  }
  if (slotId.startsWith('research_dims.')) {
    return `${import.meta.env.BASE_URL}assets/research/${key}.webp`
  }
  // 实体身份图（PO 2026-08-15 B 类）：后台未上传自定义图时，
  // 回退到前端 static 的 184 张静态肖像 /entity-logos/<global_id>.png
  // （global_id 冒号转下划线，与 EntityHero 的 entityImageUrl 同源）。
  if (slotId.startsWith('entity_identity.')) {
    const gid = slotId.slice('entity_identity.'.length)
    const fn = gid.replace(/:/g, '_')
    return `${import.meta.env.BASE_URL}entity-logos/${fn}.png`
  }
  return `${import.meta.env.BASE_URL}assets/cards/card-${key}.jpg`
}

/** URL for artwork uploaded through the admin console. */
export function mediaUrl(filename: string): string {
  return `${API_BASE}/api/v1/content/media/${encodeURIComponent(filename)}`
}

/** Resolve a card to its artwork URL, honouring tiers ① then ②. */
export function cardImageSrc(card: CapabilityCard): string {
  return card.image ? mediaUrl(card.image) : defaultImageSrc(card.id)
}

/**
 * Read display content.
 *
 * Returns `null` on ANY failure (backend down, network error, bad shape) so
 * callers can fall back to their compiled-in defaults without a try/catch at
 * every site.
 */
export async function fetchContent(signal?: AbortSignal): Promise<ContentDocument | null> {
  return readDocument('/api/v1/content', signal)
}

/**
 * Read the factory defaults.
 *
 * `fetchContent` returns values already merged with the defaults, so it cannot
 * answer "has this slot been edited?". The console fetches both and diffs them
 * to decide whether to offer a per-card restore.
 */
export async function fetchContentDefaults(signal?: AbortSignal): Promise<ContentDocument | null> {
  return readDocument('/api/v1/content/defaults', signal)
}

async function readDocument(path: string, signal?: AbortSignal): Promise<ContentDocument | null> {
  try {
    const response = await fetch(`${API_BASE}${path}`, { signal })
    if (!response.ok) return null
    const body = (await response.json()) as ContentDocument
    if (!body || !Array.isArray(body.cards) || body.cards.length === 0) return null
    if (!Array.isArray(body.modules)) body.modules = []
    return body
  } catch {
    return null
  }
}

/** The cards of one module, in registry order. */
export function cardsOfModule(document: ContentDocument | null, module: SlotModule): ContentCard[] {
  if (!document) return []
  return document.cards.filter((card) => card.module === module)
}

/** Whether this backend accepts edits (drives the admin console banner). */
export async function fetchAdminEnabled(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/api/v1/content/status`)
    if (!response.ok) return false
    const body = (await response.json()) as { admin_enabled?: boolean }
    return body.admin_enabled === true
  } catch {
    return false
  }
}

/** Shared shape for write results — admin UI renders the message verbatim. */
export interface WriteResult<T> {
  ok: boolean
  data?: T
  error?: string
}

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: string }
    if (typeof body.detail === 'string' && body.detail) return body.detail
  } catch {
    /* fall through to the status text */
  }
  return `请求失败（HTTP ${response.status}）`
}

export async function saveContent(cards: ContentCard[]): Promise<WriteResult<ContentDocument>> {
  try {
    const response = await fetch(`${API_BASE}/api/v1/content`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cards }),
    })
    if (!response.ok) return { ok: false, error: await readError(response) }
    return { ok: true, data: (await response.json()) as ContentDocument }
  } catch (error) {
    return { ok: false, error: describeNetworkError(error) }
  }
}

export async function resetContent(): Promise<WriteResult<ContentDocument>> {
  try {
    const response = await fetch(`${API_BASE}/api/v1/content/reset`, { method: 'POST' })
    if (!response.ok) return { ok: false, error: await readError(response) }
    return { ok: true, data: (await response.json()) as ContentDocument }
  } catch (error) {
    return { ok: false, error: describeNetworkError(error) }
  }
}

export interface UploadedMedia {
  filename: string
  size_bytes: number
  url: string
}

/**
 * Upload artwork as base64 over plain JSON.
 *
 * Multipart would require `python-multipart` on the backend — a new dependency
 * the freeze baseline forbids (ADR-0021 D4). FileReader + base64 keeps the
 * dependency count at zero on both sides.
 */
export async function uploadMedia(file: File): Promise<WriteResult<UploadedMedia>> {
  let encoded: string
  try {
    encoded = await readAsBase64(file)
  } catch {
    return { ok: false, error: '读取文件失败，请重试' }
  }

  try {
    const response = await fetch(`${API_BASE}/api/v1/content/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: file.name, data: encoded }),
    })
    if (!response.ok) return { ok: false, error: await readError(response) }
    return { ok: true, data: (await response.json()) as UploadedMedia }
  } catch (error) {
    return { ok: false, error: describeNetworkError(error) }
  }
}

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => {
      const result = reader.result
      if (typeof result !== 'string') {
        reject(new Error('unexpected FileReader result'))
        return
      }
      resolve(result) // data: URL — the backend strips the prefix
    }
    reader.readAsDataURL(file)
  })
}

function describeNetworkError(error: unknown): string {
  if (error instanceof Error && error.name === 'AbortError') return '请求已取消'
  return '无法连接后端服务，请确认后端已启动'
}

/** Client-side guard mirroring the server's rules — fail fast, clearer message. */
export const ACCEPTED_IMAGE_TYPES = '.jpg,.jpeg,.png,.webp'
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024

/** Field limits, mirrored from the server so the counter matches the truncation. */
export const TITLE_LIMIT = 80
export const DESC_LIMIT = 600
export const ITEM_LIMIT = 120
export const MAX_ITEMS = 12

export function validateImageFile(file: File): string | null {
  const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
  if (!['.jpg', '.jpeg', '.png', '.webp'].includes(extension)) {
    return '仅支持 JPG / PNG / WEBP 格式'
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return `图片不能超过 ${MAX_IMAGE_BYTES / 1024 / 1024} MB（当前 ${(file.size / 1024 / 1024).toFixed(1)} MB）`
  }
  return null
}
