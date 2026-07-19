// Entity Exploration Guide (M5-A-5).
// A lightweight, purely presentational nudge shown at the top of an Entity
// Explore page (right after SummaryPanel) the first time a visitor opens an
// entity. It tells the user what they can explore next about THIS entity and
// offers a few REAL, clickable entry points — already resolved by App from
// data/explorationStarters.ts (ENTITY_STARTERS).
//
// This deliberately mirrors M5-A-4's FirstExplorationGuide and shares its
// visual CSS class family (.he-guide*), but is a SEPARATE component so the
// already-shipped, test-locked A-4 guide is never modified:
//  - No fetch, no localStorage, no navigation logic, no AI/LLM.
//  - Receives `starters` already resolved by App and an `onStarterClick` handler.
//  - Clicking a starter calls onStarterClick(item.target), which App wires to
//    the SAME navigateTo the rest of the app uses. One navigation path.
//  - A local `dismissed` state lets the user hide the nudge for the session;
//    it never writes to storage (no new storage contract).

import { useState } from 'react'
import type { NavNode } from './navigation'
import type { StarterItem } from '../data/explorationStarters'

type EntityExplorationGuideProps = {
  entityId: string
  entityName: string
  starters: StarterItem[]
  onStarterClick: (target: NavNode) => void
}

function EntityExplorationGuide({
  entityId,
  entityName,
  starters,
  onStarterClick,
}: EntityExplorationGuideProps) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <section className="he-guide" aria-label="Explore this entity" data-entity={entityId}>
      <div className="he-guide-head">
        <h3 className="he-guide-heading">Explore {entityName}</h3>
        <button
          type="button"
          className="he-guide-dismiss"
          aria-label="Dismiss this guide"
          onClick={() => setDismissed(true)}
        >
          &times;
        </button>
      </div>
      <p className="he-guide-intro">
        Pick a thread below to keep exploring {entityName} — follow people, ideas, and events connected to it.
      </p>
      {starters.length > 0 ? (
        <ul className="he-guide-list">
          {starters.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                className="he-guide-card"
                data-starter={s.id}
                aria-label={`Explore ${s.label}`}
                onClick={() => onStarterClick(s.target)}
              >
                <span className="he-guide-label">{s.label}</span>
                {s.description ? (
                  <span className="he-guide-desc">{s.description}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

export default EntityExplorationGuide
