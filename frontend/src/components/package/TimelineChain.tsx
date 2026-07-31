import {
  getEntityDisplayName,
  getEntityStartYear,
  type ExplorationPackage,
  type Locale,
} from '../../data/explorationPackages'
import { getRelationshipLabel } from '../../data/entity/entityLabels'

interface TimelineChainProps {
  pkg: ExplorationPackage
  locale?: Locale
  onEntityClick?: (gid: string) => void
}

// Timeline Journey: 唐 →(早于)→ 宋 →(早于)→ 元 →(早于)→ 明 →(早于)→ 清
// The chain is derived from pkg.timeline_slices (an explicit, ordered list of
// entity refs). Consecutive nodes are connected with the `before` relation label
// so the user understands historical sequence, not a flat list.
export default function TimelineChain({ pkg, locale = 'zh', onEntityClick }: TimelineChainProps) {
  const order = pkg.timeline_slices.map((s) => s.entity)

  return (
    <div className="journey-chain journey-chain--timeline" data-testid="timeline-chain">
      {order.map((gid, i) => {
        const name = getEntityDisplayName(gid, locale)
        const year = getEntityStartYear(gid)
        const isLast = i === order.length - 1
        return (
          <div className="journey-step" key={gid}>
            <button
              type="button"
              className="journey-node"
              data-gid={gid}
              {...(onEntityClick ? { onClick: () => onEntityClick(gid) } : {})}
            >
              <span className="journey-node-name">{name}</span>
              {year != null && <span className="journey-node-meta">{year} 年</span>}
            </button>
            {!isLast && (
              <span className="journey-arrow" aria-hidden="true">
                <span className="journey-arrow-label">{getRelationshipLabel('before', locale)}</span>
                <span className="journey-arrow-glyph">→</span>
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
