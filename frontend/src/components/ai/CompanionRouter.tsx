// ============================================================
// M65 Phase 2B — CompanionRouter
// Routes activeMode to the corresponding AI view.
// Commit 1: placeholder content for each mode.
// Commit 3: connect to real AI component views.
// ============================================================

import { useCompanion, type CompanionMode } from './CompanionContext'

const MODE_LABELS: Record<CompanionMode, string> = {
  explain: '解释',
  chat: '对话',
  research: '研究',
  discover: '发现',
}

export function CompanionRouter() {
  const { state } = useCompanion()

  return (
    <div className="companion-content">
      <div className="companion-mode-badge">
        {MODE_LABELS[state.activeMode]}模式
      </div>
      <div className="companion-body">
        <p className="companion-hint">
          AI 历史学家已就绪。选择上方模式开始探索。
        </p>
      </div>
    </div>
  )
}

export default CompanionRouter
