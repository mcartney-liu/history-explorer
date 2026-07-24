// M12-1 (Grounded AI Exploration Experience): thin, pure data layer that wraps
// the backend Grounded AI Interpretation endpoints (ADR-0003). It ONLY performs
// the HTTP call — no UI, no judgement about `grounded`, no citation rewriting.
// The backend remains the single source of truth for grounding / validation.

// Reuse the same externalized base URL the rest of the frontend uses (M3-002):
// VITE_API_BASE with a localhost dev fallback, so behavior is unchanged.
const API_BASE: string = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

export type AICitation = {
  global_id: string
  kind: string
  label: string
}

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
}

export type AIAskOptions = {
  question: string
  context_global_ids: string[]
  signal?: AbortSignal
}

function postAI(path: string, opts: AIAskOptions): Promise<AIResponse> {
  const body = JSON.stringify({
    question: opts.question,
    context_global_ids: opts.context_global_ids,
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
): Promise<AIResponse> {
  return postAI('/api/v1/ai/explain', { question, context_global_ids, signal })
}

export function chatAI(
  question: string,
  context_global_ids: string[],
  signal?: AbortSignal,
): Promise<AIResponse> {
  return postAI('/api/v1/ai/chat', { question, context_global_ids, signal })
}
