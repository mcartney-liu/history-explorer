// ============================================================
// M59-007 — ExplorationCard
// Universal entity card for all exploration contexts.
// Variants: default (related), compact (search), featured (hero).
// Pure presentational. Consumes ExplorationCardModel.
// ============================================================

import type { ExplorationCardModel } from '../../data/entity/ExplorationCardModel'
import { Icon } from '../ui/Icon'
import type { IconName } from '../ui/Icon'

export type CardVariant = 'default' | 'compact' | 'featured'

interface ExplorationCardProps {
  model: ExplorationCardModel
  variant?: CardVariant
  onClick?: (target: string) => void
}

const variantClass: Record<CardVariant, string> = {
  default: 'ec ec-default',
  compact: 'ec ec-compact',
  featured: 'ec ec-featured',
}

export function ExplorationCard({
  model,
  variant = 'default',
  onClick,
}: ExplorationCardProps) {
  const { title, subtitle, icon, summary, badges, target } = model
  const cls = variantClass[variant]

  const handleClick = () => (onClick ? onClick(target) : undefined)

  return (
    <article className={cls} onClick={handleClick} role="button" tabIndex={0}>
      {/* Icon — registry key rendered as inline SVG (no emoji) */}
      <div className="ec-icon">
        <Icon name={icon as IconName} size={20} />
      </div>

      {/* Body */}
      <div className="ec-body">
        <div className="ec-header">
          <span className="ec-title">{title}</span>
          <span className="ec-subtitle">{subtitle}</span>
        </div>

        {summary && (
          <p className="ec-summary">{summary}</p>
        )}

        <div className="ec-footer">
          {/* Badges */}
          {badges.length > 0 && (
            <div className="ec-badges">
              {badges.slice(0, 2).map((b, i) => (
                <span key={i} className="ec-badge">{b}</span>
              ))}
            </div>
          )}

          {/* CTA */}
          <span className="ec-cta">
            探索
            <span className="ec-arrow">→</span>
          </span>
        </div>
      </div>
    </article>
  )
}

export default ExplorationCard
