import type { EntityRelationship } from './EntityPage'

export type EventNarrativeJourneyProps = {
  /** All relationships from the /entity response. */
  relationships: EntityRelationship[]
  /** Center entity's display name. */
  centerEntityName: string
  /** id → display name lookup. */
  nameById?: Record<string, string>
  /** Navigate to a related entity. */
  onEntityClick?: (id: string) => void
  /** Current entity's owning topic. Cross-topic events show a topic badge. */
  currentTopic?: string
}

/** Priority-ordered journey relationship types. */
const JOURNEY_TYPES = ['caused', 'before', 'after', 'influenced']

function labelFor(relType: string, direction: string): string {
  const map: Record<string, string> = {
    caused: direction === 'incoming' ? '由…导致' : '导致了',
    influenced: direction === 'incoming' ? '受影响于' : '影响了',
    before: '在…之前',
    after: '在…之后',
  }
  return map[relType] ?? relType
}

/** Filter relationships into a narrative journey: Event→Event with priority types. */
function journeyRelationships(relationships: EntityRelationship[]) {
  return relationships
    .filter(
      (r) =>
        r.other.type === 'Event' &&
        JOURNEY_TYPES.includes(r.type),
    )
    .sort((a, b) => {
      // Priority sort: caused > before/after > influenced
      const order = (t: string) => {
        if (t === 'caused') return 0
        if (t === 'before' || t === 'after') return 1
        return 2
      }
      return order(a.type) - order(b.type)
    })
}

/** Derive the click target: prefer global_id for cross-topic uniqueness. */
function clickTarget(r: EntityRelationship): string {
  return r.other.global_id ?? r.other.id
}

/** Returns true when the related event lives in a different dataset. */
function isCrossTopic(r: EntityRelationship, currentTopic?: string): boolean {
  return !!(currentTopic && r.other.topic && r.other.topic !== currentTopic)
}

function topicBadge(r: EntityRelationship): string {
  return r.other.topic ?? ''
}

function badgeClass(relType: string): string {
  if (relType === 'caused') return 'enj-causal'
  if (relType === 'influenced') return 'enj-influence'
  return 'enj-temporal'
}

export function EventNarrativeJourneyView({
  relationships,
  centerEntityName,
  nameById,
  onEntityClick,
  currentTopic,
}: EventNarrativeJourneyProps) {
  const journey = journeyRelationships(relationships)

  if (journey.length === 0) {
    return (
      <section className="event-narrative-journey" aria-label="探索旅程">
        <h3 className="enj-title">探索旅程</h3>
        <p className="enj-empty">
          暂无探索路径数据。随着知识图谱的丰富，这里将展示从当前事件出发的历史探索旅程。
        </p>
      </section>
    )
  }

  const incoming = journey.filter((r) => r.direction === 'incoming')
  const outgoing = journey.filter((r) => r.direction === 'outgoing')

  function renderNode(r: EntityRelationship) {
    const name = nameById?.[r.other.id] ?? r.other.name
    const cross = isCrossTopic(r, currentTopic)
    return (
      <button
        type="button"
        className="enj-node is-clickable"
        onClick={() => onEntityClick?.(clickTarget(r))}
      >
        <span className="enj-node-type">{r.other.type}</span>
        <span className="enj-node-name">{name}</span>
        {cross && (
          <span className="enj-topic-badge" title={`来自 ${topicBadge(r)}`}>
            {topicBadge(r)}
          </span>
        )}
      </button>
    )
  }

  return (
    <section className="event-narrative-journey" aria-label="探索旅程">
      <h3 className="enj-title">探索旅程</h3>
      <p className="enj-subtitle">
        以下是与 {centerEntityName} 直接关联的事件，按因果和时间顺序排列。点击任意节点继续探索。
      </p>

      <div className="enj-chain">
        {incoming.length > 0 && (
          <div className="enj-segment enj-segment--incoming">
            {incoming.map((r, i) => (
              <div key={`in-${i}`} className="enj-step">
                {renderNode(r)}
                <div className="enj-arrow">
                  <span className={`enj-rel-badge ${badgeClass(r.type)}`}>
                    {labelFor(r.type, r.direction)}
                  </span>
                  <span className="enj-arrow-line">↓</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="enj-center">
          <span className="enj-node enj-node--center">
            <span className="enj-node-type">Event</span>
            <span className="enj-node-name">{centerEntityName}</span>
          </span>
          <span className="enj-center-marker">● 当前</span>
        </div>

        {outgoing.length > 0 && (
          <div className="enj-segment enj-segment--outgoing">
            {outgoing.map((r, i) => (
              <div key={`out-${i}`} className="enj-step">
                <div className="enj-arrow">
                  <span className="enj-arrow-line">↓</span>
                  <span className={`enj-rel-badge ${badgeClass(r.type)}`}>
                    {labelFor(r.type, r.direction)}
                  </span>
                </div>
                {renderNode(r)}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

export default function EventNarrativeJourney(props: EventNarrativeJourneyProps) {
  return <EventNarrativeJourneyView {...props} />
}
