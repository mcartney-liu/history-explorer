// ============================================================
// M65 Phase 1 — Exploration Shell
// Unified spatial layout: left rail | main canvas | right companion | bottom strip.
// Slot-based architecture — no business logic, no state management.
// ============================================================

import type { ReactNode } from 'react'

interface ExplorationShellProps {
  workspace: ReactNode
  companion: ReactNode
  timeline: ReactNode
  children: ReactNode
}

export function ExplorationShell({ workspace, companion, timeline, children }: ExplorationShellProps) {
  return (
    <div className="exploration-space">
      <aside className="ws-rail" aria-label="探索工作台">
        {workspace}
      </aside>

      <main className="explore-canvas">
        {children}
      </main>

      <aside className="companion-panel" aria-label="AI 历史学家">
        {companion}
      </aside>

      <footer className="timeline-strip" aria-label="时间轴">
        {timeline}
      </footer>
    </div>
  )
}

export default ExplorationShell
