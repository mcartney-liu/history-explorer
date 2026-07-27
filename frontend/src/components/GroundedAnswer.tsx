import type { AIResponse, AIEngine, AIConfidence } from '../data/aiClient'

type GroundedAnswerProps = {
  response: AIResponse
}

// Each engine state gets a distinct, honest label. None of these claim the
// answer is a reliable, self-evident fact — that is the ADR-0003 boundary.
// Engine labels describe PROVENANCE only — they never assert verification.
// The verification verdict lives in the grounded badge, kept strictly separate
// so an `ai` answer that failed validation is never relabeled as "verified".
const ENGINE_LABEL: Record<AIEngine, string> = {
  ai: 'AI 解读',
  ai_unverified: 'AI 解读（引用未通过验证）',
  deterministic: '确定性回退（AI 不可用）',
}

// M36.0 server-computed confidence labels — never trust LLM self-rating.
const CONFIDENCE_LABEL: Record<AIConfidence, string> = {
  high: '置信度：高',
  medium: '置信度：中',
  low: '置信度：低',
}

// M36.0 additive: render perspectives (alternative interpretations / caveats)
// from the LLM response. Guarded: only when non-empty.
function Perspectives({ items }: { items: string[] }) {
  if (!items || items.length === 0) return null
  return (
    <div className="ga-perspectives">
      <h4 className="ga-perspectives-title">多角度解读</h4>
      <ul className="ga-perspectives-list">
        {items.map((p, i) => (
          <li key={i} className="ga-perspective-item">{p}</li>
        ))}
      </ul>
    </div>
  )
}

// M36.0 additive: render verified evidence entries with status label.
function Evidence({ items }: { items: AIResponse['evidence'] }) {
  if (!items || items.length === 0) return null
  return (
    <div className="ga-evidence">
      <h4 className="ga-evidence-title">已验证的事实证据</h4>
      <ul className="ga-evidence-list">
        {items.map((ev, i) => (
          <li key={i} className="ga-evidence-item">
            <span className={`ga-evidence-kind ga-ev-kind-${ev.kind}`}>
              {ev.kind}
            </span>
            <span className="ga-evidence-label">{ev.label}</span>
            <span className="ga-evidence-status">{ev.status}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// Pure presentational component: given a fully-grounded backend response, show
// the answer, the engine state, the verification verdict, and (M36.0) the
// confidence, perspectives, and verified evidence. It never decides truthiness
// — it only renders what the backend asserted.
export default function GroundedAnswer({ response }: GroundedAnswerProps) {
  const citations = response.citations ?? []
  const rejected = response.rejected_citations ?? []
  const grounded = Boolean(response.grounded)

  return (
    <div className="grounded-answer">
      <div className="ga-status-row">
        <span className={`ga-engine-badge ga-engine-${response.engine}`}>
          {ENGINE_LABEL[response.engine] ?? response.engine}
        </span>
        <span
          className={`ga-grounded-badge ${grounded ? 'ga-grounded-true' : 'ga-grounded-false'}`}
        >
          {grounded ? '已通过事实溯源验证' : '未完全通过事实溯源验证'}
        </span>
        {/* M36.0 confidence badge — server-computed, never LLM-given */}
        {response.confidence && (
          <span className={`ga-confidence-badge ga-conf-${response.confidence}`}>
            {CONFIDENCE_LABEL[response.confidence] ?? response.confidence}
          </span>
        )}
      </div>

      {!grounded && (
        <p className="ga-warning" role="note">
          {response.engine === 'deterministic'
            ? 'AI 解读层当前不可用，以下为确定性回退说明，并非 AI 生成的解读。'
            : '以下回答未完全通过事实溯源验证，可能包含未被知识图谱佐证的表述，请谨慎参考。'}
        </p>
      )}

      {/* M36.0: show LLM-provided alternative perspectives before the answer */}
      <Perspectives items={response.perspectives ?? []} />

      <p className="ga-answer">{response.answer}</p>

      {/* M36.0: show server-verified evidence block */}
      <Evidence items={response.evidence} />

      <p className="ga-citation-summary">
        事实引用 {citations.length} 条
        {rejected.length > 0 ? `，未通过验证 ${rejected.length} 条` : ''}
      </p>
    </div>
  )
}
