import { useState } from 'react'
import EmptyState from './EmptyState'
import { formatDateRange, type TimeValue } from '../data/temporalUtils'
import {
  compareTemporalRanges,
  buildTemporalComparisonText,
  type TemporalRange,
} from '../data/compareTemporal'

// M7-P2: Cross-Entity Temporal Comparison panel (Explore page).
//
// SCOPE (frozen): PURE presentational layer. It derives each selected
// entity's TemporalRange from EXISTING entity date fields, calls the Phase 1
// deterministic engine, and renders template facts. No new fetch / API.
//
// PROHIBITED (per M7 Freeze + M3.5-000):
//   - NO AI / LLM / generation / recommendation / ranking / similarity
//   - NO generated historical interpretation (only mechanical interval facts)
//   - NO sorting of entities (preserve input order; no hidden behavior)
//   - NO autocomplete / ranking / similarity sorting in the UI

export interface TemporalEntity {
  name: string
  start_date?: TimeValue
  end_date?: TimeValue
}

interface TemporalComparisonPanelProps {
  entities: TemporalEntity[]
}

function hasDate(e: TemporalEntity): boolean {
  return !!(e.start_date || e.end_date)
}

function TemporalComparisonPanel({ entities }: TemporalComparisonPanelProps) {
  // 1. Keep named entities only, dedupe by name, preserve input order.
  //    No sorting — avoids any hidden ranking / similarity behavior.
  const seen = new Set<string>()
  const named: TemporalEntity[] = []
  for (const e of entities ?? []) {
    if (!e?.name || !e.name.trim()) continue
    if (seen.has(e.name)) continue
    seen.add(e.name)
    named.push(e)
  }

  // 2. Default selection: first dated entity as A, first *different* dated
  //    entity as B. Falls back to the first two entities when dates are
  //    missing (engine then reports `comparable: false`, handled below).
  const initial = (() => {
    if (named.length < 2) return { a: 0, b: 0 }
    const da = named.findIndex(hasDate)
    const a = da >= 0 ? da : 0
    let b = named.findIndex((e, i) => i !== a && hasDate(e))
    if (b < 0) b = named.findIndex((_, i) => i !== a)
    if (b < 0) b = a === 0 ? 1 : 0
    return { a, b }
  })()

  const [aIdx, setAIdx] = useState(initial.a)
  const [bIdx, setBIdx] = useState(initial.b)

  // Not enough comparable entities for a two-sided comparison.
  if (named.length < 2) {
    return (
      <div className="result-section">
        <h3>Temporal Comparison</h3>
        <p className="temporal-comparison-empty">
          Not enough entities with temporal data for comparison.
        </p>
      </div>
    )
  }

  const safeA = Math.min(Math.max(aIdx, 0), named.length - 1)
  const safeB = Math.min(Math.max(bIdx, 0), named.length - 1)
  const entityA = named[safeA]
  const entityB = named[safeB]

  const rangeA: TemporalRange = { start: entityA.start_date, end: entityA.end_date }
  const rangeB: TemporalRange = { start: entityB.start_date, end: entityB.end_date }
  const cmp = compareTemporalRanges(rangeA, rangeB)
  const facts = cmp.comparable
    ? buildTemporalComparisonText(cmp, entityA.name, entityB.name)
    : []

  const rangeText = (e: TemporalEntity) =>
    formatDateRange(e.start_date, e.end_date) ?? 'No date data'

  return (
    <div className="result-section">
      <h3>Temporal Comparison</h3>
      <div className="temporal-comparison-panel">
        <div className="temporal-comparison-selects">
          <div className="temporal-comparison-field">
            <label
              className="temporal-comparison-field-label"
              htmlFor="tc-entity-a"
            >
              Entity A
            </label>
            <select
              id="tc-entity-a"
              className="temporal-comparison-select"
              aria-label="Entity A"
              value={safeA}
              onChange={(e) => setAIdx(Number(e.target.value))}
            >
              {named.map((en, i) => (
                <option key={en.name} value={i}>
                  {en.name}
                </option>
              ))}
            </select>
          </div>
          <div className="temporal-comparison-field">
            <label
              className="temporal-comparison-field-label"
              htmlFor="tc-entity-b"
            >
              Entity B
            </label>
            <select
              id="tc-entity-b"
              className="temporal-comparison-select"
              aria-label="Entity B"
              value={safeB}
              onChange={(e) => setBIdx(Number(e.target.value))}
            >
              {named.map((en, i) => (
                <option key={en.name} value={i}>
                  {en.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="temporal-comparison-entities">
          <div className="temporal-comparison-entity">
            <div className="temporal-comparison-entity-name">{entityA.name}</div>
            <div className="temporal-comparison-entity-range">
              {rangeText(entityA)}
            </div>
          </div>
          <div className="temporal-comparison-entity">
            <div className="temporal-comparison-entity-name">{entityB.name}</div>
            <div className="temporal-comparison-entity-range">
              {rangeText(entityB)}
            </div>
          </div>
        </div>

        {cmp.comparable ? (
          facts.length > 0 ? (
            <ul className="temporal-comparison-facts">
              {facts.map((f, i) => (
                <li key={i} className="temporal-comparison-fact">
                  {f}
                </li>
              ))}
            </ul>
          ) : (
            <p className="temporal-comparison-empty">
              No temporal relationship could be determined from the available dates.
            </p>
          )
        ) : (
          <EmptyState message="Selected entities lack sufficient date data for comparison." />
        )}
      </div>
    </div>
  )
}

export default TemporalComparisonPanel
