import { Fragment } from 'react'
import EmptyState from './EmptyState'
import { sortTimeline, groupTimeline } from '../data/timelineUtils'
import type { TimeValue } from '../data/temporalUtils'

export type TimelineItem = {
  period: string
  event: string
  // M6-P4: optional backend-provided date used for sorting + bucket grouping.
  // Optional so pre-existing { period, event } items stay fully compatible.
  date?: TimeValue
}

type TimelinePanelProps = {
  timeline: TimelineItem[]
  // M2-003: when both handlers are supplied and a timeline event's name
  // matches a known entity, the event becomes clickable and navigates to that
  // entity (Timeline -> Entity -> Timeline loop). Events without a match stay
  // static, so only "associated" time points are interactive.
  nameToId?: Record<string, string>
  onEventClick?: (entityId: string) => void
  // M10-2 (cross-panel focus, CONSUMER only): a local->global id map plus the
  // focused entity's global_id. When an event resolves (name -> local id ->
  // global id) to the focused entity, it is marked is-focused so the linkage
  // set in RelationshipView is mirrored here. This is the forward direction
  // (Relationship -> Focus -> Timeline); Timeline never PRODUCES focus.
  globalIdById?: Record<string, string>
  focusedId?: string
}

function TimelinePanel({
  timeline,
  nameToId,
  onEventClick,
  globalIdById,
  focusedId,
}: TimelinePanelProps) {
  const clickable = typeof onEventClick === 'function' && !!nameToId

  // M6-P4: deterministic ordering + fixed time-bucket grouping.
  // sortTimeline -> groupTimeline are pure; the original node/connector
  // rendering below is unchanged (period / event / navigation preserved).
  const groups = groupTimeline(sortTimeline(timeline))
  const flatItems = groups.flatMap((g) => g.items)
  // Bucket header shown immediately before each group's first item.
  const headerBefore = new Map<number, string>()
  {
    let acc = 0
    for (const g of groups) {
      if (g.items.length > 0) headerBefore.set(acc, g.bucket)
      acc += g.items.length
    }
  }

  return (
    <div className="result-section">
      <h3>Timeline</h3>
      {timeline.length > 0 ? (
        <div className="timeline-flow">
          {flatItems.map((item, idx) => {
            const entityId = clickable ? nameToId![item.event] : undefined
            const interactive = clickable && !!entityId
            // M10-2: resolve the event's global_id (name -> local -> global) and
            // mark it focused when it matches the App-owned focus. Pure lookup;
            // no navigation, no state.
            const localId = nameToId?.[item.event]
            const eventGlobalId = localId ? globalIdById?.[localId] : undefined
            const isFocused =
              typeof focusedId === 'string' && !!eventGlobalId && eventGlobalId === focusedId
            const focusCls = isFocused ? ' is-focused' : ''
            const node = (
              <div className="timeline-node" key={`node-${idx}`}>
                <div className="timeline-period">{item.period}</div>
                <div className="timeline-connector" aria-hidden="true">
                  &#8595;
                </div>
                {interactive ? (
                  <button
                    type="button"
                    className={`timeline-event is-clickable${focusCls}`}
                    aria-label={`Open ${item.event}`}
                    onClick={() => onEventClick!(entityId!)}
                  >
                    {item.event}
                  </button>
                ) : (
                  <div className={`timeline-event${focusCls}`}>{item.event}</div>
                )}
              </div>
            )
            const link =
              idx < flatItems.length - 1 ? (
                <div
                  className="timeline-connector timeline-link"
                  aria-hidden="true"
                  key={`link-${idx}`}
                >
                  &#8595;
                </div>
              ) : null
            const header = headerBefore.get(idx)
            return (
              <Fragment key={idx}>
                {header && (
                  <div className="timeline-bucket-header" key={`h-${idx}`}>
                    {header}
                  </div>
                )}
                {node}
                {link}
              </Fragment>
            )
          })}
        </div>
      ) : (
        <EmptyState message="No timeline data." />
      )}
    </div>
  )
}

export default TimelinePanel
