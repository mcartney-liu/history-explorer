import { useState, useCallback, useEffect, type ReactNode } from 'react'
import { guidanceFor } from '../data/EntityTabGuidance'
import { useContentRevision, slotItems } from '../data/contentRuntime'
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
  /** M72 Line2 (finding E): entity global id for open_entity telemetry —
   *  Depth / Package-Coverage / Guide positioning all rely on it. */
  entityGlobalId?: string
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
  // ADR-0021 R2: re-render when configured tab guidance arrives. `guidanceFor`
  // reads the overlay synchronously, so without this subscription an edit made
  // in #/admin would only appear after a full reload.
  useContentRevision()
  // ADR-0021 R2: the section tab labels are operator-editable via the
  // `entity_tabs.nav_labels` slot (in TABS order); fall back to the
  // shipped locale strings when nothing is configured.
  const configuredTabLabels = slotItems('entity_tabs.nav_labels', [])
  return (
    <div className="eps">
      {/* Tab navigation */}
      <nav className="eps-nav" role="tablist" aria-label={t('entity.tabNavAria')}>
        {tabs.map((tab, idx) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            className={`eps-tab${activeTab === tab.id ? ' eps-tab--active' : ''}`}
            aria-selected={activeTab === tab.id}
            aria-label={t(tab.ariaLabel)}
            onClick={() => onTabChange(tab.id)}
          >
            {configuredTabLabels[idx] ?? t(tab.label)}
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
  // P-U15：初始 tab 完全由入口意图决定（App 传入的 activeTab：普通点击 info、
  // 「深研」进 research），不再读 localStorage 的 loadSavedTab 以免污染所有实体的初始 tab。
  const [activeTab, setActiveTab] = useState<EntityTab>(
    () => props.activeTab ?? 'info',
  )

  // M45: record entity page open.
  // M72 Line2 (finding E): attach the entity global id so Depth / Package
  // Coverage / Guide positioning can attribute the visit. Behavior-analysis
  // only — never used for recommendation/personalization.
  useEffect(() => {
    recordEvent({
      action: 'open_entity',
      ...(props.entityGlobalId ? { entityGlobalId: props.entityGlobalId } : {}),
    })
  }, [props.entityGlobalId])

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
