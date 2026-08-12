// M12-1 → M36.0 (Grounded AI Exploration Experience with mode system):
// thin, pure data layer that wraps the backend Grounded AI Interpretation
// endpoints (ADR-0003). It ONLY performs the HTTP call — no UI, no judgement
// about `grounded`, no citation rewriting. The backend remains the single
// source of truth for grounding / validation.
// M36.0 adds: mode pass-through, perspectives, evidence, confidence.

// Reuse the same externalized base URL the rest of the frontend uses (M3-002):
// VITE_API_BASE with a localhost dev fallback, so behavior is unchanged.
const API_BASE: string = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

export type AICitation = {
  global_id: string
  kind: string
  label: string
}

/** M36.0: verified evidence entry, additive to raw AICitation. */
export type AIEvidence = {
  global_id: string
  kind: string
  label: string
  status: string
  /** M90.x: backend EvidenceClaim 追加字段（可选，向后兼容）——供 UI 展示证据原文与来源 */
  claim_id?: string
  source_id?: string
  source_title?: string
  source_tier?: string
  /** M90.x: 来源外链（sources.json 补 url 后可用；无 url 时不渲染链接） */
  source_url?: string
  /** 2026-08-11 (PO)：来源完整书目信息（作者/出版社/类型），增强可信度展示 */
  source_creator?: string
  source_publisher?: string
  source_type?: string
  /** 2026-08-11 (PO)：出版年份 + ISBN（图书类来源补 isbn 后显示） */
  source_year?: string | number
  source_isbn?: string
  truth?: {
    confidence?: string
    scholar_consensus?: string
    controversy_level?: string
    interpretation_note?: string
  }
}

/**
 * M74-003 (C1/C2): deterministic next-exploration suggestion. Produced
 * server-side from the ClaimGraph (evidence-bound); the frontend only
 * renders it — it never assembles facts locally (PO Condition 3).
 */
export type AINextExploration = {
  global_id: string
  label: string
  relationship: string
  source_id: string
  claim_ids: string[]
  // --- M74-004-002 (Commit 1 backend): additive Trust fields ---
  // Every value is produced by the backend Planner from validated claims /
  // registered sources — the frontend only renders them (no local join).
  reason?: string
  claim_text?: string
  source_title?: string
  source_tier?: string
  /** 2026-08-11 (PO)：来源完整书目信息（作者/出版社/类型），增强可信度展示 */
  source_creator?: string
  source_publisher?: string
  source_type?: string
}

export type AIConfidence = 'high' | 'medium' | 'low'

export type AIEngine = 'ai' | 'ai_unverified' | 'deterministic' | 'synthetic'

export type AIResponse = {
  answer: string
  citations: AICitation[]
  rejected_citations: AICitation[]
  grounded: boolean
  engine: AIEngine
  question: string
  context_global_ids: string[]
  mode: string
  // Present only on the deterministic fallback (engine === 'deterministic').
  reason?: string
  // --- M36.0 additive fields (optional → backward-compatible) ---
  perspectives?: string[]
  evidence?: AIEvidence[]
  confidence?: AIConfidence
  // --- M74-003 (C2): evidence-bound next exploration (additive) ---
  next_exploration?: AINextExploration[]
}

/** M36.0 prompt modes map to backend PromptService._MODE_DIRECTIVES. */
export const PROMPT_MODES: { key: string; label: string }[] = [
  { key: 'why_important', label: '为何重要' },
  { key: 'why_happened', label: '为何发生' },
  { key: 'historical_impact', label: '历史影响' },
  { key: 'multi_civilization_view', label: '多文明视角' },
  { key: 'timeline_explanation', label: '时间线解读' },
]

export type AIAskOptions = {
  question: string
  context_global_ids: string[]
  /** M36.0: prompt mode key — pure pass-through to backend. */
  mode?: string
  signal?: AbortSignal
  // --- M74-004-002 (PO Freeze Revision approved): additive exploration
  // context. Frontend only supplies raw entity ids / package slug — the
  // backend Planner owns filtering (P2 visited) and recommendation logic. ---
  visited?: string[]
  packageContext?: string
}

// M90.x (backend fence bug 兜底): 后端 ai_gateway 偶发把 AI 模型的
// ```json … ``` markdown fence 原样放进 answer（嵌套 JSON，且可能因输出
// 截断而 fence 不闭合）。前端统一剥 fence 并取嵌套 JSON 的 answer 字段；
// 非该形态则原样返回（不改语义）。
function unwrapFencedAnswer(text: string): string {
  const trimmed = text.trim()
  if (!trimmed.startsWith('```json') && !trimmed.startsWith('```')) return text

  // 剥掉开头 fence 行（```json 或 ```）
  const firstNl = trimmed.indexOf('\n')
  const body = firstNl > 0 ? trimmed.slice(firstNl + 1) : trimmed

  // 情况 A：fence 闭合 → 整体 JSON.parse 取 answer
  const end = trimmed.lastIndexOf('```')
  if (end > 3) {
    const fencedBody = trimmed.slice(firstNl + 1, end).trim()
    try {
      const parsed = JSON.parse(fencedBody) as { answer?: unknown }
      if (parsed && typeof parsed === 'object' && typeof parsed.answer === 'string') {
        return parsed.answer
      }
    } catch {
      // fall through to case B
    }
  }

  // 情况 B：fence 不闭合（AI 输出被截断）→ 正则提取 "answer": "..." 字段
  const m = body.match(/"answer"\s*:\s*"((?:[^"\\]|\\.)*)"/)
  if (m) return m[1].replace(/\\"/g, '"').replace(/\\n/g, '\n')

  return text
}

