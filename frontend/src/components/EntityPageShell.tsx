import { useState, useCallback, type ReactNode } from 'react'
import { guidanceFor } from '../data/EntityTabGuidance'

// ============================================================
// Types
// ============================================================

export type EntityTab = 'info' | 'explore' | 'research' | 'analyze' | 'extensions'

export interface TabConfig {
  id: EntityTab
  label: string
  ariaLabel: string
}

const TABS: TabConfig[] = [
  { id: 'info', label: '了解', ariaLabel: '了解实体基本信息' },
  { id: 'explore', label: '探索', ariaLabel: '探索相关实体与对话' },
  { id: 'research', label: '研究', ariaLabel: '多维研究模式' },
  { id: 'analyze', label: '分析', ariaLabel: '事件分析与AI解释' },
  { id: 'extensions', label: '扩展', ariaLabel: '扩展功能' },
]

// ============================================================
// Tab persistence
// ============================================================

const TAB_STORAGE_KEY = 'history-explorer.entity.active-tab'

function loadSavedTab(): EntityTab | null {
  try {
    const saved = localStorage.getItem(TAB_STORAGE_KEY)
    if (saved && TABS.some((t) => t.id === saved)) return saved as EntityTab
  } catch { /* noop */ }
  return null
}

function saveTab(tab: EntityTab): void {
  try { localStorage.setItem(TAB_STORAGE_KEY, tab) } catch { /* noop */ }
}

// ============================================================
// Shell View
// ============================================================

export type EntityPageShellProps = {
  children?: ReactNode
  /** Render function per tab. */
  renderTab?: (tab: EntityTab) => ReactNode
  // Stateful props for testability
  activeTab?: EntityTab
  onTabChange?: (tab: EntityTab) => void
  tabs?: TabConfig[]
}

export function EntityPageShellView({
  children,
  renderTab,
  activeTab = 'info',
  onTabChange = () => {},
  tabs = TABS,
}: EntityPageShellProps) {
  return (
    <div className="eps">
      {/* Tab navigation */}
      <nav className="eps-nav" role="tablist" aria-label="实体页面导航">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            className={`eps-tab${activeTab === tab.id ? ' eps-tab--active' : ''}`}
            aria-selected={activeTab === tab.id}
            aria-label={tab.ariaLabel}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Tab guidance (M44) */}
      {(() => {
        const g = guidanceFor(activeTab)
        return (
          <div className="eps-guidance" role="complementary" aria-label={`${g.title} 说明`}>
            <p className="eps-guidance-title">{g.title}</p>
            <p className="eps-guidance-desc">{g.description}</p>
            {g.recommendedActions.length > 0 && (
              <ul className="eps-guidance-actions">
                {g.recommendedActions.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            )}
          </div>
        )
      })()}

      {/* Tab content */}
      <div className="eps-content" role="tabpanel">
        {renderTab ? renderTab(activeTab) : children}
      </div>
    </div>
  )
}

// ============================================================
// Stateful container
// ============================================================

export default function EntityPageShell(props: EntityPageShellProps) {
  const [activeTab, setActiveTab] = useState<EntityTab>(
    () => loadSavedTab() ?? 'info',
  )

  const handleTabChange = useCallback((tab: EntityTab) => {
    setActiveTab(tab)
    saveTab(tab)
  }, [])

  return (
    <EntityPageShellView
      {...props}
      activeTab={activeTab}
      onTabChange={handleTabChange}
    />
  )
}
