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
}

const TABS: { key: TabKey; label: string }[] = [
  { key: 'understand', label: '了解' },
  { key: 'research', label: '研究' },
  { key: 'expand', label: '扩展' },
]

export function LandingTabs({ understand, research, expand }: LandingTabsProps) {
  const [active, setActive] = useState<TabKey>('understand')

  return (
    <div className="landing-tabs">
      <nav className="landing-tabs-bar" aria-label="首页切换">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            className={`landing-tab${active === key ? ' landing-tab--active' : ''}`}
            onClick={() => setActive(key)}
          >
            {label}
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
