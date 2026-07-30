// M65 Phase 3A — TimelineStrip: bottom-axis timeline bar for the exploration space.
// Replaces TimelinePanel's role as a standalone panel with a persistent
// horizontal strip anchored at the bottom of the ExplorationShell.
//
// Phase 3A Commit 4: adds interactive dot selection with local UI state.
// Controlled when parent provides activeIndex; falls back to internal state.

import { useState, useEffect } from 'react'
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
  activeIndex: controlledIndex,
  activeLabel,
  onSelect,
}: TimelineStripProps) {
  const [localIndex, setLocalIndex] = useState(0)

  // Sync local state when parent provides a controlled activeIndex
  useEffect(() => {
    if (controlledIndex !== undefined) {
      setLocalIndex(controlledIndex)
    }
  }, [controlledIndex])

  // Use controlled prop if provided, otherwise local state
  const activeIndex = controlledIndex !== undefined ? controlledIndex : localIndex

  if (!items || items.length === 0) return null

  const visible = items.slice(0, 12)

  const handleDotClick = (idx: number) => {
    setLocalIndex(idx)
    onSelect?.(idx)
  }

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
              onClick={() => handleDotClick(idx)}
            />
          )
        })}
      </nav>
    </div>
  )
}

export default TimelineStrip
