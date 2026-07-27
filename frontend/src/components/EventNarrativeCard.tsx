import { useState } from 'react'
import { explainAI, type AIResponse } from '../data/aiClient'
import GroundedAnswer from './GroundedAnswer'
import CitationList from './CitationList'
import type { EntityRelationship } from './EntityPage'

export type EventNarrativeCardProps = {
  /** Entity global_id for AI grounding context. */
  entityGlobalId: string
  /** Entity display name for narrative prompts. */
  entityName: string
  /** Relationships for narrative context hints. */
  relationships: EntityRelationship[]
  /** Navigate to related entities. */
  onEntityClick?: (id: string) => void
}

/** Pre-set narrative questions keyed by AI prompt mode. */
const NARRATIVE_PROMPTS: { mode: string; label: string; question: string }[] = [
  {
    mode: 'historical_impact',
    label: '历史影响',
    question: '这个事件如何影响历史进程和后世文明？',
  },
  {
    mode: 'why_happened',
    label: '前因后果',
    question: '导致这个事件发生的关键原因是什么？后续又引发了什么？',
  },
  {
    mode: 'multi_civilization_view',
    label: '多文明视角',
    question: '不同文明如何理解这个事件？它如何跨越文明边界传播影响？',
  },
]

type NarrativeStatus = 'idle' | 'loading' | 'success' | 'error'

export function EventNarrativeCardView({
  entityGlobalId,
  entityName,
  relationships,
  onEntityClick,
  // Stateful props for testability
  status = 'idle' as NarrativeStatus,
  response = null as AIResponse | null,
  error = '',
  activeMode = 'historical_impact' as string,
  onAsk = (_question: string, _mode: string) => {},
}: EventNarrativeCardProps & {
  status?: NarrativeStatus
  response?: AIResponse | null
  error?: string
  activeMode?: string
  onAsk?: (question: string, mode: string) => void
}) {
  const causeCount = relationships.filter(
    (r) => r.type === 'caused' || r.type === 'influenced',
  ).length
  const impactCount = relationships.filter(
    (r) =>
      r.direction === 'outgoing' &&
      r.other.type !== 'Event' &&
      ['influenced', 'caused', 'spread', 'related_to'].includes(r.type),
  ).length

  return (
    <section className="event-narrative-card" aria-label="AI 历史叙事">
      <h3 className="enc-title">历史叙事</h3>

      <div className="enc-context">
        {causeCount > 0 && (
          <span className="enc-badge">
            {causeCount} 条因果关联
          </span>
        )}
        {impactCount > 0 && (
          <span className="enc-badge">
            {impactCount} 个影响实体
          </span>
        )}
      </div>

      <p className="enc-hint">
        AI 基于知识图谱生成 {entityName} 的历史叙事。选择一个角度开始探索。
      </p>

      <div className="enc-prompts">
        {NARRATIVE_PROMPTS.map((np) => (
          <button
            key={np.mode}
            type="button"
            className={`enc-prompt-btn${activeMode === np.mode ? ' enc-prompt-btn--active' : ''}`}
            disabled={status === 'loading'}
            onClick={() => onAsk(np.question, np.mode)}
          >
            {np.label}
          </button>
        ))}
      </div>

      {status === 'loading' && (
        <p className="enc-loading" role="status">
          AI 正在生成历史叙事…
        </p>
      )}

      {status === 'error' && (
        <p className="enc-error" role="alert">
          AI 叙事生成失败（{error || '网络错误'}）。你可以继续浏览确定性知识图谱。
        </p>
      )}

      {status === 'success' && response && (
        <div className="enc-result">
          <GroundedAnswer response={response} />
          <CitationList
            citations={response.citations}
            rejected_citations={response.rejected_citations}
            onCitationClick={
              onEntityClick ? (gid: string) => onEntityClick(gid) : undefined
            }
          />
        </div>
      )}

      {status === 'idle' && (
        <p className="enc-idle-hint">点击上方按钮，AI 将生成带事实溯源的历史叙事。</p>
      )}
    </section>
  )
}

/** Container component — owns request lifecycle, delegates rendering to view. */
export default function EventNarrativeCard(props: EventNarrativeCardProps) {
  const [status, setStatus] = useState<NarrativeStatus>('idle')
  const [response, setResponse] = useState<AIResponse | null>(null)
  const [error, setError] = useState('')
  const [activeMode, setActiveMode] = useState('historical_impact')

  async function onAsk(question: string, mode: string) {
    setStatus('loading')
    setError('')
    setResponse(null)
    setActiveMode(mode)
    try {
      const res = await explainAI(question, [props.entityGlobalId], undefined, mode)
      setResponse(res)
      setStatus('success')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI 请求失败')
      setStatus('error')
    }
  }

  return (
    <EventNarrativeCardView
      {...props}
      status={status}
      response={response}
      error={error}
      activeMode={activeMode}
      onAsk={onAsk}
    />
  )
}
