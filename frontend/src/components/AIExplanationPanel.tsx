import { useEffect, useRef, useState } from 'react'
import { explainAI, chatAI, type AIResponse } from '../data/aiClient'
import GroundedAnswer from './GroundedAnswer'
import CitationList from './CitationList'

export type AIExplanationStatus = 'idle' | 'loading' | 'success' | 'error'

export type AIExplanationPanelProps = {
  // The grounding context: global ids the backend will verify citations
  // against. Supplied by the host (App) from the existing exploration graph.
  contextGlobalIds: string[]
  mode?: 'explain' | 'chat'
  onCitationClick?: (global_id: string) => void
}

// Container: owns the request lifecycle only (status + abort). All rendering is
// delegated to the presentational AIExplanationView so it can be tested without
// a DOM. No global state — the status lives in this component instance alone.
export default function AIExplanationPanel({
  contextGlobalIds,
  mode = 'explain',
  onCitationClick,
}: AIExplanationPanelProps) {
  const [question, setQuestion] = useState('')
  const [status, setStatus] = useState<AIExplanationStatus>('idle')
  const [response, setResponse] = useState<AIResponse | null>(null)
  const [error, setError] = useState('')
  const controllerRef = useRef<AbortController | null>(null)

  // Abort any in-flight request when the panel unmounts.
  useEffect(() => {
    return () => controllerRef.current?.abort()
  }, [])

  async function ask(q: string) {
    const trimmed = (q ?? '').trim()
    if (!trimmed) return
    // Race protection: cancel any previous request before starting a new one.
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    setStatus('loading')
    setError('')
    setResponse(null)
    try {
      const call = mode === 'chat' ? chatAI : explainAI
      const res = await call(trimmed, contextGlobalIds, controller.signal)
      setResponse(res)
      setStatus('success')
    } catch (e) {
      if (controller.signal.aborted) return
      setError(e instanceof Error ? e.message : 'AI 请求失败')
      setStatus('error')
    }
  }

  return (
    <AIExplanationView
      status={status}
      question={question}
      response={response}
      error={error}
      contextCount={contextGlobalIds.length}
      onQuestionChange={setQuestion}
      onAsk={ask}
      onCitationClick={onCitationClick}
    />
  )
}

export type AIExplanationViewProps = {
  status: AIExplanationStatus
  question: string
  response: AIResponse | null
  error: string
  contextCount: number
  onQuestionChange: (value: string) => void
  onAsk: (question: string) => void
  onCitationClick?: (global_id: string) => void
}

// Presentational view — drives every visual state (idle / loading / error /
// success) purely from props, so tests can render any state without a click.
export function AIExplanationView({
  status,
  question,
  response,
  error,
  contextCount,
  onQuestionChange,
  onAsk,
  onCitationClick,
}: AIExplanationViewProps) {
  return (
    <section className="ai-explanation" aria-label="AI 事实溯源解读">
      <h3 className="ae-title">AI 事实溯源解读</h3>
      <p className="ae-context-note">
        基于当前探索上下文（{contextCount} 个实体）提供可被知识图谱验证的解读。
      </p>
      <div className="ae-input-row">
        <input
          className="ae-input"
          type="text"
          value={question}
          placeholder="向 AI 提问，例如：这个文明为何衰落？"
          aria-label="向 AI 提问"
          disabled={status === 'loading'}
          onChange={(e) => onQuestionChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onAsk(question)
          }}
        />
        <button
          className="ae-ask"
          type="button"
          disabled={status === 'loading' || !question.trim()}
          onClick={() => onAsk(question)}
        >
          {status === 'loading' ? '解读中…' : '问 AI'}
        </button>
      </div>

      {status === 'idle' && (
        <p className="ae-hint">输入问题后点击「问 AI」，获取带事实引用与溯源验证的解读。</p>
      )}

      {status === 'loading' && (
        <p className="ae-loading" role="status">
          正在生成带事实溯源的解读…
        </p>
      )}

      {status === 'error' && (
        <p className="ae-error" role="alert">
          无法获取 AI 解读（{error || '网络错误'}）。你可以继续浏览确定性知识图谱。
        </p>
      )}

      {status === 'success' && response && (
        <div className="ae-result">
          <GroundedAnswer response={response} />
          <CitationList
            citations={response.citations}
            rejected_citations={response.rejected_citations}
            onCitationClick={onCitationClick}
          />
        </div>
      )}
    </section>
  )
}
