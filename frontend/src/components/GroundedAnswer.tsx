import type { AIResponse, AIEngine } from '../data/aiClient'

type GroundedAnswerProps = {
  response: AIResponse
}

// Each engine state gets a distinct, honest label. None of these claim the
// answer is a reliable, self-evident fact — that is the ADR-0003 boundary.
const ENGINE_LABEL: Record<AIEngine, string> = {
  ai: 'AI 解读（已通过事实溯源验证）',
  ai_unverified: 'AI 解读（未通过事实溯源验证）',
  deterministic: '确定性回退（AI 不可用）',
}

// Pure presentational component: given a fully-grounded backend response, show
// the answer, the engine state, and the verification verdict. It never decides
// truthiness — it only renders what the backend asserted.
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
      </div>

      {!grounded && (
        <p className="ga-warning" role="note">
          {response.engine === 'deterministic'
            ? 'AI 解读层当前不可用，以下为确定性回退说明，并非 AI 生成的解读。'
            : '以下回答未完全通过事实溯源验证，可能包含未被知识图谱佐证的表述，请谨慎参考。'}
        </p>
      )}

      <p className="ga-answer">{response.answer}</p>

      <p className="ga-citation-summary">
        事实引用 {citations.length} 条
        {rejected.length > 0 ? `，未通过验证 ${rejected.length} 条` : ''}
      </p>
    </div>
  )
}
