// ============================================================
// M59-006 — EntityHero
// Layer 1 of Entity Experience v2: the Identity Layer.
// Museum-grade entity entry point. Consumes EntityViewModel.identity.
// M59-016: added onAskAI prop — AI Companion entry point.
// ============================================================

import type { EntityViewModel } from '../../data/entity/entityTypes'
import { getEntityLabel, getEntityIcon } from '../../data/entity/entityLabels'

interface EntityHeroProps {
  identity: EntityViewModel['identity']
  /** M59-016: AI Companion entry callback */
  onAskAI?: () => void
  /** M59-016: Research entry */
  onResearch?: () => void
  /** M59-016: Compare entry */
  onCompare?: () => void
}

export function EntityHero({ identity, onAskAI, onResearch, onCompare }: EntityHeroProps) {
  const { name, type, timeLabel, locationLabel, keyFacts } = identity
  const label = getEntityLabel(type)
  const icon = getEntityIcon(type)

  return (
    <section className="eh" aria-label={`${name} — ${label}`}>
      {/* Badge */}
      <div className="eh-badge">
        <span className="eh-badge-icon">{icon}</span>
        <span className="eh-badge-label">{label}</span>
      </div>

      {/* Name */}
      <h1 className="eh-name">{name}</h1>

      {/* Meta */}
      <div className="eh-meta">
        {timeLabel && (
          <span className="eh-meta-item">
            <span className="eh-meta-icon">◷</span>
            {timeLabel}
          </span>
        )}
        {locationLabel && (
          <span className="eh-meta-item">
            <span className="eh-meta-icon">⌖</span>
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
        {onAskAI && (
          <button type="button" className="eh-action eh-action-ai" onClick={onAskAI}>
            <span>💬</span> 问历史助手
          </button>
        )}
        {onResearch && (
          <button type="button" className="eh-action eh-action-research" onClick={onResearch}>
            <span>🔬</span> 深入研究
          </button>
        )}
        {onCompare && (
          <button type="button" className="eh-action eh-action-compare" onClick={onCompare}>
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
