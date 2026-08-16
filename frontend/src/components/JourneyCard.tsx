import type { EntityRelationship } from './EntityPage'
import { recordEvent } from '../data/UserBehaviorEvent'
import { getEntityIcon } from '../data/entity/entityLabels'
import { Icon } from './ui/Icon'
import type { IconName } from './ui/Icon'

export type JourneyCardProps = {
  /** All relationships from the /entity response. */
  relationships: EntityRelationship[]
  /** Current entity name for context. */
  centerEntityName: string
  /** id → display name lookup. */
  nameById?: Record<string, string>
  /** Navigate to a recommended entity. */
  onEntityClick?: (id: string) => void
}

type JourneyRecommendation = {
  otherId: string
  otherName: string
  otherType: string
  otherGlobalId: string | undefined
  otherTopic: string | undefined
  relType: string
  direction: string
  reason: string
  priority: number
}

/** Stable reason descriptions per relationship type + direction. */
function reasonFor(type: string, direction: string, name: string): string {
  const reasons: Record<string, Record<string, string>> = {
    caused: {
      incoming: `${name} 是导致此事件的关键前因。探索起因，理解事件的全貌。`,
      outgoing: `${name} 是此事件直接引发的后果。探索后续，追踪历史的连锁反应。`,
    },
    influenced: {
      incoming: `${name} 显著影响了此事件的发展。理解影响力如何塑造历史。`,
      outgoing: `${name} 受到此事件的深刻影响。探索影响如何扩散至更广泛的文明。`,
    },
    before: {
      incoming: `${name} 在时间上先于此事件。探索时间线，理解历史的阶段演进。`,
      outgoing: `${name} 在此事件之后发生。跟随时间线，看到历史的延续与变迁。`,
    },
    after: {
      incoming: `${name} 在此事件之后。回顾前因后果，理解历史转折。`,
      outgoing: `${name} 在时间上紧随此事件。探索后续发展，追踪历史脉络。`,
    },
    participated_in: {
      incoming: `${name} 参与了此事件。探索关键人物如何推动历史进程。`,
      outgoing: '',
    },
    located_at: {
      incoming: '',
      outgoing: `${name} 是此事件的发生地。探索地理如何塑造历史事件。`,
    },
  }
  return reasons[type]?.[direction] ?? ''
}

const JOURNEY_PRIORITY: Record<string, number> = {
  caused: 0,
  before: 1,
  after: 2,
  influenced: 3,
  participated_in: 4,
  located_at: 5,
}

function buildRecommendations(
  relationships: EntityRelationship[],
): JourneyRecommendation[] {
  return relationships
    .map((r) => {
      const name = r.other.name
      const reason = reasonFor(r.type, r.direction, name)
      if (!reason) return null
      return {
        otherId: r.other.id,
        otherName: name,
        otherType: r.other.type,
        otherGlobalId: r.other.global_id,
        otherTopic: r.other.topic,
        relType: r.type,
        direction: r.direction,
        reason,
        priority: JOURNEY_PRIORITY[r.type] ?? 99,
      }
    })
    .filter((r): r is JourneyRecommendation => r !== null)
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 6)
}

function clickTarget(r: JourneyRecommendation): string {
  return r.otherGlobalId ?? r.otherId
}

function badgeClass(type: string): string {
  if (type === 'caused') return 'jc-causal'
  if (type === 'influenced') return 'jc-influence'
  if (type === 'before' || type === 'after') return 'jc-temporal'
  return 'jc-other'
}

export function JourneyCardView({
  relationships,
  centerEntityName,
  nameById,
  onEntityClick,
}: JourneyCardProps) {
  const recs = buildRecommendations(relationships)

  if (recs.length === 0) {
    return (
      <section className="journey-card" aria-label="探索推荐">
        <h3 className="jc-title">继续探索</h3>
        <p className="jc-empty">
          暂无探索推荐。随着知识图谱的丰富，这里将推荐与 {centerEntityName} 相关的下一步探索方向。
        </p>
      </section>
    )
  }

  return (
    <section className="journey-card" aria-label="探索推荐">
      <h3 className="jc-title">
        继续探索
        <span className="jc-subtitle">· {recs.length} 个推荐方向</span>
      </h3>

      <div className="jc-grid">
        {recs.map((rec, i) => {
          const displayName = nameById?.[rec.otherId] ?? rec.otherName
          return (
            <button
              key={i}
              type="button"
              className="jc-card is-clickable"
              onClick={() => {
                recordEvent({ action: 'click_journey' })
                onEntityClick?.(clickTarget(rec))
              }}
            >
              <div className="jc-card-header">
                <span className={`jc-badge ${badgeClass(rec.relType)}`}>
                  {rec.relType}
                </span>
                <span className="jc-entity-type">{rec.otherType}</span>
              </div>
              <span className="jc-entity-name">
                <Icon
                  name={getEntityIcon(rec.otherType) as IconName}
                  size={16}
                  className="jc-entity-name-icon"
                />
                {displayName}
              </span>
              <p className="jc-reason">{rec.reason}</p>
            </button>
          )
        })}
      </div>
    </section>
  )
}

export default function JourneyCard(props: JourneyCardProps) {
  return <JourneyCardView {...props} />
}
