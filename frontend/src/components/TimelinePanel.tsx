import { Fragment } from 'react'

export type TimelineItem = {
  period: string
  event: string
}

type TimelinePanelProps = {
  timeline: TimelineItem[]
  // Optional handler kept for future compatibility (clickable events).
  // When omitted, events render as static text with no interaction.
  onEventClick?: (item: TimelineItem, index: number) => void
}

function TimelinePanel({ timeline, onEventClick }: TimelinePanelProps) {
  const clickable = typeof onEventClick === 'function'

  return (
    <div className="result-section">
      <h3>Timeline</h3>
      {timeline.length > 0 ? (
        <div className="timeline-flow">
          {timeline.map((item, idx) => {
            const node = (
              <div className="timeline-node" key={`node-${idx}`}>
                <div className="timeline-period">{item.period}</div>
                <div className="timeline-connector" aria-hidden="true">
                  &#8595;
                </div>
                {clickable ? (
                  <button
                    type="button"
                    className="timeline-event is-clickable"
                    onClick={() => onEventClick!(item, idx)}
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
        <p className="empty">No timeline data.</p>
      )}
    </div>
  )
}

export default TimelinePanel
