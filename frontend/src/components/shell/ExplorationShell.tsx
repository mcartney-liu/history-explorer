// ============================================================
// M65 Phase 1 — Exploration Shell
// Unified spatial layout: left rail | main canvas | right companion | bottom strip.
// Slot-based architecture — no business logic, no state management.
// ============================================================

import type { ReactNode } from 'react'
import { TimelineStrip } from '../TimelineStrip'
import type { TimelineItem } from '../TimelinePanel'

interface ExplorationShellProps {
  workspace: ReactNode
  companion: ReactNode
  /** Slot-based timeline (backward compatible). Overridden by data props. */
  timeline?: ReactNode
  /** Timeline items for the bottom strip (data-driven). When provided, replaces slot. */
  timelineItems?: TimelineItem[]
  /** Active time point label for the strip */
  timelineActiveLabel?: string
  /** Controlled active index for the strip dot */
  timelineActiveIndex?: number
  /** Callback when user selects a timeline dot */
  onTimelineSelect?: (index: number) => void
  children: ReactNode
}

export function ExplorationShell({
  workspace,
  companion,
  timeline,
  timelineItems,
  timelineActiveLabel,
  timelineActiveIndex,
  onTimelineSelect,
  children,
}: ExplorationShellProps) {
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
        {timelineItems && timelineItems.length > 0 ? (
          <TimelineStrip
            items={timelineItems}
            activeLabel={timelineActiveLabel}
            activeIndex={timelineActiveIndex}
            onSelect={onTimelineSelect}
          />
        ) : (
          timeline
        )}
      </footer>
    </div>
  )
}

export default ExplorationShell
