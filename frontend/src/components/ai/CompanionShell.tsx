// ============================================================
// M65 Phase 2B — CompanionShell
// Unified AI Historian companion panel.
// Provides CompanionProvider context + mode selector + router.
// Commits 1-2: placeholder modes. Commit 3: real AI views.
// Internal context scope — not exposed to App or global.
// ============================================================

import { useEffect } from 'react'
import { CompanionProvider, useCompanion, type CompanionMode, type WorkspaceContextData } from './CompanionContext'
import { CompanionRouter } from './CompanionRouter'
import { ExplorationInsightPanel } from './ExplorationInsightPanel'
import type { ExplorationAction } from '../../next/exploration/ExplorationPolicy'

const MODES: { id: CompanionMode; label: string }[] = [
  { id: 'explain', label: '解释' },
  { id: 'chat', label: '对话' },
  { id: 'research', label: '研究' },
  { id: 'discover', label: '发现' },
]

function CompanionInner({ onNavigateEntity, actions, mode }: { onNavigateEntity?: (globalId: string) => void; actions?: ExplorationAction[]; mode?: CompanionMode }) {
  const { state, dispatch } = useCompanion()

  // 「直接发问」从理解视角打开时，将初始模式切到对话（chat）。
  // 普通展开（mode 未传）保持默认 explain。dock 每次展开都会重新挂载，故挂载即生效。
  useEffect(() => {
    if (mode) dispatch({ type: 'SET_MODE', payload: mode })
  }, [mode, dispatch])

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

      {/* M66-A: read-only exploration-context panel — rendered OUTSIDE the AI-mode
          router so it never enters AI runtime / explainAI channel. */}
      <ExplorationInsightPanel />

      <CompanionRouter onNavigateEntity={onNavigateEntity} actions={actions} />
    </div>
  )
}

export function CompanionShell({ workspaceContext, onNavigateEntity, actions, mode }: { workspaceContext?: WorkspaceContextData; onNavigateEntity?: (globalId: string) => void; actions?: ExplorationAction[]; mode?: CompanionMode }) {
  return (
    <CompanionProvider workspace={workspaceContext}>
      <CompanionInner onNavigateEntity={onNavigateEntity} actions={actions} mode={mode} />
    </CompanionProvider>
  )
}

export default CompanionShell
