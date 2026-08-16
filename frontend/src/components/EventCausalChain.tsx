import type { EntityRelationship } from './EntityPage'
import { useLocale } from '../data/locale'
import { Icon } from './ui/Icon'
import type { IconName } from './ui/Icon'
import { getEntityLabel, getEntityIcon } from '../data/entity/entityLabels'

export type EventCausalChainProps = {
  /** All relationships from the /entity response. Filtered internally. */
  relationships: EntityRelationship[]
  /** Center entity's display name (for "this event" label). */
  centerEntityName: string
  /** id -> display name lookup (already built in EntityPage). */
  nameById?: Record<string, string>
  /** Navigate to a related entity (local id). */
  onEntityClick?: (id: string) => void
}

/** Relation types that represent causal or temporal Event→Event links. */
const CAUSAL_TYPES = new Set(['caused', 'influenced'])
const TEMPORAL_TYPES = new Set(['before', 'after'])

function labelFor(otherType: string, direction: string): string {
  if (otherType === 'caused') return direction === 'incoming' ? '→ 导致' : '导致 →'
  if (otherType === 'influenced') return direction === 'incoming' ? '→ 影响' : '影响 →'
  if (otherType === 'before') return '← 在之前'
  if (otherType === 'after') return '在之后 →'
  return otherType
}

function eventRelationships(relationships: EntityRelationship[]) {
  return relationships.filter(
    (r) =>
      r.other.type === 'Event' &&
      (CAUSAL_TYPES.has(r.type) || TEMPORAL_TYPES.has(r.type)),
  )
}

/** Pure presentational view — drives every visual state from props. */
export function EventCausalChainView({
  relationships,
  centerEntityName,
  nameById,
  onEntityClick,
}: EventCausalChainProps) {
  const { locale } = useLocale()
  const chain = eventRelationships(relationships)

  if (chain.length === 0) {
    return (
      <section className="event-causal-chain" aria-label="事件因果链">
        <h3 className="ecc-title">事件因果链</h3>
        <p className="ecc-empty">
          暂无因果链数据。随着知识图谱的丰富，这里将展示事件的因果关联。
        </p>
      </section>
    )
  }

  const incoming = chain.filter((r) => r.direction === 'incoming')
  const outgoing = chain.filter((r) => r.direction === 'outgoing')

  const badge = (relType: string) => {
    if (CAUSAL_TYPES.has(relType)) return 'ecc-causal'
    return 'ecc-temporal'
  }

  return (
    <section className="event-causal-chain" aria-label="事件因果链">
      <h3 className="ecc-title">事件因果链</h3>

      {incoming.length > 0 && (
        <div className="ecc-group ecc-group--incoming">
          <h4 className="ecc-group-title">导致此事件</h4>
          <ul className="ecc-list">
            {incoming.map((r, i) => {
              const name = nameById?.[r.other.id] ?? r.other.name
              return (
                <li key={`in-${i}`} className="ecc-item">
                  <button
                    type="button"
                    className="ecc-node is-clickable"
                    onClick={() => onEntityClick?.(r.other.id)}
                  >
                    <span className="ecc-node-type">{getEntityLabel(r.other.type, locale)}</span>
                    <Icon
                      name={getEntityIcon(r.other.type) as IconName}
                      size={16}
                      className="ecc-node-name-icon"
                    />
                    <span className="ecc-node-name">{name}</span>
                  </button>
                  <span className={`ecc-arrow ${badge(r.type)}`}>
                    {labelFor(r.type, r.direction)}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <div className="ecc-center">
        <span className="ecc-node ecc-node--center">
          <span className="ecc-node-type">{getEntityLabel('Event', locale)}</span>
          <Icon
            name={getEntityIcon('Event') as IconName}
            size={16}
            className="ecc-node-name-icon"
          />
          <span className="ecc-node-name">{centerEntityName}</span>
        </span>
      </div>

      {outgoing.length > 0 && (
        <div className="ecc-group ecc-group--outgoing">
          <h4 className="ecc-group-title">此事件导致</h4>
          <ul className="ecc-list">
            {outgoing.map((r, i) => {
              const name = nameById?.[r.other.id] ?? r.other.name
              return (
                <li key={`out-${i}`} className="ecc-item">
                  <span className={`ecc-arrow ${badge(r.type)}`}>
                    {labelFor(r.type, r.direction)}
                  </span>
                  <button
                    type="button"
                    className="ecc-node is-clickable"
                    onClick={() => onEntityClick?.(r.other.id)}
                  >
                    <span className="ecc-node-type">{getEntityLabel(r.other.type, locale)}</span>
                    <Icon
                      name={getEntityIcon(r.other.type) as IconName}
                      size={16}
                      className="ecc-node-name-icon"
                    />
                    <span className="ecc-node-name">{name}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </section>
  )
}

/** Container component — thin wrapper that keeps EntityPage integration simple.
 *  All rendering logic lives in the presentational EventCausalChainView so it
 *  can be tested without a DOM (same pattern as AIExplanationView). */
export default function EventCausalChain(props: EventCausalChainProps) {
  return <EventCausalChainView {...props} />
}
