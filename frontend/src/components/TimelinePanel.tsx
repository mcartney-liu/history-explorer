export type TimelineItem = {
  period: string
  event: string
}

type TimelinePanelProps = {
  timeline: TimelineItem[]
}

function TimelinePanel({ timeline }: TimelinePanelProps) {
  return (
    <div className="result-section">
      <h3>Timeline</h3>
      {timeline.length > 0 ? (
        <ul className="timeline-list">
          {timeline.map((item, idx) => (
            <li key={idx}>
              <span className="period">{item.period}</span>
              <span className="event">{item.event}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="empty">No timeline data.</p>
      )}
    </div>
  )
}

export default TimelinePanel
