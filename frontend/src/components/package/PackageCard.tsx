import { useState, type ReactNode } from 'react'
import type { ExplorationPackage } from '../../data/explorationPackages'
import { Button } from '../ui/Button'
import { useLocale } from '../../data/locale'

// Per-pack decorative SVG illustration (line-art, currentColor) embedded in
// the gradient art band. Thematic — not literal photos — to keep the museum
// line-art aesthetic while making each exploration pack visually distinct.
const PACK_ART: Record<string, ReactNode> = {
  'china-civilization-v1': (
    <svg viewBox="0 0 120 120" fill="none" stroke="currentColor" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="60" cy="34" r="12" />
      <path d="M42 50 q18 -10 36 0" />
      <path d="M44 52 v34 h32 v-34" />
      <path d="M44 86 h32" />
      <path d="M52 60 v22 M68 60 v22" />
    </svg>
  ),
  'silk-road-exploration': (
    <svg viewBox="0 0 120 120" fill="none" stroke="currentColor" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 100 q25 -18 50 -6 q25 12 50 -4" />
      <path d="M34 92 q2 -16 10 -14 q3 -10 9 -10 q4 -2 6 6 q3 -11 9 -11 q5 0 7 12" />
      <path d="M44 80 v12 M58 74 v18 M74 74 v18 M84 80 v12" />
    </svg>
  ),
  'roman-empire-exploration': (
    <svg viewBox="0 0 120 120" fill="none" stroke="currentColor" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M44 34 h32" />
      <path d="M48 42 h24" />
      <path d="M50 50 v44 M70 50 v44" />
      <path d="M50 62 h20 M50 74 h20 M50 86 h20" />
      <path d="M42 94 h36 M38 102 h44" />
    </svg>
  ),
  'india-classical-civilization': (
    <svg viewBox="0 0 120 120" fill="none" stroke="currentColor" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M40 86 a20 20 0 0 1 40 0" />
      <path d="M60 66 v-18" />
      <path d="M54 46 h12 M56 38 h8" />
      <path d="M38 86 h44 M34 94 h52" />
    </svg>
  ),
  'textbook-cn-history-v1': (
    <svg viewBox="0 0 120 120" fill="none" stroke="currentColor" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M60 36 C44 28 28 30 22 34 v52 c6 -4 22 -6 38 2" />
      <path d="M60 36 C76 28 92 30 98 34 v52 c-6 -4 -22 -6 -38 2" />
      <path d="M60 36 v54" />
    </svg>
  ),
  'persian-empire-exploration': (
    <svg viewBox="0 0 120 120" fill="none" stroke="currentColor" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M46 30 q14 -10 28 0" />
      <path d="M46 30 v56 M74 30 v56" />
      <path d="M40 86 h40 M42 38 h36" />
    </svg>
  ),
  'greek-philosophy-exploration': (
    <svg viewBox="0 0 120 120" fill="none" stroke="currentColor" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M46 32 h28" />
      <path d="M50 40 v50 M70 40 v50" />
      <path d="M50 52 h20 M50 64 h20 M50 76 h20" />
      <path d="M40 90 h40" />
      <path d="M86 44 q8 -6 10 -16 q-8 4 -10 16" />
    </svg>
  ),
  'hellenistic-world-exploration': (
    <svg viewBox="0 0 120 120" fill="none" stroke="currentColor" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M48 34 a6 6 0 1 0 0.1 0" />
      <path d="M72 34 a6 6 0 1 0 0.1 0" />
      <path d="M50 42 v48 M70 42 v48" />
      <path d="M50 56 h20 M50 68 h20 M50 80 h20" />
      <path d="M44 90 h32" />
    </svg>
  ),
  'egypt-technology-religion-exploration': (
    <svg viewBox="0 0 120 120" fill="none" stroke="currentColor" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="84" cy="34" r="12" />
      <path d="M26 92 L60 44 L94 92" />
      <path d="M60 44 L52 92" />
    </svg>
  ),
  'early-christianity-exploration': (
    <svg viewBox="0 0 120 120" fill="none" stroke="currentColor" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="60" cy="58" r="26" />
      <path d="M60 32 v52 M34 58 h52 M42 40 l36 36 M78 40 l-36 36" />
      <circle cx="60" cy="58" r="10" />
    </svg>
  ),
}

interface PackageCardProps {
  pkg: ExplorationPackage
  onOpen: (slug: string) => void
}

// Presentational card for the Discover page "官方探索包" block.
// Entrance to an Exploration Journey — not an encyclopedia detail page.
export default function PackageCard({ pkg, onOpen }: PackageCardProps) {
  const { t, locale } = useLocale()
  const [imgLoaded, setImgLoaded] = useState(false)
  const title = pkg.title[locale] ?? pkg.title.zh
  const summary = pkg.summary[locale] ?? pkg.summary.zh
  const typeLabel = pkg.type === 'official' ? t('discover.pkgOfficial') : pkg.type

  const art = PACK_ART[pkg.slug]
  // Drop-in real artwork: when `public/assets/packs/<slug>.<ext>` exists it
  // owns the top band; until it loads the line-art SVG stands in, and it is
  // removed from the DOM once the photo paints (no stray corner icon).
  const artImg = `${import.meta.env.BASE_URL}assets/packs/${pkg.slug}.webp`

  return (
    <article className="pkg-card" data-pack={pkg.slug} data-testid={`pkg-card-${pkg.slug}`}>
      <div className="pkg-card-art" aria-hidden="true">
        {!imgLoaded && art}
        <img
          className="pkg-card-art-img"
          src={artImg}
          alt=""
          loading="lazy"
          onLoad={() => setImgLoaded(true)}
          // Chain fallback webp → png → jpg → jpeg so pack-art can be dropped
          // in any format. SVG remains on screen if every format 404s.
          onError={(e) => {
            const el = e.currentTarget
            const order = ['png', 'jpg', 'jpeg']
            const step = parseInt(el.dataset.fallback ?? '0', 10)
            if (step < order.length) {
              el.dataset.fallback = String(step + 1)
              el.src = el.src.replace(/\.[a-z]+$/i, `.${order[step]}`)
            } else {
              el.style.display = 'none'
            }
          }}
        />
      </div>
      <div className="pkg-card-body">
        <span className="pkg-card-badge">{typeLabel}</span>
        <h3 className="pkg-card-title">{title}</h3>
        <p className="pkg-card-summary">{summary}</p>
        <Button
          variant="gold"
          className="pkg-card-open"
          ariaLabel={t('discover.pkgOpenAria', { title })}
          onClick={() => onOpen(pkg.slug)}
        >
          {t('discover.pkgStart')}
        </Button>
      </div>
    </article>
  )
}
