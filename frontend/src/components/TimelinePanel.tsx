import { Fragment } from 'react'
import EmptyState from './EmptyState'
import { sortTimeline, groupTimeline } from '../data/timelineUtils'
import type { TimeValue } from '../data/temporalUtils'

export type TimelineItem = {
  period: string
  event: string
  // M6-P4: optional backend-provided date used for sorting + bucket grouping.
  // Optional so pre-existing { period, event } items stay fully compatible.
  date?: TimeValue
}

type TimelinePanelProps = {
  timeline: TimelineItem[]
  // M2-003: when both handlers are supplied and a timeline event's name
  // matches a known entity, the event becomes clickable and navigates to that
  // entity (Timeline -> Entity -> Timeline loop). Events without a match stay
  // static, so only "associated" time points are interactive.
  nameToId?: Record<string, string>
  onEventClick?: (entityId: string) => void
}

function TimelinePanel({ timeline, nameToId, onEventClick }: TimelinePanelProps) {
  const clickable = typeof onEventClick === 'function' && !!nameToId

  // M6-P4: deterministic ordering + fixed time-bucket grouping.
  // sortTimeline -> groupTimeline are pure; the original node/connector
  // rendering below is unchanged (period / event / navigation preserved).
  const groups = groupTimeline(sortTimeline(timeline))
  const flatItems = groups.flatMap((g) => g.items)
  // Bucket header shown immediately before each group's first item.
  const headerBefore = new Map<number, string>()
  {
    let acc = 0
    for (const g of groups) {
      if (g.items.length > 0) headerBefore.set(acc, g.bucket)
      acc += g.items.length
    }
  }

  return (
    <div className="result-section">
      <h3>Timeline</h3>
      {timeline.length > 0 ? (
        <div className="timeline-flow">
          {flatItems.map((item, idx) => {
            const entityId = clickable ? nameToId![item.event] : undefined
            const interactive = clickable && !!entityId
            const node = (
              <div className="timeline-node" key={`node-${idx}`}>
                <div className="timeline-period">{item.period}</div>
                <div className="timeline-connector" aria-hidden="true">
                  &#8595;
                </div>
                {interactive ? (
                  <button
                    type="button"
                    className="timeline-event is-clickable"
                    aria-label={`Open ${item.event}`}
                    onClick={() => onEventClick!(entityId!)}
                  >
                    {item.event}
                  </button>
                ) : (
                  <div className="timeline-event">{item.event}</div>
                )}
              </div>
            )
            const link =
              idx < flatItems.length - 1 ? (
                <div
                  className="timeline-connector timeline-link"
                  aria-hidden="true"
                  key={`link-${idx}`}
                >
                  &#8595;
                </div>
              ) : null
            const header = headerBefore.get(idx)
            return (
              <Fragment key={idx}>
                {header && (
                  <div className="timeline-bucket-header" key={`h-${idx}`}>
                    {header}
                  </div>
                )}
                {node}
                {link}
              </Fragment>
            )
          })}
        </div>
      ) : (
        <EmptyState message="No timeline data." />
      )}
    </div>
  )
}

export default TimelinePanel
