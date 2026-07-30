// ============================================================
// M65 Phase 2A — TopicCard
// Shared presentational component for a single topic card.
// Used by both LandingPage and DiscoverPage.
// Zero business logic. Zero state.
// ============================================================

export interface TopicCardData {
  slug: string
  label: string
  desc?: string
}

interface TopicCardProps {
  card: TopicCardData
  onClick: (slug: string) => void
}

export function TopicCard({ card, onClick }: TopicCardProps) {
  return (
    <button
      type="button"
      className="he-card"
      data-topic={card.slug}
      aria-label={`探索 ${card.label}`}
      onClick={() => onClick(card.slug)}
    >
      <span className="he-card-title">{card.label}</span>
      {card.desc && <span className="he-card-summary">{card.desc}</span>}
      <span className="he-card-cta">开始探索 →</span>
    </button>
  )
}

export default TopicCard
