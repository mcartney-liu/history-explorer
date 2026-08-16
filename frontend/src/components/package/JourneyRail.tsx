import { useMemo } from 'react'
import type { ExplorationPackage, Locale } from '../../data/explorationPackages'
import { getEntityDisplayName } from '../../data/explorationPackages'
import { getEntityIcon, entityTypeFromGlobalId } from '../../data/entity/entityLabels'
import { Icon } from '../ui/Icon'
import type { IconName } from '../ui/Icon'

interface JourneyRailProps {
  pkg: ExplorationPackage
  locale?: Locale
  /** global_ids the user has already visited in this package (from behavior events). */
  visited?: string[]
  /** jump to an entity by global_id (drills into the Knowledge Graph). */
  onEntityClick?: (gid: string) => void
}

export interface Station {
  gid: string
  name: string
  index: number
}

// Build an ordered, de-duplicated station list from the package's curated
// timeline + relationship paths. Pure presentation over the frozen Knowledge
// Graph — no new fields, no backend, no fabricated facts. This is the "script
// skeleton" that lets the user perceive the WHOLE journey (where they are +
// what's left) at a glance, answering the "no itinerary / no sense of progress"
// pain point from the founder dry-run.
export function buildStations(pkg: ExplorationPackage): Station[] {
  const seen = new Set<string>()
  const out: Station[] = []
  const push = (gid: string) => {
    if (!gid || seen.has(gid)) return
    seen.add(gid)
    out.push({ gid, name: getEntityDisplayName(gid), index: out.length + 1 })
  }
  // Time journey first (the when), then the relationship evolution chain (the
  // how). De-dup keeps each station listed once in reading order.
  for (const s of pkg.timeline_slices) push(s.entity)
  for (const p of pkg.relationship_paths) {
    push(p.from)
    push(p.to)
  }
  return out
}

export default function JourneyRail({
  pkg,
  locale = 'zh',
  visited = [],
  onEntityClick,
}: JourneyRailProps) {
  const stations = useMemo(() => buildStations(pkg), [pkg])
  const visitedSet = useMemo(() => new Set(visited), [visited])
  const total = stations.length
  const done = stations.filter((s) => visitedSet.has(s.gid)).length
  const pct = total ? Math.round((done / total) * 100) : 0
  const goals = pkg.exploration_goals[locale] ?? pkg.exploration_goals.zh

  return (
    <aside className="journey-rail" aria-label="探索行程">
      <div className="journey-rail-head">
        <span className="journey-rail-kicker">探索行程</span>
        <h2 className="journey-rail-title">{pkg.title[locale] ?? pkg.title.zh}</h2>
        <p className="journey-rail-goal">{goals}</p>
      </div>

      <div className="journey-rail-progress">
        <div
          className="journey-rail-bar"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <span className="journey-rail-bar-fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="journey-rail-progress-text">已探 {done} / {total} 站</span>
      </div>

      <ol className="journey-rail-list">
        {stations.map((s) => {
          const isDone = visitedSet.has(s.gid)
          return (
            <li key={s.gid} className={`journey-rail-item${isDone ? ' is-done' : ''}`}>
              <button
                type="button"
                className="journey-rail-node"
                onClick={() => onEntityClick?.(s.gid)}
              >
                <span className="journey-rail-dot" aria-hidden="true">{isDone ? '' : s.index}</span>
                <span className="journey-rail-name">
                  <Icon
                    name={getEntityIcon(entityTypeFromGlobalId(s.gid)) as IconName}
                    size={16}
                    className="journey-rail-name-icon"
                  />
                  {s.name}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </aside>
  )
}
