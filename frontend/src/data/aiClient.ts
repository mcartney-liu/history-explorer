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
}

export type AIConfidence = 'high' | 'medium' | 'low'

export type AIEngine = 'ai' | 'ai_unverified' | 'deterministic'

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
}

function postAI(path: string, opts: AIAskOptions): Promise<AIResponse> {
  const body = JSON.stringify({
    question: opts.question,
    context_global_ids: opts.context_global_ids,
    mode: opts.mode ?? 'explain',
  })
  return fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    signal: opts.signal,
  }).then((resp) => {
    if (!resp.ok) {
      throw new Error(`AI request failed (${resp.status})`)
    }
    return resp.json() as Promise<AIResponse>
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
export function exploreSuggestions(
  context_global_ids: string[],
  signal?: AbortSignal,
): Promise<AIResponse> {
  return postAI('/api/v1/ai/explain', {
    question: '探索建议',
    context_global_ids,
    signal,
    mode: 'explain',
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
