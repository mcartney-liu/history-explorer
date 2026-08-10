import { Fragment, useState } from 'react'
import EmptyState from './EmptyState'
import { sortTimeline, groupTimeline, TIME_BUCKETS } from '../data/timelineUtils'
import type { TimeValue } from '../data/temporalUtils'
import AIExplanationPanel from './AIExplanationPanel'
import { entityContext } from '../data/aiContext'
import { useLocale } from '../data/locale'
import { getTermLabel } from '../locales/terminology'

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
  // focused entity's global_id. When an event resolves (name -> local -> global) to
  // the focused entity, it is marked is-focused so the linkage set in
  // RelationshipView is mirrored here. This is the forward direction
  // (Relationship -> Focus -> Timeline); Timeline never PRODUCES focus.
  globalIdById?: Record<string, string>
  focusedId?: string
  // M12-2: the centered entity's global_id, used as the timeline AI explain
  // context (timeline citation ids are backend-synthesized and NOT resolvable,
  // so the frontend never invents them).
  entityGlobalId?: string
  // M12-2: optional gid -> openEntity handler for citation navigation.
  onNodeClick?: (globalId: string) => void
}

function yearOf(item: TimelineItem): number | undefined {
  const v = item.date?.value
  return typeof v === 'number' && !Number.isNaN(v) ? v : undefined
}

// Fixed bucket labels are calendar intervals (no historical interpretation).
// Map to Chinese for display only.
const ERA_LABEL_ZH: Record<string, string> = {
  'Before 500 BCE': '公元前 500 年前',
  '500 BCE – 1 CE': '公元前 500 – 公元 1',
  '1 – 500 CE': '公元 1 – 500',
  '500 – 1000 CE': '公元 500 – 1000',
  '1000 – 1500 CE': '公元 1000 – 1500',
  'After 1500 CE': '公元 1500 年后',
}

