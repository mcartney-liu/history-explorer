// M35 Feature E — FeedbackWidget (pure frontend, no backend).
//
// A lightweight "was this useful?" control. The submit action lands in
// localStorage only (key `history_explorer_feedback`); there is NO new API and
// NO new dependency. If localStorage is unavailable it degrades to a no-op so
// tests / private mode never throw.

import { useState } from 'react'

const STORAGE_KEY = 'history_explorer_feedback'

type Sentiment = 'up' | 'down'

interface FeedbackEntry {
  sentiment: Sentiment
  message?: string
  ts: number
  page?: string
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

type FeedbackWidgetProps = {
  page?: string
}

export function FeedbackWidget({ page }: FeedbackWidgetProps) {
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)

  const submit = (s: Sentiment) => {
    saveFeedback({ sentiment: s, message: message.trim() || undefined, ts: Date.now(), page })
    setSent(true)
  }

  if (sent) {
    return (
      <section className="feedback-widget feedback-widget--done" aria-label="Feedback">
        <p className="feedback-thanks">已收到，谢谢你的反馈！</p>
      </section>
    )
  }

  return (
    <section className="feedback-widget" aria-label="Feedback">
      <span className="feedback-prompt">这个探索有用吗？</span>
      <div className="feedback-actions">
        <button
          type="button"
          className="feedback-btn feedback-up"
          data-sentiment="up"
          aria-label="有用"
          onClick={() => submit('up')}
        >
          👍 有用
        </button>
        <button
          type="button"
          className="feedback-btn feedback-down"
          data-sentiment="down"
          aria-label="没用"
          onClick={() => submit('down')}
        >
          👎 没用
        </button>
      </div>
      <textarea
        className="feedback-message"
        placeholder="想说点什么？（可选）"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={2}
      />
    </section>
  )
}

export default FeedbackWidget
