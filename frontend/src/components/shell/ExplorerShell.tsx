// ============================================================
// M90.3 Stage B-1 — Explorer Shell (6-region layout)
//
// Replaces ExplorationShell. Key changes from M65 Shell:
//   + Global Bar     — system identity + current topic (slot)
//   + Question Header— user question + understanding goal (slot)
//   + Mode Bar       — mode switcher (slot, Stage C wired)
//   ~ Context Rail   — was WorkspacePanel, now default COLLAPSED (PO 2026-08-09)
//   ~ Canvas         — max-width 720px, centered
//   + Navigation Bar — From/Why/Value (slot, Stage E wired)
//   ~ Companion Dock — was CompanionShell, now default COLLAPSED (PO 2026-08-09)
//   - Timeline Strip — removed (Timeline belongs to Canvas, J-2)
//
// Slot architecture: no business logic, no state management.
// All slots accept ReactNode; the parent (App.tsx) decides what
// to render in each region.
//
// Wave2-#141(3): ThemeToggle removed — one product, one face. The
// v1 theme is fixed at first paint (legacy frosted-glass skin and
// its localStorage toggle are gone; legacy CSS rules become inert).
// ============================================================

import { useState, type ReactNode } from 'react'
import { Icon } from '../ui/Icon'
import { useContentRevision, siteBrandName } from '../../data/contentRuntime'

// ============================================================
// Fixed theme: legacy (deep-navy frosted glass + Earth backdrop).
// Wave2-#141(4): PO feedback — "白色框太耀眼，和整体风格不搭；左右抽屉
// 要毛边玻璃，透明度同 5173"。The clean v1 (light) theme made every
// card a bright solid slab against the dark Earth; switching the
// default to legacy re-maps all paper/ink/accent tokens to the deep
// navy scheme, so cards become dark glass and text turns light.
// dataset marker set at module load so VS-04 rules resolve against
// the shipped theme on first paint.
// ============================================================
if (typeof document !== 'undefined') {
  document.documentElement.dataset.theme = 'legacy'
}

interface ExplorerShellProps {
  // --- New slots (Stage B-2: real components; Stage E: semantic data) ---
  /** Global Bar: system identity + current topic */
  globalBar?: ReactNode
  /** Navigation Contract Bar: From / Why / Value */
  navigationBar?: ReactNode

  // --- Existing slots (renamed for clarity) ---
  /** Context Rail: exploration path, evidence, understanding state */
  contextRail?: ReactNode
  /** Companion Dock: AI historian */
  companionDock?: ReactNode
  /** Companion Dock collapsed state (lifted to App for cross-component control) */
  companionCollapsed?: boolean
  /** Toggle Companion Dock collapsed */
  onCompanionCollapseChange?: (collapsed: boolean) => void

  /** Main canvas content — the only region that changes by mode */
  children: ReactNode
}

export function ExplorerShell({
  globalBar,
  navigationBar,
  contextRail,
  companionDock,
  companionCollapsed,
  onCompanionCollapseChange,
  children,
}: ExplorerShellProps) {
  // 初始 COLLAPSED（PO 2026-08-09：界面初始化时左右抽屉收起来，
  // 由用户按需展开，主内容区最大化）。
  const [contextCollapsed, setContextCollapsed] = useState(true)
  // companionCollapsed 提升到 App 层（理解视角的「直接发问」按钮需跨组件展开 dock）。
  const cCollapsed = companionCollapsed ?? true
  // ADR-0021 R2: re-render the fallback brand when the operator edits it in #/admin.
  useContentRevision()

  return (
    <div className="explorer-shell">
      {/* ============================================================
          1. Global Bar — always visible
          ============================================================ */}
      <header className="explorer-global-bar" aria-label="全局导航">
        {globalBar ?? (
          <div className="explorer-global-placeholder">
            <span className="explorer-global-title">{siteBrandName('History Explorer')}</span>
            <span className="explorer-global-topic">—</span>
          </div>
        )}
      </header>

      {/* ============================================================
          2. Content area: Context Rail | Canvas | Companion Dock
          (Question + Mode 已由 UnderstandingCanvas L0 行 + 四视角 tab 收敛承载)
          ============================================================ */}
      <div className="explorer-content-row">
        {/* 4a. Context Rail (Workspace / 探索工作台) — default collapsed */}
        {!contextCollapsed && (
          <aside className="explorer-context-rail" aria-label="探索工作台">
            {contextRail ?? (
              <div className="explorer-context-placeholder">
                <span className="explorer-context-label">探索工作台</span>
                <p className="explorer-context-hint">选择主题后，你的探索路径将显示在这里</p>
              </div>
            )}
          </aside>
        )}

        {/* Context Rail toggle */}
        <button
          type="button"
          className={`explorer-rail-toggle${!contextCollapsed ? ' explorer-rail-toggle--inside' : ''}`}
          onClick={() => setContextCollapsed(!contextCollapsed)}
          aria-label={contextCollapsed ? '展开探索工作台' : '收起探索工作台'}
        >
          <Icon name="book" size={20} />
        </button>

        {/* 4b. Understanding Canvas — centered when rails are open,
            full-width when both rails are collapsed. */}
        <main
          className="explorer-canvas"
          style={{
            maxWidth: contextCollapsed && cCollapsed ? 'none' : '720px',
          }}
        >
          {children}
        </main>

        {/* Companion Dock toggle */}
        <button
          type="button"
          className={`explorer-companion-toggle${!cCollapsed ? ' explorer-companion-toggle--inside' : ''}`}
          onClick={() => onCompanionCollapseChange?.(!cCollapsed)}
          aria-label={cCollapsed ? '展开 AI 历史学家' : '收起 AI 历史学家'}
        >
          <Icon name="scholar" size={20} />
        </button>

        {/* 4c. Companion Dock — default collapsed */}
        {!cCollapsed && (
          <aside className="explorer-companion-dock" aria-label="AI 历史学家">
            {companionDock ?? (
              <div className="explorer-companion-placeholder">
                <span className="explorer-companion-label">AI 历史学家</span>
                <p className="explorer-companion-hint">开始探索后，AI 将基于你的理解状态提供解释</p>
              </div>
            )}
          </aside>
        )}
      </div>

      {/* ============================================================
          5. Navigation Contract Bar — only when provided
          ============================================================ */}
      {navigationBar !== null && (
        <footer className="explorer-navigation-bar" aria-label="导航契约">
          {navigationBar}
        </footer>
      )}
    </div>
  )
}

export default ExplorerShell
