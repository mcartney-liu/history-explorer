import { useState, useCallback, useEffect, type ReactNode } from 'react'
import { guidanceFor } from '../data/EntityTabGuidance'
import { recordEvent } from '../data/UserBehaviorEvent'
import { useLocale } from '../data/locale'

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
  { id: 'info', label: 'entity.tabInfo', ariaLabel: 'entity.tabInfoAria' },
  { id: 'research', label: 'entity.tabResearch', ariaLabel: 'entity.tabResearchAria' },
  { id: 'extensions', label: 'entity.tabExtensions', ariaLabel: 'entity.tabExtensionsAria' },
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
  const { t } = useLocale()
  return (
    <div className="eps">
      {/* Tab navigation */}
      <nav className="eps-nav" role="tablist" aria-label={t('entity.tabNavAria')}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            className={`eps-tab${activeTab === tab.id ? ' eps-tab--active' : ''}`}
            aria-selected={activeTab === tab.id}
            aria-label={t(tab.ariaLabel)}
            onClick={() => onTabChange(tab.id)}
          >
            {t(tab.label)}
          </button>
        ))}
      </nav>

      {/* Tab guidance (M44) */}
      {(() => {
        const g = guidanceFor(activeTab)
        return (
          <div className="eps-guidance" role="complementary" aria-label={`${g.title} ${t('entity.guidanceSuffix')}`}>
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

  // M45: record entity page open
  useEffect(() => { recordEvent({ action: 'open_entity' }) }, [])

  const handleTabChange = useCallback((tab: EntityTab) => {
    setActiveTab(tab)
    saveTab(tab)
    // M45: record tab switch
    recordEvent({ action: 'switch_tab', tab })
  }, [])

  return (
    <EntityPageShellView
      {...props}
      activeTab={activeTab}
      onTabChange={handleTabChange}
    />
  )
}
