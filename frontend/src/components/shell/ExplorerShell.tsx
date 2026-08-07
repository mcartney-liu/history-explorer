// ============================================================
// M90.3 Stage B-1 — Explorer Shell (6-region layout)
//
// Replaces ExplorationShell. Key changes from M65 Shell:
//   + Global Bar     — system identity + current topic (slot)
//   + Question Header— user question + understanding goal (slot)
//   + Mode Bar       — mode switcher (slot, Stage C wired)
//   ~ Context Rail   — was WorkspacePanel, now default EXPANDED
//   ~ Canvas         — max-width 720px, centered
//   + Navigation Bar — From/Why/Value (slot, Stage E wired)
//   ~ Companion Dock — was CompanionShell, now default VISIBLE
//   - Timeline Strip — removed (Timeline belongs to Canvas, J-2)
//
// Slot architecture: no business logic, no state management.
// All slots accept ReactNode; the parent (App.tsx) decides what
// to render in each region.
// ============================================================

import { useState, type ReactNode } from 'react'
import { Icon } from '../ui/Icon'

interface ExplorerShellProps {
  // --- New slots (Stage B-2: real components; Stage E: semantic data) ---
  /** Global Bar: system identity + current topic */
  globalBar?: ReactNode
  /** Question Header: user question + understanding goal */
  questionHeader?: ReactNode
  /** Mode Bar: 4-mode switcher */
  modeBar?: ReactNode
  /** Navigation Contract Bar: From / Why / Value */
  navigationBar?: ReactNode

  // --- Existing slots (renamed for clarity) ---
  /** Context Rail: exploration path, evidence, understanding state */
  contextRail?: ReactNode
  /** Companion Dock: AI historian */
  companionDock?: ReactNode

  /** Main canvas content — the only region that changes by mode */
  children: ReactNode
}

export function ExplorerShell({
  globalBar,
  questionHeader,
  modeBar,
  navigationBar,
  contextRail,
  companionDock,
  children,
}: ExplorerShellProps) {
  // Default EXPANDED for both side panels (M90 Stage B-1).
  const [contextCollapsed, setContextCollapsed] = useState(false)
  const [companionCollapsed, setCompanionCollapsed] = useState(false)

  return (
    <div className="explorer-shell">
      {/* ============================================================
          1. Global Bar — always visible
          ============================================================ */}
      <header className="explorer-global-bar" aria-label="全局导航">
        {globalBar ?? (
          <div className="explorer-global-placeholder">
            <span className="explorer-global-title">History Explorer</span>
            <span className="explorer-global-topic">—</span>
          </div>
        )}
      </header>

      {/* ============================================================
          2. Question Header — only visible when there's content
          ============================================================ */}
      {questionHeader && (
        <div className="explorer-question-header" aria-label="探索问题">
          {questionHeader}
        </div>
      )}

      {/* ============================================================
          3. Mode Bar — only visible when there's content
          ============================================================ */}
      {modeBar && (
        <nav className="explorer-mode-bar" aria-label="理解模式">
          {modeBar}
        </nav>
      )}

      {/* ============================================================
          4. Content area: Context Rail | Canvas | Companion Dock
          ============================================================ */}
      <div className="explorer-content-row">
        {/* 4a. Context Rail (Workspace / 探索工作台) — default expanded */}
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
            maxWidth: contextCollapsed && companionCollapsed ? 'none' : '720px',
          }}
        >
          {children}
        </main>

        {/* Companion Dock toggle */}
        <button
          type="button"
          className={`explorer-companion-toggle${!companionCollapsed ? ' explorer-companion-toggle--inside' : ''}`}
          onClick={() => setCompanionCollapsed(!companionCollapsed)}
          aria-label={companionCollapsed ? '展开 AI 历史学家' : '收起 AI 历史学家'}
        >
          <Icon name="scholar" size={20} />
        </button>

        {/* 4c. Companion Dock — default visible */}
        {!companionCollapsed && (
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
