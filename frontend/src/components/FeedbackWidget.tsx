// M35 Feature E — FeedbackWidget.
//
// A lightweight "was this useful?" control. When online it POSTs to the
// backend (`/api/v1/feedback`); offline / backend-unreachable it degrades to
// localStorage (best-effort) so tests / private mode never throw.
//
// Closed loop (added): after a successful submit the returned id is kept in
// the visitor's own browser, and a "我的反馈" panel lets them pull back their
// own entry (and any reply the PO has written) via GET /api/v1/feedback/{id}.

import { useEffect, useState } from 'react'
import { Icon } from './ui/Icon'
import { API_BASE } from '../config/api'
import Feedback from './FeedbackBoard'

const STORAGE_KEY = 'history_explorer_feedback'
const MY_IDS_KEY = 'he_feedback_my_ids'

type Sentiment = 'up' | 'down'

interface FeedbackEntry {
  sentiment?: Sentiment
  message?: string
  ts: number
  page?: string
}

// Server-side record shape (matched from GET /api/v1/feedback/{id}).
interface FeedbackRecord {
  id: string
  sentiment: Sentiment | null
  message: string | null
  page: string | null
  client_ts: number | null
  received_at: string
  reply: string | null
  reply_at: string | null
  reply_by: string | null
}

function saveFeedback(entry: FeedbackEntry): void {
  try {
    if (typeof localStorage === 'undefined') return
    const raw = localStorage.getItem(STORAGE_KEY)
    const list = raw ? JSON.parse(raw) : []
    if (Array.isArray(list)) {
      list.push(entry)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(-100)))
    }
  } catch {
    // storage unavailable — degrade silently, feedback is best-effort only.
  }
}

