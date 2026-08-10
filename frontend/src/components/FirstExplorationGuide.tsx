// First Exploration Guide (M5-A-4).
// A lightweight, purely presentational nudge shown at the top of a Topic
// Explore page (right after SummaryPanel) the first time a visitor lands on a
// topic. It tells the user what they can do next and offers a few REAL,
// clickable entry points into the exploration, already resolved by App from
// data/explorationStarters.ts.
//
// Deliberately presentational and dependency-free, mirroring FeaturedTopics:
//  - No fetch, no localStorage, no navigation logic, no AI/LLM.
//  - Receives `starters` already resolved by App and an `onStarterClick` handler.
//  - Clicking a starter calls onStarterClick(item.target), which App wires to
//    the SAME navigateTo the rest of the app uses. One navigation path.
//  - A local `dismissed` state lets the user hide the nudge for the session;
//    it never writes to storage (no new storage contract).

import { useState } from 'react'
import { useLocale } from '../data/locale'
import { usePreferences, getDisplayName } from '../lib/preferences'
import type { NavNode } from './navigation'
import type { StarterItem } from '../data/explorationStarters'

type FirstExplorationGuideProps = {
  topic: string
  title: string
  starters: StarterItem[]
  onStarterClick: (target: NavNode) => void
}

function FirstExplorationGuide({
  topic,
  title,
  starters,
  onStarterClick,
}: FirstExplorationGuideProps) {
  const [dismissed, setDismissed] = useState(false)
  const { t, locale } = useLocale()
  const [prefs] = usePreferences()

  if (dismissed) return null

  return (
    <section className="he-guide" aria-label={t('discover.guideTopicAria')} data-topic={topic}>
      <div className="he-guide-head">
        <h3 className="he-guide-heading">{t('discover.exploreHeading', { title })}</h3>
        <button
          type="button"
          className="he-guide-dismiss"
          aria-label={t('discover.dismissAria')}
          onClick={() => setDismissed(true)}
        >
          &times;
        </button>
      </div>
      <p className="he-guide-intro">
        {t('discover.firstGuideIntro')}
      </p>
      {starters.length > 0 ? (
        <ul className="he-guide-list">
          {starters.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                className="he-guide-card"
                data-starter={s.id}
                aria-label={t('discover.exploreStarterAria', {
                  label: getDisplayName(s.label, locale, prefs.properNameMode),
                })}
                onClick={() => onStarterClick(s.target)}
              >
                <span className="he-guide-label">
                  {getDisplayName(s.label, locale, prefs.properNameMode)}
                </span>
                {s.description ? (
                  <span className="he-guide-desc">{s.description}</span>
                ) : null}
                {s.reason ? (
                  <span className="he-guide-reason">{s.reason}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

export default FirstExplorationGuide
