// ============================================================
// M90.3 — LandingTabs
//
// Two-tab landing page switcher (Wave2-#141: the placeholder
// [扩展] tab was removed — a "敬请期待" empty shell breaks the
// entry promise: what I click should be what I get):
//   [了解] — 浏览主题库：客观事实（唐朝、科举制、造纸术…）
//   [研究] — 提问式探索：就事实追问「为什么……」
//
// The tabs + ProductIntro + search boxes are the shared
// landing surface. Each tab renders completely different content.
// ============================================================

import { useState, type ReactNode } from 'react'

type TabKey = 'understand' | 'research' | 'expand'

interface LandingTabsProps {
  understand: ReactNode
  research: ReactNode
  expand: ReactNode
  /** Controlled mode: when provided, the parent owns the active tab. */
  activeTab?: TabKey
  onTabChange?: (tab: TabKey) => void
}

// P5-S3 ①: 每个模式一句话语义说明，让用户一眼看懂「了解=浏览事实 / 研究=追问为什么」。
// Wave2-#141: expand removed from the bar; TabKey + expand prop kept for
// API compatibility (App still passes a node, it is simply not rendered).
const TABS: { key: TabKey; label: string; desc: string }[] = [
  { key: 'understand', label: '了解', desc: '浏览主题库：唐朝、科举制、造纸术…' },
  { key: 'research', label: '研究', desc: '提问式探索：就事实追问「为什么……」' },
]

export function LandingTabs({ understand, research, expand, activeTab, onTabChange }: LandingTabsProps) {
  const [internal, setInternal] = useState<TabKey>('understand')
  const active = activeTab ?? internal
  const setActive = onTabChange ?? setInternal

  return (
    <div className="landing-tabs">
      <nav className="landing-tabs-bar" aria-label="首页切换">
        {TABS.map(({ key, label, desc }) => (
          <button
            key={key}
            type="button"
            className={`landing-tab${active === key ? ' landing-tab--active' : ''}`}
            onClick={() => setActive(key)}
          >
            <span className="landing-tab-label">{label}</span>
            <span className="landing-tab-desc">{desc}</span>
          </button>
        ))}
      </nav>

      <div className="landing-tabs-content">
        {active === 'understand' && understand}
        {active === 'research' && research}
        {active === 'expand' && expand}
      </div>
    </div>
  )
}
