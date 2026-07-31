// M74-004-002 (Commit 2A): JourneyTrail — exploration journey visualization.
//
// Visualizes the user's open_entity path from the EXISTING UserBehaviorEvent
// stream (localStorage). This is EXPLORATION JOURNEY VISUALIZATION ONLY — it
// is NOT user profiling, NOT behavioral analytics, NOT personalization:
//   - input  = existing event stream (getEvents / visitedFromEvents)
//   - output = visual exploration path (most recent N steps)
//   - no new event types, no new storage, no backend storage, no analytics
//
// The same visitedFromEvents() sequence is what the touchpoints send to the
// backend Planner as `visited` — one source, two consumers.
import { useMemo } from 'react'
import { useLocale } from '../../data/locale'
import { visitedFromEvents } from '../../data/explorationGuide'
import { getEvents } from '../../data/UserBehaviorEvent'

interface JourneyTrailProps {
  /** Most recent N steps to render (default 5). */
  maxSteps?: number
  /** Existing entity navigation path — reused, never recreated. */
  onEntityClick?: (globalId: string) => void
}

export function JourneyTrail({ maxSteps = 5, onEntityClick }: JourneyTrailProps) {
  const { t } = useLocale()

  // Consume-only: read the existing event stream once per mount. No new
  // collection, no storage writes (PO C1: journey visualization, not profiling).
  const trail = useMemo(() => {
    const all = visitedFromEvents(getEvents())
    return all.slice(-maxSteps)
  }, [maxSteps])

  if (trail.length === 0) return null

  return (
    <section className="journey-trail" data-testid="journey-trail">
      <h4 className="journey-trail-title">{t('ai.journey_trail_title')}</h4>
      <ol className="journey-trail-steps">
        {trail.map((gid, i) => (
          <li key={`${gid}-${i}`} className="journey-trail-step">
            <span className="journey-trail-index">{i + 1}</span>
            {onEntityClick ? (
              <button
                type="button"
                className="journey-trail-link"
                onClick={() => onEntityClick(gid)}
              >
                {gid}
              </button>
            ) : (
              <span className="journey-trail-gid">{gid}</span>
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}

export default JourneyTrail
