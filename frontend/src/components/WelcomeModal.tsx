import { useEffect, useRef, useState } from 'react'
import Icon from './ui/Icon'

const COUNTDOWN_SECONDS = 10

export type WelcomeModalProps = {
  /** 关闭欢迎框（手动关闭或倒计时归零）。 */
  onClose: () => void
}

/**
 * 首页友好提示框（M81a 体验收尾）。
 * P0 合规：零 emoji 图标（用锁定 SVG `Icon`）、零硬编码色（全走 Design Token）、
 * 零弹跳缓动（仅 linear / ease-in-out）。10 秒倒计时自动关闭，亦可手动关闭。
 */
export default function WelcomeModal({ onClose }: WelcomeModalProps) {
  const [count, setCount] = useState(COUNTDOWN_SECONDS)
  // 防重复关闭（倒计时与手动关闭可能同帧触发）。
  const closedRef = useRef(false)

  const close = () => {
    if (closedRef.current) return
    closedRef.current = true
    onClose()
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)

    const tick = window.setInterval(() => {
      setCount((c) => (c > 1 ? c - 1 : 0))
    }, 1000)

    const auto = window.setTimeout(close, COUNTDOWN_SECONDS * 1000)

    return () => {
      window.removeEventListener('keydown', onKey)
      window.clearInterval(tick)
      window.clearTimeout(auto)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const RADIUS = 18
  const CIRC = 2 * Math.PI * RADIUS
  const offset = CIRC * (1 - count / COUNTDOWN_SECONDS)

  return (
    <div className="welcome-overlay" onClick={close} role="presentation">
      <div
        className="welcome-modal"
        role="dialog"
        aria-modal="true"
        aria-label="欢迎来到 History Explorer"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="welcome-close" onClick={close} aria-label="关闭">
          <Icon name="cross" size={20} />
        </button>

        <div className="welcome-head">
          <span className="welcome-icon" aria-hidden="true">
            <Icon name="idea" size={24} />
          </span>
          <div className="welcome-head-text">
            <h2 className="welcome-title">欢迎来到 History Explorer</h2>
            <p className="welcome-subtitle">一次仍在生长的探索</p>
          </div>
        </div>

        <div className="welcome-body">
          <p className="welcome-lead">
            谢谢你愿意来试一试。这里目前还是一个很早期的版本——很多想法才刚冒头，界面也还在打磨，但每一步都是认真做出来的。
          </p>
          <p className="welcome-para">
            我们想做的事其实很简单：帮你把脑海里零散的好奇，慢慢收拢成属于你自己的认知结构。进来时带着一个疑问，离开时，多一个更聪明的自己。
          </p>
          <p className="welcome-para">
            它最终会长成什么样子，由你来决定。你在这里留下的每一条意见，我们都会认真读、认真评估，再一点点把它完善。
          </p>
          <p className="welcome-closing">
            所以，别客气——这个平台的下一版，可能就因为有你这句话而不同。
          </p>
        </div>

        <div className="welcome-foot">
          <p className="welcome-foot-note">有想法随时说，在「大家的声音」里就能找到我们。</p>
          <div className="welcome-actions">
            <span className="welcome-count" aria-live="polite">
              <svg className="welcome-ring" width="40" height="40" viewBox="0 0 40 40">
                <circle className="welcome-ring-track" cx="20" cy="20" r={RADIUS} />
                <circle
                  className="welcome-ring-bar"
                  cx="20"
                  cy="20"
                  r={RADIUS}
                  style={{ strokeDasharray: CIRC, strokeDashoffset: offset }}
                />
              </svg>
              <span className="welcome-count-num">{count}</span>
            </span>
            <button type="button" className="welcome-start" onClick={close}>
              开始探索
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
