// ============================================================
// M65 Phase 1 — Exploration Shell
// Unified spatial layout: left rail | main canvas | right companion | bottom strip.
// Slot-based architecture — no business logic, no state management.
// M85.11 — Added companion collapse toggle.
// ============================================================

import { useState, type ReactNode } from 'react'
import { TimelineStrip } from '../TimelineStrip'
import { Icon } from '../ui/Icon'
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
  const [workspaceCollapsed, setWorkspaceCollapsed] = useState(true)
  const [companionCollapsed, setCompanionCollapsed] = useState(true)

  const bothCollapsed = workspaceCollapsed && companionCollapsed
  const shellClass = [
    'exploration-space',
    workspaceCollapsed ? 'exploration-space--ws-collapsed' : '',
    companionCollapsed ? 'exploration-space--companion-collapsed' : '',
  ].join(' ')

  return (
    <div className={shellClass}>
      {!workspaceCollapsed && (
        <aside className="ws-rail" aria-label="探索工作台">
          {workspace}
        </aside>
      )}

      <main className="explore-canvas">
        {children}
      </main>

      {!companionCollapsed && (
        <aside className="companion-panel" aria-label="AI 历史学家">
          {companion}
        </aside>
      )}

      {/* Workspace toggle button — always visible on the left edge */}
      <button
        type="button"
        className={`workspace-toggle-btn${!workspaceCollapsed ? ' workspace-toggle-btn--inside' : ''}`}
        onClick={() => setWorkspaceCollapsed(!workspaceCollapsed)}
        aria-label={workspaceCollapsed ? '展开探索工作台' : '收起探索工作台'}
        title={workspaceCollapsed ? '展开探索工作台' : '收起探索工作台'}
      >
        <Icon name="book" size={20} />
      </button>

      {/* Companion toggle button — always visible on the right edge */}
      <button
        type="button"
        className={`companion-toggle-btn${!companionCollapsed ? ' companion-toggle-btn--inside' : ''}`}
        onClick={() => setCompanionCollapsed(!companionCollapsed)}
        aria-label={companionCollapsed ? '展开 AI 历史学家' : '收起 AI 历史学家'}
        title={companionCollapsed ? '展开 AI 历史学家' : '收起 AI 历史学家'}
      >
        <Icon name="scholar" size={20} />
      </button>

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
