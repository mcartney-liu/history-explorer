// ============================================================
// M65 Phase 2A — TopicCard
// Shared presentational component for a single topic card.
// Used by both LandingPage and DiscoverPage.
// Zero business logic. Zero state.
// ============================================================

import { useLocale } from '../../data/locale'

export interface TopicCardData {
  slug: string
  label: string
  desc?: string
}

interface TopicCardProps {
  card: TopicCardData
  onClick: (slug: string) => void
  /** 'default' = LandingPage he-card; 'entity' = DiscoverPage theme-card */
  variant?: 'default' | 'entity'
}

export function TopicCard({ card, onClick, variant = 'default' }: TopicCardProps) {
  const { t } = useLocale()

  if (variant === 'entity') {
    return (
      <button
        type="button"
        className="discover-theme-card"
        data-topic={card.slug}
        aria-label={t('discover.topicAria', { label: card.label })}
        onClick={() => onClick(card.slug)}
      >
        <span className="discover-theme-label">{card.label}</span>
        <span className="discover-theme-desc">{card.desc}</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      className="he-card"
      data-topic={card.slug}
      aria-label={t('discover.topicAria', { label: card.label })}
      onClick={() => onClick(card.slug)}
    >
      <span className="he-card-title">{card.label}</span>
      {card.desc && <span className="he-card-summary">{card.desc}</span>}
      <span className="he-card-cta">{t('discover.topicStart')}</span>
    </button>
  )
}

export default TopicCard
