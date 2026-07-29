import type { EntityRelationship } from './EntityPage'

export type EventImpactPanelProps = {
  relationships: EntityRelationship[]
  centerEntityName: string
  nameById?: Record<string, string>
  onEntityClick?: (id: string) => void
}

/** Relation types that represent a broad-impact connection to non-Event entities. */
const IMPACT_TYPES = new Set([
  'influenced',
  'caused',
  'spread',
  'invented',
  'discovered',
  'conquered',
  'related_to',
])

function labelFor(relType: string): string {
  const map: Record<string, string> = {
    influenced: '影响',
    caused: '导致',
    spread: '传播至',
    invented: '发明',
    discovered: '发现',
    conquered: '征服',
    related_to: '关联',
  }
  return map[relType] ?? relType
}

function impactRelationships(relationships: EntityRelationship[]) {
  return relationships.filter(
    (r) =>
      r.direction === 'outgoing' &&
      r.other.type !== 'Event' &&
      IMPACT_TYPES.has(r.type),
  )
}

type Group = { type: string; items: EntityRelationship[] }

function groupByType(items: EntityRelationship[]): Group[] {
  const map = new Map<string, EntityRelationship[]>()
  for (const item of items) {
    const t = item.other.type
    if (!map.has(t)) map.set(t, [])
    map.get(t)!.push(item)
  }
  return [...map.entries()].map(([type, items]) => ({ type, items }))
}

export function EventImpactPanelView({
  relationships,
  nameById,
  onEntityClick,
}: EventImpactPanelProps) {
  const impacts = impactRelationships(relationships)

  if (impacts.length === 0) {
    return (
      <section className="event-impact-panel" aria-label="事件长期影响">
        <h3 className="eip-title">长期影响</h3>
        <p className="eip-empty">
          暂无影响数据。随着知识图谱的丰富，这里将展示此事件对文明、技术、宗教等方面的长期影响。
        </p>
      </section>
    )
  }

  const groups = groupByType(impacts)

  return (
    <section className="event-impact-panel" aria-label="事件长期影响">
      <h3 className="eip-title">
        长期影响
        <span className="eip-subtitle">· 此事件影响了 {impacts.length} 个实体</span>
      </h3>

      {groups.map((g, gi) => (
        <div key={gi} className="eip-group">
          <h4 className="eip-group-type">{g.type}</h4>
          <ul className="eip-list">
            {g.items.map((r, i) => {
              const name = nameById?.[r.other.id] ?? r.other.name
              return (
                <li key={i} className="eip-item">
                  <button
                    type="button"
                    className="eip-node is-clickable"
                    onClick={() => onEntityClick?.(r.other.id)}
                  >
                    <span className="eip-node-type">{r.other.type}</span>
                    <span className="eip-node-name">{name}</span>
                  </button>
                  <span className="eip-rel-badge">{labelFor(r.type)}</span>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </section>
  )
}

export default function EventImpactPanel(props: EventImpactPanelProps) {
  return <EventImpactPanelView {...props} />
}
