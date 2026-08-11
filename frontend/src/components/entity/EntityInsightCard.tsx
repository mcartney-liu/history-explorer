// ============================================================
// M60 — EntityInsightCard (upgraded)
// Rich historical insight with key relationships as badges.
// Data source: EntityInsightModel.buildInsight(entity).
// ============================================================

import { useState, type SyntheticEvent } from 'react'
import type { EntityInsight } from '../../data/entity/EntityInsightModel'
import { Icon } from '../ui/Icon'

interface EntityInsightCardProps {
  insight: EntityInsight
  /** Optional entity slug. When provided, a per-entity artwork drop-in
   *  (public/assets/entities/<slug>.webp, with png/jpg/jpeg fallback) is
   *  shown beside the insight. No image dropped → card keeps its plain
   *  style (zero visual change, fully additive & low-risk). */
  entitySlug?: string
}

// Mirror the TopicCard drop-in convention: webp → png → jpg → jpeg.
const ART_FORMATS = ['png', 'jpg', 'jpeg'] as const

export function EntityInsightCard({ insight, entitySlug }: EntityInsightCardProps) {
  const [artOk, setArtOk] = useState(false)

  const handleArtError = (e: SyntheticEvent<HTMLImageElement>) => {
    const el = e.currentTarget
    const step = parseInt(el.dataset.fallback ?? '0', 10)
    if (step < ART_FORMATS.length) {
      el.dataset.fallback = String(step + 1)
      el.src = el.src.replace(/\.[a-z]+$/i, `.${ART_FORMATS[step]}`)
    } else {
      el.style.display = 'none'
    }
  }

  return (
    <div className={`eic surf-card-gold${artOk ? ' has-art' : ''}`}>
      <div className="eic-body">
        <div className="eic-header">
          <span className="eic-label">历史见解</span>
        </div>
        <p className="eic-perspective">一句话讲清：这个实体是什么</p>

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

      {entitySlug && (
        <img
          className="eic-art"
          src={`${import.meta.env.BASE_URL}assets/entities/${entitySlug}.webp`}
          alt=""
          loading="lazy"
          onLoad={() => setArtOk(true)}
          onError={handleArtError}
        />
      )}
    </div>
  )
}

export default EntityInsightCard