// --- "my feedback" identity (visitor-local, browser-scoped) ----------------
function loadMyIds(): string[] {
  try {
    if (typeof localStorage === 'undefined') return []
    const raw = localStorage.getItem(MY_IDS_KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

function saveMyId(id: string): string[] {
  try {
    if (typeof localStorage === 'undefined') return [id]
    const list = loadMyIds()
    if (!list.includes(id)) list.push(id)
    localStorage.setItem(MY_IDS_KEY, JSON.stringify(list.slice(-50)))
    return list
  } catch {
    return [id]
  }
}

// ISO 时间戳 → YYYY-MM-DD（按访客本地时区，与公开墙一致）。
function formatDate(ts?: string | null): string {
  if (!ts) return ''
  try {
    const d = new Date(ts)
    if (isNaN(d.getTime())) return String(ts)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  } catch {
    return String(ts)
  }
}

type FeedbackWidgetProps = {
  page?: string
}

export function FeedbackWidget({ page }: FeedbackWidgetProps) {
  const [message, setMessage] = useState('')
  const [sentiment, setSentiment] = useState<Sentiment | null>(null)
  const [sent, setSent] = useState(false)
  const [failed, setFailed] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // "我的反馈" panel state
  const [myOpen, setMyOpen] = useState(false)
  const [myList, setMyList] = useState<FeedbackRecord[]>([])
  const [myLoading, setMyLoading] = useState(false)
  const [myError, setMyError] = useState('')

  const fetchMy = async () => {
    const ids = loadMyIds()
    if (ids.length === 0) {
      setMyList([])
      return
    }
    setMyLoading(true)
    setMyError('')
    try {
      const results = await Promise.all(
        ids.map(async (id) => {
          try {
            const resp = await fetch(
              `${API_BASE}/api/v1/feedback/${encodeURIComponent(id)}`
            )
            if (!resp.ok) return null
            return (await resp.json()) as FeedbackRecord
          } catch {
            return null
          }
        })
      )
      setMyList(results.filter((r): r is FeedbackRecord => r !== null))
    } catch {
      setMyError('无法连接后端，稍后重试')
    } finally {
      setMyLoading(false)
    }
  }

  // On mount, if this browser already has feedback ids, pull them to show replies.
  useEffect(() => {
    if (loadMyIds().length > 0) fetchMy()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const submit = async () => {
    if (submitting) return
    if (!sentiment && !message.trim()) return
    const payload: FeedbackEntry = {
      sentiment: sentiment ?? undefined,
      message: message.trim() || undefined,
      page,
      ts: Date.now(),
    }
    setSubmitting(true)
    setFailed(false)
    try {
      const resp = await fetch(`${API_BASE}/api/v1/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!resp.ok) throw new Error(`feedback POST failed (${resp.status})`)
      const data = (await resp.json().catch(() => ({}))) as { id?: string }
      if (data && data.id) saveMyId(data.id)
      setSent(true)
      setMyOpen(true)
      // give the backend a moment to persist, then refresh the panel
      setTimeout(fetchMy, 300)
    } catch {
      // offline / backend unreachable — degrade to localStorage (best-effort),
      // but DO NOT claim success: surface a retry affordance instead so the
      // visitor knows the submission did not reach us.
      saveFeedback({
        sentiment: sentiment ?? undefined,
        message: message.trim() || undefined,
        ts: Date.now(),
        page,
      })
      setFailed(true)
    } finally {
      setSubmitting(false)
    }
  }

  const hasMy = myList.length > 0

  return (
    <section className="feedback-widget" aria-label="Feedback">
      {!sent && (
        <>
          {failed && (
            <p className="feedback-error" role="alert">
              <Icon name="warning" size={16} /> 提交未送达，上面的内容已为你保留，点“重试提交”再发一次。
            </p>
          )}
          <span className="feedback-prompt">这个探索有用吗？</span>
          <div className="feedback-actions">
            <button
              type="button"
              className={`feedback-btn${sentiment === 'up' ? ' is-active' : ''}`}
              data-sentiment="up"
              aria-pressed={sentiment === 'up'}
              aria-label="有用"
              onClick={() => setSentiment('up')}
            >
              <Icon name="thumb-up" size={16} /> 有用
            </button>
            <button
              type="button"
              className={`feedback-btn${sentiment === 'down' ? ' is-active' : ''}`}
              data-sentiment="down"
              aria-pressed={sentiment === 'down'}
              aria-label="没用"
              onClick={() => setSentiment('down')}
            >
              <Icon name="thumb-down" size={16} /> 没用
            </button>
          </div>
          <textarea
            className="feedback-message"
            placeholder="想说点什么？（可选）"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={2}
          />
          <button
            type="button"
            className="feedback-submit"
            disabled={submitting || (!sentiment && !message.trim())}
            onClick={submit}
          >
            {submitting ? '提交中…' : failed ? '重试提交' : '提交反馈'}
          </button>
        </>
      )}

      {sent && (
        <p className="feedback-thanks">
          <Icon name="check" size={16} /> 已收到，谢谢你的反馈！
        </p>
      )}

      {hasMy && (
        <div className="feedback-my">
          <button
            type="button"
            className="feedback-my-toggle"
            aria-expanded={myOpen}
            onClick={() => {
              setMyOpen((v) => !v)
              if (!myOpen) fetchMy()
            }}
          >
            <Icon name={myOpen ? 'chevron-up' : 'chevron-down'} size={16} />
            <Icon name="chat" size={16} /> 我的反馈（{myList.length}）
          </button>

          {myOpen && (
            <div className="feedback-my-list">
              {myLoading && <p className="feedback-my-hint">加载中…</p>}
              {myError && <p className="feedback-my-hint feedback-my-hint--err">{myError}</p>}
              {!myLoading &&
                myList.map((item) => (
                  <div className="feedback-my-item" key={item.id}>
                    <div className="feedback-my-meta">
                      {item.sentiment === 'up'
                        ? '有用'
                        : item.sentiment === 'down'
                          ? '没用'
                          : '未评分'}
                      {item.page ? ` · ${item.page}` : ''}
                      {item.received_at ? ` · ${formatDate(item.received_at)}` : ''}
                    </div>
                    <p className="feedback-my-msg">
                      {item.message || '（无文字）'}
                    </p>
                    {item.reply ? (
                      <div className="feedback-reply">
                        <div className="feedback-reply-head">官方回复</div>
                        <p className="feedback-reply-text">{item.reply}</p>
                        {item.reply_by || item.reply_at ? (
                          <div className="feedback-reply-by">
                            {item.reply_by || 'History Explorer'}
                            {item.reply_at ? ` · ${formatDate(item.reply_at)}` : ''}
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <p className="feedback-my-pending">等待回复…</p>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
      <Feedback />
    </section>
  )
}

export default FeedbackWidget
