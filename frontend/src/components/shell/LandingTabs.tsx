// ============================================================
// M90.3 — LandingTabs
//
// Three-tab landing page switcher:
//   [了解] — "原来历史还能这样探索" (DiscoverPage)
//   [研究] — "用 AI 来探索历史" (LandingPage)
//   [扩展] — 扩展功能（roadmap）
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

// P5-S3 ①: 每个模式一句话语义说明，让用户一眼看懂「了解=事实 / 研究=为什么」。
const TABS: { key: TabKey; label: string; desc: string }[] = [
  { key: 'understand', label: '了解', desc: '客观事实：唐朝、科举制、造纸术…' },
  { key: 'research', label: '研究', desc: '开放探索：就事实追问「为什么……」' },
  { key: 'expand', label: '扩展', desc: '更多功能（规划中）' },
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
