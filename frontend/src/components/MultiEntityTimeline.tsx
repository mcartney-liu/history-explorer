import EmptyState from './EmptyState'
import { formatDateRange, formatTimeValue } from '../data/temporalUtils'
import { TIME_BUCKETS } from '../data/timelineUtils'
import {
  computeAxisBounds,
  layoutBars,
  detectOverlaps,
  type TemporalBar,
} from '../data/temporalAxis'
import {
  compareTemporalRanges,
  buildTemporalComparisonText,
} from '../data/compareTemporal'

// M8-P1: Multi-Entity Temporal Timeline (Explore page).
//
// SCOPE (frozen): PURE presentational layer. It derives each entity's date
// range from EXISTING entity date fields, lays them onto ONE shared year axis
// via the deterministic temporalAxis module, and renders CSS-positioned bars +
// overlap facts (reusing the M7 text engine). No new fetch / API.
//
// PROHIBITED (per M8 Freeze + M7 Freeze + M3.5-000):
//   - NO AI / LLM / generation / recommendation / ranking / similarity
//   - NO generated historical interpretation (only mechanical interval facts)
//   - NO sorting of entities (input order preserved; no hidden behavior)
//   - NO era / civilization inference (axis ticks are fixed calendar years)
//   - NO canvas / SVG / chart library (bars are CSS left% / width%)

interface MultiEntityTimelineProps {
  entities: TemporalBar[]
}

function MultiEntityTimeline({ entities }: MultiEntityTimelineProps) {
  // Keep named entities, dedupe by name, preserve input order (no sorting).
  const seen = new Set<string>()
  const bars: TemporalBar[] = []
  for (const e of entities ?? []) {
    if (!e?.name || !e.name.trim()) continue
    if (seen.has(e.name)) continue
    seen.add(e.name)
    bars.push(e)
  }

  const anyDated = bars.some((b) => !!(b.start_date || b.end_date))

  if (bars.length === 0 || !anyDated) {
    return (
      <div className="result-section">
        <h3>Multi-Entity Timeline</h3>
        <EmptyState message="No entities with temporal data to place on a timeline." />
      </div>
    )
  }

  const bounds = computeAxisBounds(bars)
  const laid = layoutBars(bars, bounds)
  const overlaps = detectOverlaps(bars)

  const span = bounds.max - bounds.min || 1
  // Fixed calendar grid ticks: TIME_BUCKETS boundaries that fall inside the
  // axis window. These are plain years, NOT historical eras.
  const ticks = TIME_BUCKETS.map((b) => b.min)
    .filter((v) => Number.isFinite(v) && v > bounds.min && v < bounds.max)
    .map((v) => ({ value: v, leftPct: ((v - bounds.min) / span) * 100 }))

  // Overlap facts reuse the frozen M7 text engine (no new template strings).
  const overlapFacts = overlaps.map((o) => {
    const ea = bars.find((b) => b.name === o.a)!
    const eb = bars.find((b) => b.name === o.b)!
    const cmp = compareTemporalRanges(
      { start: ea.start_date, end: ea.end_date },
      { start: eb.start_date, end: eb.end_date },
    )
    return { key: `${o.a}|${o.b}`, sentences: buildTemporalComparisonText(cmp, o.a, o.b) }
  })

  const rangeText = (b: TemporalBar) =>
    formatDateRange(b.start_date, b.end_date) ?? 'No date data'

  return (
    <div className="result-section">
      <h3>Multi-Entity Timeline</h3>
      <div className="multi-entity-timeline">
        <div className="multi-entity-axis">
          <span className="multi-entity-axis-end">
            {formatTimeValue({ value: bounds.min })}
          </span>
          <span className="multi-entity-axis-end">
            {formatTimeValue({ value: bounds.max })}
          </span>
        </div>

        <div className="multi-entity-rows">
          {laid.map((bar, i) => (
            <div className="multi-entity-row" key={bar.name}>
              <div className="multi-entity-label">
                <span className="multi-entity-name">{bar.name}</span>
                <span className="multi-entity-range">{rangeText(bars[i])}</span>
              </div>
              <div className="multi-entity-track">
                {ticks.map((t) => (
                  <span
                    key={`tick-${t.value}`}
                    className="multi-entity-tick"
                    style={{ left: `${t.leftPct}%` }}
                    aria-hidden="true"
                  />
                ))}
                {bar.partial === 'none' ? (
                  <span className="multi-entity-nodate">No date data</span>
                ) : bar.partial === 'full' ? (
                  <span
                    className="multi-entity-bar"
                    style={{ left: `${bar.leftPct}%`, width: `${bar.widthPct}%` }}
                    title={rangeText(bars[i])}
                  />
                ) : (
                  <span
                    className={`multi-entity-bar is-point is-${bar.partial}`}
                    style={{ left: `${bar.leftPct}%` }}
                    title={rangeText(bars[i])}
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        {ticks.length > 0 && (
          <div className="multi-entity-scale" aria-hidden="true">
            {ticks.map((t) => (
              <span
                key={`scale-${t.value}`}
                className="multi-entity-scale-tick"
                style={{ left: `${t.leftPct}%` }}
              >
                {formatTimeValue({ value: t.value })}
              </span>
            ))}
          </div>
        )}

        {overlapFacts.length > 0 && (
          <div className="multi-entity-overlaps">
            <div className="multi-entity-overlaps-title">Overlapping spans</div>
            <ul className="multi-entity-overlap-list">
              {overlapFacts.map((f) =>
                f.sentences.map((s, i) => (
                  <li key={`${f.key}-${i}`} className="multi-entity-overlap">
                    {s}
                  </li>
                )),
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

export default MultiEntityTimeline
