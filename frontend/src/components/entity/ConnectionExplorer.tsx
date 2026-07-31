// ============================================================
// M59-008 — ConnectionExplorer
// Layer 3 of Entity Experience v2: the Connection Layer.
// Combines ViewSwitcher with Graph/Timeline/Map views.
// Consumes EntityViewModel.connections directly.
// ============================================================

import { useState } from 'react'
import type { ViewMode } from './ViewSwitcher'
import { ViewSwitcher } from './ViewSwitcher'
import type { GraphNode, GraphEdge } from '../../data/entity/entityTypes'
import type { TimelineEvent } from '../../data/entity/entityTypes'
import { useLocale } from '../../data/locale'
import { getEntityLabel } from '../../data/entity/entityLabels'

interface ConnectionExplorerProps {
  graphNodes: GraphNode[]
  graphEdges: GraphEdge[]
  timeline: TimelineEvent[]
  onEntityClick?: (id: string) => void
}

export function ConnectionExplorer({
  graphNodes,
  graphEdges,
  timeline,
  onEntityClick,
}: ConnectionExplorerProps) {
  const { locale } = useLocale()
  const [mode, setMode] = useState<ViewMode>('graph')

  return (
    <section className="ce" aria-label="实体探索连接">
      <ViewSwitcher current={mode} onChange={setMode} />

      <div className="ce-view">
        {mode === 'graph' && (
          <div className="ce-graph">
            {graphNodes.length === 0 ? (
              <div className="ce-empty">暂无关系网络数据</div>
            ) : (
              <div className="ce-graph-grid">
                {graphNodes.map((node) => (
                  <div
                    key={node.id}
                    className="ce-graph-node"
                    role="button"
                    tabIndex={0}
                    onClick={() => onEntityClick?.(node.id)}
                  >
                    <span className="ce-graph-node-name">{node.name}</span>
                    <span className="ce-graph-node-type">{getEntityLabel(node.type, locale)}</span>
                  </div>
                ))}
              </div>
            )}
            {graphEdges.length > 0 && (
              <div className="ce-graph-edges">
                {graphEdges.slice(0, 5).map((edge, i) => (
                  <span key={i} className="ce-edge-label">
                    {edge.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {mode === 'timeline' && (
          <div className="ce-timeline">
            {timeline.length === 0 ? (
              <div className="ce-empty">暂无时间线数据</div>
            ) : (
              <div className="ce-timeline-list">
                {timeline.slice(0, 8).map((event, i) => (
                  <div key={i} className="ce-timeline-node">
                    <div className="ce-timeline-dot" />
                    <div className="ce-timeline-content">
                      <span className="ce-timeline-year">
                        {event.year ?? event.date ?? ''}
                      </span>
                      <span className="ce-timeline-label">
                        {(event.label ?? event.name ?? event.event) as string}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {mode === 'map' && (
          <div className="ce-map">
            <div className="ce-empty">空间视图即将上线</div>
          </div>
        )}
      </div>
    </section>
  )
}

export default ConnectionExplorer
