import {
  getEntityDisplayName,
  type ExplorationPackage,
  type Locale,
  type RelationshipPathRef,
} from '../../data/explorationPackages'
import { getRelationshipLabel } from '../../data/entity/entityLabels'

interface RelationshipChainProps {
  pkg: ExplorationPackage
  locale?: Locale
  onEntityClick?: (gid: string) => void
}

// Walk an edge list into an ordered node chain (works for simple linear
// inheritance: A→B→C). Starts at the node that is a `from` but never a `to`.
function buildSpine(paths: RelationshipPathRef[]): {
  nodes: string[]
  edges: RelationshipPathRef[]
} {
  if (paths.length === 0) return { nodes: [], edges: [] }
  const tos = new Set(paths.map((p) => p.to))
  const start = paths.find((p) => !tos.has(p.from))?.from ?? paths[0].from
  const nextOf = new Map(paths.map((p) => [p.from, p]))
  const nodes: string[] = []
  const edges: RelationshipPathRef[] = []
  const seen = new Set<string>()
  let cur: string | undefined = start
  while (cur && !seen.has(cur)) {
    nodes.push(cur)
    seen.add(cur)
    const edge = nextOf.get(cur)
    if (edge) {
      edges.push(edge)
      cur = edge.to
    } else {
      cur = undefined
    }
  }
  return { nodes, edges }
}

// Relationship Journey: 科举制度 →(继承为)→ 文官体系 →(继承为)→ 内阁制度
// The main spine is the `inherited` chain. Supporting `influenced` / `caused`
// edges are shown as secondary "also shaped by" connectors so the user sees the
// full evolutionary pressure without breaking the linear path.
export default function RelationshipChain({
  pkg,
  locale = 'zh',
  onEntityClick,
}: RelationshipChainProps) {
  const inherited = pkg.relationship_paths.filter((p) => p.type === 'inherited')
  const spine = buildSpine(inherited)
  const side = pkg.relationship_paths.filter(
    (p) => p.type !== 'before' && p.type !== 'inherited',
  )

  return (
    <div className="journey-chain journey-chain--relationship" data-testid="relationship-chain">
      <div className="journey-spine">
        {spine.nodes.map((gid, i) => {
          const name = getEntityDisplayName(gid, locale)
          const isLast = i === spine.nodes.length - 1
          const edge = spine.edges[i]
          return (
            <div className="journey-step" key={gid}>
              <button
                type="button"
                className="journey-node"
                data-gid={gid}
                {...(onEntityClick ? { onClick: () => onEntityClick(gid) } : {})}
              >
                <span className="journey-node-name">{name}</span>
              </button>
              {!isLast && edge && (
                <span className="journey-arrow" aria-hidden="true">
                  <span className="journey-arrow-label">{getRelationshipLabel(edge.type, locale)}</span>
                  <span className="journey-arrow-glyph">→</span>
                </span>
              )}
            </div>
          )
        })}
      </div>

      {side.length > 0 && (
        <div className="journey-side">
          <p className="journey-side-label">同时受到：</p>
          <ul className="journey-side-list">
            {side.map((p) => (
              <li key={`${p.from}-${p.to}-${p.type}`} className="journey-side-item">
                <button
                  type="button"
                  className="journey-side-from"
                  {...(onEntityClick ? { onClick: () => onEntityClick(p.from) } : {})}
                >
                  {getEntityDisplayName(p.from, locale)}
                </button>
                <span className="journey-side-rel">{getRelationshipLabel(p.type, locale)}</span>
                <button
                  type="button"
                  className="journey-side-to"
                  {...(onEntityClick ? { onClick: () => onEntityClick(p.to) } : {})}
                >
                  {getEntityDisplayName(p.to, locale)}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
