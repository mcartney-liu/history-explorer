import { Fragment } from 'react'
import EmptyState from './EmptyState'

export type TimelineItem = {
  period: string
  event: string
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

  return (
    <div className="result-section">
      <h3>Timeline</h3>
      {timeline.length > 0 ? (
        <div className="timeline-flow">
          {timeline.map((item, idx) => {
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
              idx < timeline.length - 1 ? (
                <div
                  className="timeline-connector timeline-link"
                  aria-hidden="true"
                  key={`link-${idx}`}
                >
                  &#8595;
                </div>
              ) : null
            return (
              <Fragment key={idx}>
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
