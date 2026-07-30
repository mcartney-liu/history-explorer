// M65 Phase 3A — TimelineStrip: bottom-axis timeline bar for the exploration space.
// Replaces TimelinePanel's role as a standalone panel with a persistent
// horizontal strip anchored at the bottom of the ExplorationShell.
//
// Phase 3A Commit 1: pure presentational component — no API calls, no state,
// no navigation logic. The `onSelect` callback is declared but not wired.

import type { TimelineItem } from './TimelinePanel'

export interface TimelineStripProps {
  /** Timeline events to render */
  items: TimelineItem[]
  /** Index or label of the currently-active time point (entity being viewed) */
  activeIndex?: number
  /** Label for the active entity / time point shown in the strip label area */
  activeLabel?: string
  /** Callback when user clicks or drags to a time point (wired in future commit) */
  onSelect?: (index: number) => void
}

/**
 * Bottom-axis timeline strip. Renders a horizontal bar with dots for each
 * timeline event and a centered label for the active time point.
 *
 * Design constraints:
 *  - Height: 48px (matches .timeline-strip CSS)
 *  - Max items visible: ~10 (excess scrollable or compressed)
 *  - Active dot: gold (#CBA135)
 *  - Inactive dots: subtle border color
 */
export function TimelineStrip({
  items,
  activeIndex = 0,
  activeLabel,
  onSelect,
}: TimelineStripProps) {
  if (!items || items.length === 0) return null

  const visible = items.slice(0, 12)

  return (
    <div className="ts-container" aria-label="时间轴">
      {/* Active time point label */}
      {activeLabel && (
        <span className="ts-active-label">{activeLabel}</span>
      )}

      {/* Dot track */}
      <nav className="ts-track" role="list" aria-label="Timeline events">
        {visible.map((item, idx) => {
          const isActive = idx === activeIndex
          return (
            <button
              key={`${item.period}-${idx}`}
              type="button"
              role="listitem"
              className={`ts-dot${isActive ? ' ts-dot-active' : ''}`}
              aria-label={item.event}
              aria-current={isActive ? 'true' : undefined}
              title={`${item.period}: ${item.event}`}
              tabIndex={onSelect ? 0 : -1}
              onClick={() => onSelect?.(idx)}
            />
          )
        })}
      </nav>
    </div>
  )
}

export default TimelineStrip
