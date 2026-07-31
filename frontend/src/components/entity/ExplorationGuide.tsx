// ============================================================
// M59-017 — ExplorationGuide
// Guidance layer between EntityHero and ConnectionExplorer.
// Shows: what to explore next, exploration progress, path.
// Pure presentational. Consumes EntityViewModel.connections.
// ============================================================

import type { GraphNode, GraphEdge } from '../../data/entity/entityTypes'
import { Icon } from '../ui/Icon'
import { useLocale } from '../../data/locale'
import { getEntityLabel } from '../../data/entity/entityLabels'

interface ExplorationGuideProps {
  /** Current entity name */
  entityName: string
  /** All graph nodes */
  nodes: GraphNode[]
  /** All graph edges */
  edges: GraphEdge[]
  /** Already visited entity ids */
  visitedIds?: string[]
  /** Total timeline events */
  timelineCount: number
  /** On click next recommended entity */
  onExploreNode?: (id: string) => void
}

export function ExplorationGuide({
  entityName,
  nodes,
  edges,
  visitedIds = [],
  timelineCount,
  onExploreNode,
}: ExplorationGuideProps) {
  const { locale } = useLocale()
  const totalRelations = edges.length
  const totalRelated = nodes.filter((n) => n.id !== entityName && n.name !== entityName).length
  const visitedCount = visitedIds.length

  // Find recommended next entity: first unvisited related node
  const nextNode = nodes.find(
    (n) => n.name !== entityName && n.id !== entityName && !visitedIds.includes(n.id),
  )

  // Exploration depth: 0–4 based on visited + connections
  const depth = Math.min(4, visitedCount + (totalRelated > 0 ? 1 : 0))

  return (
    <section className="eg" aria-label="探索引导">
      {/* Progress bar */}
      <div className="eg-progress">
        <div className="eg-progress-bar" style={{ width: `${(depth / 4) * 100}%` }} />
      </div>

      <div className="eg-body">
        {/* Stats */}
        <div className="eg-stats">
          <span className="eg-stat">
            {totalRelated} 关联实体
          </span>
          <span className="eg-stat">
            {totalRelations} 条关系
          </span>
          <span className="eg-stat">
            {timelineCount} 个时间节点
          </span>
        </div>

        {/* Recommended next */}
        {nextNode && (
          <div className="eg-next">
            <span className="eg-next-label">推荐探索</span>
            <button
              type="button"
              className="eg-next-card"
              onClick={() => onExploreNode?.(nextNode.id)}
            >
              <Icon
                name={
                  nextNode.type === 'Person'
                    ? 'person'
                    : nextNode.type === 'Civilization'
                      ? 'civilization'
                      : nextNode.type === 'Event'
                        ? 'event'
                        : 'globe'
                }
                size={20}
                className="eg-next-icon"
              />
              <div>
                <span className="eg-next-name">{nextNode.name}</span>
                <span className="eg-next-type">{getEntityLabel(nextNode.type, locale)}</span>
              </div>
              <span className="eg-next-arrow">→</span>
            </button>
          </div>
        )}

        {/* Exploration path */}
        {visitedIds.length > 0 && (
          <div className="eg-path">
            <span className="eg-path-label">探索路径</span>
            <div className="eg-path-items">
              {visitedIds.slice(-4).map((id, i) => (
                <span key={id} className="eg-path-step">
                  {i > 0 && <span className="eg-path-arr">→</span>}
                  <span className="eg-path-name">{id}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

export default ExplorationGuide
