// 公开反馈墙「大家的声音」——匿名展示所有人的提问 + PO 的回复。
//
// 数据来自 GET /api/v1/feedback/board（后端已剥离 id / client_ts / page /
// sentiment 等身份字段；保留 received_at / reply_at 用于显示日期）。
//
// 与 FeedbackWidget 的「我的反馈」互补：本墙可见他人的问题与回复，符合
// PO 拍板的"允许看到别人的问题以及别人的回复"。文案硬编码中文，与
// FeedbackWidget 保持一致，不引入 i18n 以最小化改动面。P0 规则：图标用
// 项目锁定的 SVG Icon 组件，禁 emoji；无紫粉渐变、无硬编码色、无弹跳缓动。

import { useEffect, useState } from 'react'
import { Icon } from './ui/Icon'
import { API_BASE } from '../config/api'

interface BoardEntry {
  message: string
  received_at: string
  reply: string | null
  reply_by: string | null
  reply_at: string | null
}

// ISO 时间戳 → YYYY-MM-DD（按访客本地时区，与「我的反馈」面板一致）。
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

export function FeedbackBoard() {
  const [items, setItems] = useState<BoardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const resp = await fetch(`${API_BASE}/api/v1/feedback/board`)
        if (!resp.ok) throw new Error(`feedback board GET failed (${resp.status})`)
        const data = (await resp.json()) as { items?: BoardEntry[] }
        if (alive) setItems(data.items ?? [])
      } catch {
        if (alive) setError('暂时无法加载大家的声音，稍后再来看看')
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => {
      alive = false
    }
  }, [])

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
            <div className="feedback-board-item" key={idx}>
              <p className="feedback-board-q">{it.message}</p>
              {it.received_at && (
                <p className="feedback-board-q-date">
                  建议于 {formatDate(it.received_at)}
                </p>
              )}
              {it.reply ? (
                <div className="feedback-board-a">
                  <div className="feedback-board-a-head">
                    {it.reply_by || 'History Explorer'} ·{' '}
                    {formatDate(it.reply_at)}
                  </div>
                  <p className="feedback-board-a-text">{it.reply}</p>
                </div>
              ) : (
                <p className="feedback-board-pending">等待回复…</p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export default FeedbackBoard
