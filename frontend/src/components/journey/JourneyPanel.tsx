// M35 Feature D — JourneyPanel (presentational, localStorage-backed).
//
// Shows the user's exploration path recorded by journey.ts. Pure React + the
// journey store; no new dependency, no API. Reads once on mount (the panel is
// mounted on the home screen, so it reflects the journey accumulated so far).

import { useState } from 'react'
import { getJourney, clearJourney, type JourneyEntry } from '../../lib/journey'

type JourneyPanelProps = {
  onNavigate?: (entry: JourneyEntry) => void
  onClearComplete?: () => void
}

function formatTs(ts: number): string {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function JourneyPanel({ onNavigate, onClearComplete }: JourneyPanelProps) {
  const [entries, setEntries] = useState<JourneyEntry[]>(() => getJourney())

  const clear = () => {
    clearJourney()
    setEntries([])
    onClearComplete?.()
  }

  if (entries.length === 0) {
    return (
      <section className="journey-panel journey-panel--empty" aria-label="Your exploration journey">
        <h3 className="journey-heading">探索足迹 · Journey</h3>
        <p className="journey-empty">还没有记录。开始一次探索，这里会留下你的足迹。</p>
      </section>
    )
  }

  return (
    <section className="journey-panel" aria-label="Your exploration journey">
      <div className="journey-head">
        <h3 className="journey-heading">探索足迹 · Journey</h3>
        <button type="button" className="journey-clear" onClick={clear}>
          清空
        </button>
      </div>
      <ol className="journey-list">
        {entries.map((e, i) => (
          <li key={`${e.globalId}-${e.ts}-${i}`} className="journey-item" data-kind={e.kind}>
            <button
              type="button"
              className="journey-item-btn"
              aria-label={`Revisit ${e.label}`}
              onClick={() => onNavigate?.(e)}
            >
              <span className="journey-kind">{e.kind === 'topic' ? '主题' : e.kind === 'causal_object' ? '理解' : '实体'}</span>
              <span className="journey-label">{e.label}</span>
              <span className="journey-time">{formatTs(e.ts)}</span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  )
}

export default JourneyPanel
