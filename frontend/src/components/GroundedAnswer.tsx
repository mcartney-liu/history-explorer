import type { ReactNode } from 'react'
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

// 2026-08-11 (PO): when the backend returns a STRUCTURED synthesis answer
// (cross-dimensional analysis), render it as a readable view instead of a raw
// JSON/text blob. The backend serializes such answers via json.dumps, so they
// arrive as a JSON string; we only treat it as synthesis when the expected
// keys are present — any other JSON stays as a plain paragraph.
//
// Supports both English keys (cross_dimensional_theme / dimensional_relations /
// conclusion) and Chinese keys returned by the synthesis prompt
// (跨维度主题 / 维度关联 / 结论), plus markdown code-block wrapping.
function tryRenderSynthesis(raw: string): ReactNode | null {
  let text = raw.trim()
  // Strip markdown fenced code block if the LLM wrapped JSON in ```json ... ```
  if (text.startsWith('```')) {
    text = text.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '').trim()
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
  const obj = parsed as Record<string, unknown>

  const theme =
    (typeof obj.cross_dimensional_theme === 'string' && obj.cross_dimensional_theme) ||
    (typeof obj.跨维度主题 === 'string' && obj.跨维度主题) ||
    null
  const relations =
    (obj.dimensional_relations != null && typeof obj.dimensional_relations === 'object' &&
      !Array.isArray(obj.dimensional_relations) && obj.dimensional_relations) ||
    (obj.维度关联 != null && typeof obj.维度关联 === 'object' && !Array.isArray(obj.维度关联) &&
      obj.维度关联) ||
    null
  const conclusion =
    (typeof obj.conclusion === 'string' && obj.conclusion) ||
    (typeof obj.结论 === 'string' && obj.结论) ||
    null

  if (!theme && !relations && !conclusion) return null

  return (
    <div className="ga-synthesis">
      {theme && (
        <section className="ga-synth-section">
          <h5 className="ga-synth-title">跨维度主题</h5>
          <p className="ga-synth-text">{theme}</p>
        </section>
      )}
      {relations && (
        <section className="ga-synth-section">
          <h5 className="ga-synth-title">维度关联</h5>
          <div className="ga-synth-relations">
            {Object.entries(relations as Record<string, unknown>).map(
              ([k, v]) => (
                <div key={k} className="ga-synth-rel">
                  <span className="ga-synth-rel-key">{k}</span>
                  <span className="ga-synth-rel-val">
                    {typeof v === 'string' ? v : JSON.stringify(v)}
                  </span>
                </div>
              ),
            )}
          </div>
        </section>
      )}
      {conclusion && (
        <section className="ga-synth-section">
          <h5 className="ga-synth-title">结论</h5>
          <p className="ga-synth-text">{conclusion}</p>
        </section>
      )}
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

      {tryRenderSynthesis(response.answer) ?? (
        <p className="ga-answer">{response.answer}</p>
      )}

      {/* M36.0: show server-verified evidence block */}
      <Evidence items={response.evidence} />

      <p className="ga-citation-summary">
        事实引用 {citations.length} 条
        {rejected.length > 0 ? `，未通过验证 ${rejected.length} 条` : ''}
      </p>
    </div>
  )
}
