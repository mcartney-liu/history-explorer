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
import { getEntityLabel, getEntityIcon } from '../../data/entity/entityLabels'
import { Icon } from '../ui/Icon'
import type { IconName } from '../ui/Icon'
import { formatTimeValue, type TimeValue } from '../../data/temporalUtils'

interface ConnectionExplorerProps {
  graphNodes: GraphNode[]
  graphEdges: GraphEdge[]
  timeline: TimelineEvent[]
  onEntityClick?: (id: string) => void
}

// The backend returns each timeline event's `date` as a *TimeValue* object
// ({ value, precision, certainty, label }), even though TimelineEvent types
// it as `string`. Rendering that object directly throws
// "Objects are not valid as a React child". Normalize to a string so the
// timeline view never crashes regardless of which shape the data arrives in.
function eventDateLabel(event: TimelineEvent): string {
  if (event.year != null && event.year !== '') return String(event.year)
  const d = event.date
  if (typeof d === 'string') return d
  if (d && typeof d === 'object') {
    const s = formatTimeValue(d as TimeValue)
    if (s) return s
  }
  return ''
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
                    <span className="ce-graph-node-name"><Icon name={getEntityIcon(node.type) as IconName} size={16} className="ce-graph-node-icon" />{node.name}</span>
                    <span className="ce-graph-node-type">{getEntityLabel(node.type, locale)}</span>
                  </div>
                ))}
              </div>
            )}
            {graphEdges.length > 0 && (
              <div className="ce-graph-edges">
                {graphEdges.slice(0, 5).map((edge, i) => {
                  const targetName =
                    graphNodes.find((n) => n.id === edge.target)?.name ?? edge.target
                  return (
                    <span key={i} className="ce-edge-label">
                      <span className="ce-edge-rel">{edge.label}</span>
                      <button
                        type="button"
                        className="ce-edge-target"
                        onClick={() => onEntityClick?.(edge.target)}
                        title={`查看 ${targetName}`}
                      >
                        {targetName}
                      </button>
                    </span>
                  )
                })}
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
                        {eventDateLabel(event)}
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