// Narrative era axis — era bands + key-node emphasis. A "key" node is one that
// resolves to a known entity (clickable); the rest are supporting context.
function TimelineAxisView({
  items,
  nameToId,
  onEventClick,
  globalIdById,
  focusedId,
}: {
  items: TimelineItem[]
  nameToId?: Record<string, string>
  onEventClick?: (entityId: string) => void
  globalIdById?: Record<string, string>
  focusedId?: string
}) {
  const sorted = sortTimeline(items)
  const dated = sorted.filter((it) => yearOf(it) !== undefined) as (TimelineItem & {
    date: { value: number }
  })[]
  const hasDated = dated.length >= 2
  const minY = hasDated ? Math.min(...dated.map((d) => d.date.value)) : 0
  const maxY = hasDated ? Math.max(...dated.map((d) => d.date.value)) : 1
  const span = maxY - minY || 1

  const X0 = 64
  const X1 = 620
  const scaleYear = (y: number) => X0 + ((y - minY) / span) * (X1 - X0)
  const posX = (it: TimelineItem): number => {
    const y = yearOf(it)
    if (y !== undefined && hasDated) return scaleYear(y)
    const idx = sorted.indexOf(it)
    return X0 + ((idx + 0.5) / sorted.length) * (X1 - X0)
  }

  const BAND_FILLS = [
    'var(--color-paper-200)',
    'var(--color-paper-300)',
    'var(--color-accent-soft)',
    'var(--color-paper-200)',
    'var(--color-paper-300)',
    'var(--color-accent-soft)',
  ]

  return (
    <svg
      className="timeline-narrative"
      viewBox="0 0 680 250"
      width="100%"
      role="img"
      aria-label="时间线叙事视图"
      style={{ maxWidth: '100%', height: 'auto', display: 'block' }}
    >
      {hasDated &&
        TIME_BUCKETS.map((b, i) => {
          const xMin = Math.max(X0, scaleYear(b.min === -Infinity ? minY : b.min))
          const xMax = Math.min(X1, scaleYear(b.max === Infinity ? maxY : b.max))
          if (xMax - xMin < 4) return null
          const cx = (xMin + xMax) / 2
          const label = ERA_LABEL_ZH[b.label] ?? b.label
          return (
            <g key={`band-${i}`}>
              <rect
                x={xMin}
                y={100}
                width={xMax - xMin}
                height={75}
                rx={4}
                style={{ fill: BAND_FILLS[i % BAND_FILLS.length] }}
              />
              {xMax - xMin > 44 && (
                <text
                  x={cx}
                  y={94}
                  textAnchor="middle"
                  fontSize={10}
                  style={{ fill: 'var(--color-ink-500)' }}
                >
                  {label}
                </text>
              )}
            </g>
          )
        })}

      <line
        x1={X0}
        y1={160}
        x2={X1}
        y2={160}
        style={{ stroke: 'var(--color-ink-300)' }}
        strokeWidth={2}
      />

      {sorted.map((item, idx) => {
        const x = posX(item)
        const entityId = nameToId ? nameToId[item.event] : undefined
        const interactive = typeof onEventClick === 'function' && !!entityId
        const isKey = interactive
        const localId = nameToId?.[item.event]
        const eventGlobalId = localId ? globalIdById?.[localId] : undefined
        const isFocused =
          typeof focusedId === 'string' && !!eventGlobalId && eventGlobalId === focusedId
        const above = idx % 2 === 0
        const labelY = above ? 138 : 186
        const periodY = above ? 124 : 200
        return (
          <g
            key={`axis-${idx}`}
            role={interactive ? 'button' : undefined}
            tabIndex={interactive ? 0 : undefined}
            aria-label={interactive ? item.event : undefined}
            style={interactive ? { cursor: 'pointer' } : undefined}
            onClick={interactive ? () => onEventClick!(entityId!) : undefined}
            onKeyDown={
              interactive
                ? (ev) => {
                    if (ev.key === 'Enter' || ev.key === ' ') {
                      ev.preventDefault()
                      onEventClick!(entityId!)
                    }
                  }
                : undefined
            }
          >
            <line
              x1={x}
              y1={160}
              x2={x}
              y2={above ? 150 : 170}
              style={{ stroke: 'var(--color-ink-300)' }}
              strokeWidth={1}
            />
            <circle
              cx={x}
              cy={160}
              r={isKey ? 10 : 5}
              style={{
                fill: isFocused || isKey ? 'var(--color-accent)' : 'var(--color-paper-300)',
                stroke: 'var(--color-accent)',
              }}
              strokeWidth={isKey || isFocused ? 2.5 : 1.5}
            />
            <text
              x={x}
              y={labelY}
              textAnchor="middle"
              fontSize={isKey ? 12 : 11}
              style={{
                fill: 'var(--color-ink-900)',
                fontWeight: isKey ? 600 : 400,
              }}
            >
              {item.event.length > 16 ? item.event.slice(0, 15) + '…' : item.event}
            </text>
            <text
              x={x}
              y={periodY}
              textAnchor="middle"
              fontSize={10}
              style={{ fill: 'var(--color-ink-500)' }}
            >
              {item.period}
            </text>
          </g>
        )
      })}

      <g transform="translate(64, 226)">
        <circle cx={0} cy={-4} r={8} style={{ fill: 'var(--color-accent)', stroke: 'var(--color-accent)' }} strokeWidth={2} />
        <text x={12} y={0} fontSize={11} style={{ fill: 'var(--color-ink-700)' }}>
          关键节点（可点击）
        </text>
        <circle cx={150} cy={-4} r={5} style={{ fill: 'var(--color-paper-300)', stroke: 'var(--color-accent)' }} strokeWidth={1.5} />
        <text x={162} y={0} fontSize={11} style={{ fill: 'var(--color-ink-700)' }}>
          一般事件
        </text>
      </g>
    </svg>
  )
}

function TimelinePanel({
  timeline,
  nameToId,
  onEventClick,
  globalIdById,
  focusedId,
  entityGlobalId,
  onNodeClick,
}: TimelinePanelProps) {
  const { t, locale } = useLocale()
  const clickable = typeof onEventClick === 'function' && !!nameToId
  const [view, setView] = useState<'axis' | 'list'>('axis')

  const groups = groupTimeline(sortTimeline(timeline))
  const flatItems = groups.flatMap((g) => g.items)
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
      <div className="result-section-head">
        <h3>{getTermLabel('Timeline', locale)}</h3>
        <div className="viz-toggle" role="group" aria-label="时间线视图切换">
          <button type="button" className={view === 'axis' ? 'active' : ''} aria-pressed={view === 'axis'} onClick={() => setView('axis')}>图</button>
          <button type="button" className={view === 'list' ? 'active' : ''} aria-pressed={view === 'list'} onClick={() => setView('list')}>列表</button>
        </div>
      </div>

      {timeline.length === 0 ? (
        <EmptyState message={t('timeline.noData')} />
      ) : view === 'axis' ? (
        <TimelineAxisView
          items={timeline}
          nameToId={nameToId}
          onEventClick={onEventClick}
          globalIdById={globalIdById}
          focusedId={focusedId}
        />
      ) : (
        <div className="timeline-flow">
          {flatItems.map((item, idx) => {
            const entityId = clickable ? nameToId![item.event] : undefined
            const interactive = clickable && !!entityId
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
                    aria-label={t('timeline.openAria', { event: item.event })}
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
      )}

      {entityGlobalId ? (
        <AIExplanationPanel
          contextGlobalIds={entityContext(entityGlobalId)}
          onCitationClick={onNodeClick}
        />
      ) : null}
    </div>
  )
}

export default TimelinePanel