function postAI(path: string, opts: AIAskOptions): Promise<AIResponse> {
  const body: Record<string, unknown> = {
    question: opts.question,
    context_global_ids: opts.context_global_ids,
    mode: opts.mode ?? 'explain',
  }
  // M74-004-002: additive exploration context — omitted when absent so the
  // request stays byte-identical to M74-003 (backward compatible).
  if (opts.visited && opts.visited.length) body.visited = opts.visited
  if (opts.packageContext) body.package_context = opts.packageContext
  return fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: opts.signal,
  }).then((resp) => {
    if (!resp.ok) {
      throw new Error(`AI request failed (${resp.status})`)
    }
    return resp.json().then((data: AIResponse) => {
      if (data && typeof data.answer === 'string') {
        data.answer = unwrapFencedAnswer(data.answer)
      }
      return data
    })
  })
}

export function explainAI(
  question: string,
  context_global_ids: string[],
  signal?: AbortSignal,
  mode?: string,
): Promise<AIResponse> {
  return postAI('/api/v1/ai/explain', { question, context_global_ids, signal, mode })
}

/**
 * M74-003 (C2): evidence-bound exploration suggestions for a focus entity.
 * Thin semantic wrapper over explainAI — the backend runs the Phase2 pipeline
 * (ClaimGraph → EvidenceSelection → EvidenceValidation) and returns only
 * validated fields (evidence / next_exploration). The frontend renders them
 * as-is; it never assembles facts locally (PO Condition 3).
 */
export type ExploreSuggestionsOptions = {
  /** Abort signal for cancellation. */
  signal?: AbortSignal
  /** M74-004-002: raw entity ids already explored (from the event stream). */
  visited?: string[]
  /** M74-004-002: package slug the user is exploring (optional context). */
  packageContext?: string
}

/**
 * Evidence-bound exploration suggestions for a focus entity.
 *
 * The backend owns ALL recommendation logic (ClaimGraph -> EvidenceSelection
 * -> EvidenceValidation -> Planner). The frontend only supplies raw entity ids
 * and renders the response as-is; it never assembles facts locally
 * (PO Condition 3).
 */
export function exploreSuggestions(
  context_global_ids: string[],
  opts?: ExploreSuggestionsOptions,
): Promise<AIResponse> {
  return postAI('/api/v1/ai/explain', {
    question: '探索建议',
    context_global_ids,
    signal: opts?.signal,
    mode: 'explain',
    visited: opts?.visited,
    packageContext: opts?.packageContext,
  })
}

export function chatAI(
  question: string,
  context_global_ids: string[],
  signal?: AbortSignal,
  mode?: string,
): Promise<AIResponse> {
  return postAI('/api/v1/ai/chat', { question, context_global_ids, signal, mode })
}

// --- M90.x: 固化历史见解（后台基于证据生成，前端只读） ---

export type EntityInsight = {
  global_id: string
  insight: string
  evidence: AIEvidence[]
  engine: string
  updated_at: string
}

/** GET — 前端读取固化历史见解；无固化内容返回 null（前端显占位）。 */
export function getEntityInsight(globalId: string): Promise<EntityInsight | null> {
  return fetch(`${API_BASE}/api/v1/insights/${encodeURIComponent(globalId)}`).then((resp) => {
    if (resp.status === 404) return null
    if (!resp.ok) throw new Error(`insight fetch failed (${resp.status})`)
    return resp.json() as Promise<EntityInsight>
  })
}

/** POST — 后台触发：AI 基于证据生成并固化历史见解。 */
export function regenerateEntityInsight(globalId: string): Promise<EntityInsight> {
  return fetch(`${API_BASE}/api/v1/insights/${encodeURIComponent(globalId)}/generate`, {
    method: 'POST',
  }).then((resp) => {
    if (!resp.ok) throw new Error(`insight generate failed (${resp.status})`)
    return resp.json() as Promise<EntityInsight>
  })
}

/** PUT — 后台人工编辑历史见解。 */
export function updateEntityInsight(globalId: string, insight: string): Promise<EntityInsight> {
  return fetch(`${API_BASE}/api/v1/insights/${encodeURIComponent(globalId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ insight }),
  }).then((resp) => {
    if (!resp.ok) throw new Error(`insight update failed (${resp.status})`)
    return resp.json() as Promise<EntityInsight>
  })
}
