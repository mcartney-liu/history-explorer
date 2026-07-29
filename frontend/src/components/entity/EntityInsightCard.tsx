// ============================================================
// M60 — EntityInsightCard (upgraded)
// Rich historical insight with key relationships as badges.
// Data source: EntityInsightModel.buildInsight(entity).
// ============================================================

import type { EntityInsight } from '../../data/entity/EntityInsightModel'
import { Icon } from '../ui/Icon'

interface EntityInsightCardProps {
  insight: EntityInsight
}

export function EntityInsightCard({ insight }: EntityInsightCardProps) {
  return (
    <div className="eic surf-card-gold">
      <div className="eic-header">
        <span className="eic-label">历史洞察</span>
      </div>

      {/* Narrative paragraph */}
      <p className="eic-text">{insight.text}</p>

      {/* Key relationships */}
      {insight.keyNames.length > 0 && (
        <div className="eic-badges">
          {insight.keyNames.map((name) => (
            <span key={name} className="eic-badge">{name}</span>
          ))}
        </div>
      )}

      {/* Timeline highlights */}
      {insight.timelineHighlights.length > 0 && (
        <div className="eic-timeline-chips">
          {insight.timelineHighlights.map((event, i) => (
            <span key={i} className="eic-chip"><Icon name="time-period" size={16} /> {event}</span>
          ))}
        </div>
      )}
    </div>
  )
}

export default EntityInsightCard
