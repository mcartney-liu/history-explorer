// 公开反馈墙「大家的声音」——匿名展示所有人的提问 + PO 的回复。
//
// 数据来自 GET /api/v1/feedback/board（后端已剥离 client_ts / page /
// sentiment 等身份字段；保留 received_at / reply_at 用于显示日期，并暴露
// 一个不携带身份语义的 id 作为回复锚点）。
//
// 与 FeedbackWidget 的「我的反馈」互补：本墙可见他人的问题与回复，符合
// PO 拍板的"允许看到别人的问题以及别人的回复"。文案硬编码中文，与
// FeedbackWidget 保持一致，不引入 i18n 以最小化改动面。P0 规则：图标用
// 项目锁定的 SVG Icon 组件，禁 emoji；无紫粉渐变、无硬编码色、无弹跳缓动。

import { useCallback, useEffect, useState } from 'react'
import { Icon } from './ui/Icon'
import { API_BASE } from '../config/api'

interface ReplyNode {
  text: string
  at: string | null
  by: string | null
}

interface BoardEntry {
  id?: string
  message: string
  received_at: string
  reply: string | null
  reply_by: string | null
  reply_at: string | null
  replies?: ReplyNode[]
}

// ISO 时间戳 → YYYY-MM-DD HH:mm:ss（按访客本地时区，与「我的反馈」面板一致）。
function formatDate(ts?: string | null): string {
  if (!ts) return ''
  try {
    const d = new Date(ts)
    if (isNaN(d.getTime())) return String(ts)
    const p = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
  } catch {
    return String(ts)
  }
}

// 把回复文本里的 http(s) 链接渲染成可点击链接（仅匹配 http(s)，避免 XSS）。
function renderReply(text: string) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g)
  return parts.map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer">
        {part}
      </a>
    ) : (
      <span key={i}>{part}</span>
    )
  )
}

// 单条反馈卡片：负责自己的回复输入框状态（展开 / 输入 / 提交 / 错误）。
// 提交成功后回调 onReplied 让父组件整面刷新，使新回复出现在线程里。
function BoardCard({ entry, onReplied }: { entry: BoardEntry; onReplied: () => void }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const submit = async () => {
    const t = text.trim()
    if (!t) {
      setErr('回复不能为空')
      return
    }
    if (!entry.id) {
      setErr('该反馈暂不支持回复')
      return
    }
    setBusy(true)
    setErr('')
    try {
      const resp = await fetch(`${API_BASE}/api/v1/feedback/${entry.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: t, by: '访客' }),
      })
      if (!resp.ok) {
        const j = (await resp.json().catch(() => null)) as { detail?: string } | null
        throw new Error(j?.detail || `回复失败 (${resp.status})`)
      }
      setText('')
      setOpen(false)
      onReplied()
    } catch (e) {
      setErr(e instanceof Error ? e.message : '回复失败，请稍后再试')
    } finally {
      setBusy(false)
    }
  }

  const cancel = () => {
    setOpen(false)
    setText('')
    setErr('')
  }

  return (
    <div className="feedback-board-item">
      <p className="feedback-board-q">{entry.message}</p>
      {entry.received_at && (
        <p className="feedback-board-q-date">建议于 {formatDate(entry.received_at)}</p>
      )}

      {entry.replies && entry.replies.length > 0 ? (
        <div className="feedback-board-a">
          {entry.replies.map((rep, ri) => (
            <div className="feedback-board-a-item" key={ri}>
              <div className="feedback-board-a-head">
                {rep.by || 'History Explorer'} · {formatDate(rep.at)}
              </div>
              <p className="feedback-board-a-text">{renderReply(rep.text)}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="feedback-board-pending">等待回复…</p>
      )}

      <div className="feedback-board-reply">
        {!open ? (
          <button
            type="button"
            className="feedback-board-reply-toggle"
            onClick={() => setOpen(true)}
          >
            <Icon name="note" size={16} />
            回复
          </button>
        ) : (
          <div className="feedback-board-reply-form">
            <textarea
              className="feedback-board-reply-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="接着聊几句…（最多 1000 字）"
              rows={3}
              maxLength={1000}
            />
            <div className="feedback-board-reply-actions">
              <button
                type="button"
                className="feedback-board-reply-send"
                onClick={submit}
                disabled={busy}
              >
                {busy ? '发送中…' : '发送'}
              </button>
              <button
                type="button"
                className="feedback-board-reply-cancel"
                onClick={cancel}
                disabled={busy}
              >
                取消
              </button>
            </div>
            {err && <p className="feedback-board-reply-err">{err}</p>}
          </div>
        )}
      </div>
    </div>
  )
}

export function FeedbackBoard() {
  const [items, setItems] = useState<BoardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const resp = await fetch(`${API_BASE}/api/v1/feedback/board`)
      if (!resp.ok) throw new Error(`feedback board GET failed (${resp.status})`)
      const data = (await resp.json()) as { items?: BoardEntry[] }
      setItems(data.items ?? [])
    } catch {
      setError('暂时无法加载大家的声音，稍后再来看看')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <section className="feedback-board" aria-label="大家的声音">
      <div className="feedback-board-head">
        <Icon name="chat" size={20} />
        大家的声音
        {!loading && items.length > 0 && (
          <span className="feedback-board-hint">（匿名展示，看看别人在想什么）</span>
        )}
      </div>

      {loading && <p className="feedback-board-hint">加载中…</p>}
      {error && <p className="feedback-board-hint feedback-board-hint--err">{error}</p>}

      {!loading && !error && items.length === 0 && (
        <p className="feedback-board-hint">还没有人留下声音，来当第一个吧。</p>
      )}

      {!loading && items.length > 0 && (
        <div className="feedback-board-list">
          {items.map((it, idx) => (
            <BoardCard key={it.id || idx} entry={it} onReplied={load} />
          ))}
        </div>
      )}
    </section>
  )
}

export default FeedbackBoard
