import { useState, useRef } from 'react'
import { explainAI, type AIResponse } from '../data/aiClient'
import { recordEvent } from '../data/UserBehaviorEvent'
import GroundedAnswer from './GroundedAnswer'
import CitationList from './CitationList'
import type { EntityRelationship } from './EntityPage'

export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
  citations?: AIResponse['citations']
  rejected_citations?: AIResponse['rejected_citations']
  grounded?: boolean
  engine?: AIResponse['engine']
  perspectives?: string[]
  evidence?: AIResponse['evidence']
  confidence?: AIResponse['confidence']
}

export type HistorianChatProps = {
  /** Entity global_id for AI grounding context. */
  entityGlobalId: string
  /** Entity display name for prompts. */
  entityName: string
  /** Entity type — determines suggested questions. */
  entityType: string
  /** Relationships for context hints (optional). */
  relationships?: EntityRelationship[]
}

type ChatStatus = 'idle' | 'loading' | 'error'

const DEFAULT_QUESTIONS: Record<string, string[]> = {
  Event: [
    '为什么这个会发生？',
    '这个对后世有什么影响？',
    '不同文明如何看待这个？',
  ],
  Civilization: [
    '这个是如何兴起的？',
    '它如何影响了后世的历史？',
    '它与同时代的其他文明有什么联系？',
  ],
  Person: [
    '这个人物为什么在历史上如此重要？',
    '他/她的行动如何改变了历史进程？',
    '从不同文明视角如何看待这个人物？',
  ],
  Location: [
    '这个地方为什么具有历史重要性？',
    '这里发生过哪些重要的历史事件？',
    '这个地方如何连接了不同的文明？',
  ],
  Technology: [
    '这项技术如何改变了历史？',
    '它如何传播到其他文明？',
    '它的发明有什么前因后果？',
  ],
  Religion: [
    '这个宗教如何传播并影响世界？',
    '它与当时的政治和社会如何互动？',
    '不同文明如何接受或改造这个宗教？',
  ],
  Idea: [
    '这个思想如何产生和演变？',
    '它如何跨越文明传播？',
    '它对后世观念产生了什么影响？',
  ],
  'Time Period': [
    '这个时期为什么是历史的转折点？',
    '同期其他文明发生了什么？',
    '这���时期如何影响了后来的时代？',
  ],
}

function questionsFor(type: string, name: string): string[] {
  return (DEFAULT_QUESTIONS[type] ?? []).map((q) => q.replace('这个', `${name}`))
}

export function HistorianChatView({
  entityGlobalId,
  entityName,
  entityType,
  // Stateful props for testability
  status = 'idle' as ChatStatus,
  messages = [] as ChatMessage[],
  error = '',
  onAsk = (_q: string) => {},
  onClear = () => {},
}: HistorianChatProps & {
  status?: ChatStatus
  messages?: ChatMessage[]
  error?: string
  onAsk?: (question: string) => void
  onClear?: () => void
}) {
  const suggestions = questionsFor(entityType, entityName)

  return (
    <section className="historian-chat" aria-label="AI 历史学家对话">
      <h3 className="hc-title">AI 历史学家</h3>

      {/* M37 Phase 3: Entity context badge */}
      <div className="hc-context-badge">
        <span className="hc-context-label">当前探索：</span>
        <span className="hc-context-type">{entityType}</span>
        <span className="hc-context-name">{entityName}</span>
      </div>

      <p className="hc-subtitle">
        向 AI 历史学家提问关于 {entityName} 的问题。AI 将基于知识图谱中的事实给出带溯源的回答。
      </p>

      {/* Messages */}
      {messages.length > 0 && (
        <div className="hc-messages">
          {messages.map((msg, i) => (
            <div key={i} className={`hc-message hc-message--${msg.role}`}>
              <span className="hc-role">
                {msg.role === 'user' ? '你' : 'AI 历史学家'}
              </span>
              {msg.role === 'user' ? (
                <p className="hc-user-text">{msg.content}</p>
              ) : (
                <div className="hc-answer-block">
                  <GroundedAnswer
                    response={{
                      answer: msg.content,
                      citations: msg.citations ?? [],
                      rejected_citations: msg.rejected_citations ?? [],
                      grounded: msg.grounded ?? true,
                      engine: msg.engine ?? 'ai',
                      question: msg.content,
                      context_global_ids: [entityGlobalId],
                      mode: 'explain',
                      perspectives: msg.perspectives,
                      evidence: msg.evidence,
                      confidence: msg.confidence,
                    }}
                  />
                  {msg.citations && msg.citations.length > 0 && (
                    <CitationList
                      citations={msg.citations}
                      rejected_citations={msg.rejected_citations}
                    />
                  )}
                </div>
              )}
            </div>
          ))}
          <div className="hc-actions">
            <button type="button" className="hc-clear-btn" onClick={onClear}>
              清空对话
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {status === 'loading' && (
        <p className="hc-loading" role="status">
          AI 历史学家正在从知识库中分析，请稍候…
        </p>
      )}

      {/* Error */}
      {status === 'error' && (
        <p className="hc-error" role="alert">
          当前无法生成解释（{error || '请稍后重试'}）。你可以继续浏览知识图谱。
        </p>
      )}

      {/* Suggested questions */}
      {status === 'idle' && messages.length === 0 && suggestions.length > 0 && (
        <div className="hc-suggestions">
          <p className="hc-suggest-label">推荐问题：</p>
          {suggestions.map((q, i) => (
            <button
              key={i}
              type="button"
              className="hc-suggest-btn"
              disabled={status !== 'idle'}
              onClick={() => onAsk(q)}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {status === 'idle' && messages.length > 0 && (
        <div className="hc-followup">
          <p className="hc-followup-label">继续追问：</p>
          <input
            className="hc-followup-input"
            type="text"
            placeholder="输入追问…"
            aria-label="追问 AI 历史学家"
            onKeyDown={(e) => {
              const target = e.target as HTMLInputElement
              const q = target.value.trim()
              if (e.key === 'Enter' && q) {
                onAsk(q)
                target.value = ''
              }
            }}
          />
        </div>
      )}
    </section>
  )
}

export default function HistorianChat(props: HistorianChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [status, setStatus] = useState<ChatStatus>('idle')
  const [error, setError] = useState('')
  const hasRecordedChatStart = useRef(false)

  async function onAsk(question: string) {
    // M46: record first chat interaction
    if (!hasRecordedChatStart.current) {
      hasRecordedChatStart.current = true
      recordEvent({ action: 'start_chat', entityGlobalId: props.entityGlobalId })
    }

    const userMsg: ChatMessage = { role: 'user', content: question }
    setMessages((prev) => [...prev, userMsg])
    setStatus('loading')
    setError('')

    try {
      const res = await explainAI(question, [props.entityGlobalId])
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: res.answer,
        citations: res.citations,
        rejected_citations: res.rejected_citations,
        grounded: res.grounded,
        engine: res.engine,
        perspectives: res.perspectives,
        evidence: res.evidence,
        confidence: res.confidence,
      }
      setMessages((prev) => [...prev, assistantMsg])
      setStatus('idle')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI 请求失败')
      setStatus('error')
    }
  }

  return (
    <HistorianChatView
      {...props}
      status={status}
      messages={messages}
      error={error}
      onAsk={onAsk}
      onClear={() => { setMessages([]); setStatus('idle') }}
    />
  )
}
