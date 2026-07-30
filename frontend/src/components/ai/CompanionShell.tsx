// ============================================================
// M65 Phase 2B — CompanionShell
// Unified AI Historian companion panel.
// Provides CompanionProvider context + mode selector + router.
// Commits 1-2: placeholder modes. Commit 3: real AI views.
// Internal context scope — not exposed to App or global.
// ============================================================

import { CompanionProvider, useCompanion, type CompanionMode } from './CompanionContext'
import { CompanionRouter } from './CompanionRouter'

const MODES: { id: CompanionMode; label: string }[] = [
  { id: 'explain', label: '解释' },
  { id: 'chat', label: '对话' },
  { id: 'research', label: '研究' },
  { id: 'discover', label: '发现' },
]

function CompanionInner() {
  const { state, dispatch } = useCompanion()

  return (
    <div className="companion-shell">
      <h3 className="companion-title">AI 历史学家</h3>

      <nav className="companion-modes" role="tablist" aria-label="AI 模式">
        {MODES.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            className={`companion-mode-btn${state.activeMode === id ? ' active' : ''}`}
            aria-selected={state.activeMode === id}
            onClick={() => dispatch({ type: 'SET_MODE', payload: id })}
          >
            {label}
          </button>
        ))}
      </nav>

      <CompanionRouter />
    </div>
  )
}

export function CompanionShell() {
  return (
    <CompanionProvider>
      <CompanionInner />
    </CompanionProvider>
  )
}

export default CompanionShell
