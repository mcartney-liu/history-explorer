// ============================================================
// M59-006 — EntityHero
// Layer 1 of Entity Experience v2: the Identity Layer.
// Museum-grade entity entry point. Consumes EntityViewModel.identity.
// M59-016: added onAskAI prop — AI Companion entry point.
// ============================================================

import type { EntityViewModel } from '../../data/entity/entityTypes'
import { getEntityLabel, getEntityIcon } from '../../data/entity/entityLabels'
import { Icon } from '../ui/Icon'
import type { IconName } from '../ui/Icon'

interface EntityHeroProps {
  identity: EntityViewModel['identity']
  /** M59-016: AI Companion entry — hidden in M60 (mock AI is a liability) */
  onAskAI?: () => void
  /** M59-016: Research entry */
  onResearch?: () => void
  /** M59-016: Compare entry */
  onCompare?: () => void
}

export function EntityHero({ identity, onResearch, onCompare }: EntityHeroProps) {
  const { name, type, timeLabel, locationLabel, keyFacts } = identity
  const label = getEntityLabel(type)
  const icon = getEntityIcon(type)

  return (
    <section className="eh surf-card" aria-label={`${name} — ${label}`}>
      {/* Badge */}
      <div className="eh-badge">
        <Icon name={icon as IconName} size={20} className="eh-badge-icon" />
        <span className="eh-badge-label">{label}</span>
      </div>

      {/* Name */}
      <h1 className="eh-name">{name}</h1>

      {/* Meta */}
      <div className="eh-meta">
        {timeLabel && (
          <span className="eh-meta-item">
            <Icon name="time-period" size={16} className="eh-meta-icon" />
            {timeLabel}
          </span>
        )}
        {locationLabel && (
          <span className="eh-meta-item">
            <Icon name="location" size={16} className="eh-meta-icon" />
            {locationLabel}
          </span>
        )}
      </div>

      {/* AI Oneliner placeholder */}
      <div className="eh-ai">
        <span className="eh-ai-label">历史见解生成中...</span>
      </div>

      {/* M59-016: Quick actions */}
      <div className="eh-actions">
        {onResearch && (
          <button type="button" className="eh-action eh-action-research btn" onClick={onResearch}>
            <Icon name="research" size={16} /> 深入研究
          </button>
        )}
        {onCompare && (
          <button type="button" className="eh-action eh-action-compare btn" onClick={onCompare}>
            <span>⇔</span> 加入对比
          </button>
        )}
      </div>

      {/* Key Facts */}
      {keyFacts.length > 0 && (
        <div className="eh-facts">
          {keyFacts.slice(0, 3).map((fact, i) => (
            <div key={i} className="eh-fact-card">
              {fact}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export default EntityHero
