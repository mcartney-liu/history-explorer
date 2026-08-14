// ============================================================
// M65 Phase 2A — TopicCard
// Shared presentational component for a single topic card.
// Used by both LandingPage and DiscoverPage.
// Zero business logic. Only local state is the drop-in artwork load flag.
// ============================================================

import { useState, type SyntheticEvent } from 'react'
import { useLocale } from '../../data/locale'
import { slotGuidedQuestions, slotImageName, slotImageFocus, slotSummaryI18n, slotTitleI18n, useContentRevision } from '../../data/contentRuntime'
import { mediaUrl } from '../../data/contentApi'

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

// Drop-in real artwork: `public/assets/topics/<slug>.webp`, with a png/jpg/jpeg
// fallback chain. Theme cards are numerous and mostly have no image, so the
// card keeps its plain paper style until an image is actually dropped in.
const ART_FORMATS = ['png', 'jpg', 'jpeg'] as const

export function TopicCard({ card, onClick, variant = 'default' }: TopicCardProps) {
  const { t, locale } = useLocale()
  useContentRevision()
  const [artOk, setArtOk] = useState(false)
  // Admin-configured cover (slot `explore_topics.<slug>`) wins when set;
  // otherwise fall back to the drop-in folder convention (webp→png→jpg→jpeg).
  const configuredName = slotImageName(`explore_topics.${card.slug}`)
  const focus = slotImageFocus(`explore_topics.${card.slug}`)

  const handleArtError = (e: SyntheticEvent<HTMLImageElement>) => {
    const el = e.currentTarget
    const step = parseInt(el.dataset.fallback ?? '0', 10)
    if (step < ART_FORMATS.length) {
      el.dataset.fallback = String(step + 1)
      el.src = el.src.replace(/\.[a-z]+$/i, `.${ART_FORMATS[step]}`)
    } else {
      el.style.display = 'none'
    }
  }

  if (variant === 'entity') {
    const artSrc = configuredName
      ? mediaUrl(configuredName)
      : `${import.meta.env.BASE_URL}assets/topics/${card.slug}.webp`
    return (
      <button
        type="button"
        className={`discover-theme-card${artOk ? ' has-art' : ''}`}
        data-topic={card.slug}
        aria-label={t('discover.topicAria', { label: card.label })}
        onClick={() => onClick(card.slug)}
      >
        <img
          className="discover-theme-art"
          src={artSrc}
          alt=""
          loading="lazy"
          style={focus ? { objectPosition: focus } : undefined}
          onLoad={() => setArtOk(true)}
          onError={handleArtError}
        />
        <span className="discover-theme-label">{slotTitleI18n(`explore_topics.${card.slug}`, locale, card.label)}</span>
        <span className="discover-theme-desc">{slotSummaryI18n(`explore_topics.${card.slug}`, locale, card.desc ?? '')}</span>
        {slotGuidedQuestions(`explore_topics.${card.slug}`, []).map((q) => (
          <span className="discover-theme-desc" key={q}>
            {q}
          </span>
        ))}
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
      <span className="he-card-title">{slotTitleI18n(`explore_topics.${card.slug}`, locale, card.label)}</span>
      {card.desc && <span className="he-card-summary">{slotSummaryI18n(`explore_topics.${card.slug}`, locale, card.desc)}</span>}
      <span className="he-card-cta">{t('discover.topicStart')}</span>
    </button>
  )
}

export default TopicCard
