// ============================================================
// M65 Phase 2A — TopicCardGrid
// Shared presentational component for a grid of topic cards.
// Used by both LandingPage and DiscoverPage.
// Constraint: ≤ 2 variants, ≤ 5 conditional branches.
// Zero business logic. Zero state.
// ============================================================

import TopicCard, { type TopicCardData } from './TopicCard'

interface TopicCardGridProps {
  cards: TopicCardData[]
  onCardClick: (slug: string) => void
  /** 'default' = LandingPage he-grid; 'entity' = DiscoverPage theme-grid */
  variant?: 'default' | 'entity'
  maxCards?: number
}

export function TopicCardGrid({
  cards,
  onCardClick,
  variant = 'default',
  maxCards = 8,
}: TopicCardGridProps) {
  if (cards.length === 0) return null

  const visible = cards.slice(0, maxCards)

  if (variant === 'entity') {
    return (
      <div className="discover-theme-grid">
        {visible.map((card) => (
          <TopicCard key={card.slug} card={card} onClick={onCardClick} />
        ))}
      </div>
    )
  }

  return (
    <div className="he-grid">
      {visible.map((card) => (
        <TopicCard key={card.slug} card={card} onClick={onCardClick} />
      ))}
    </div>
  )
}

export default TopicCardGrid
