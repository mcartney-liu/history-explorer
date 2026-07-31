import type { ExplorationPackage, Locale } from '../../data/explorationPackages'

interface PackageCardProps {
  pkg: ExplorationPackage
  locale?: Locale
  onOpen: (slug: string) => void
}

// Presentational card for the Discover page "官方探索包" block.
// Entrance to an Exploration Journey — not an encyclopedia detail page.
export default function PackageCard({ pkg, locale = 'zh', onOpen }: PackageCardProps) {
  const title = pkg.title[locale] ?? pkg.title.zh
  const summary = pkg.summary[locale] ?? pkg.summary.zh
  const typeLabel = pkg.type === 'official' ? '官方探索包' : pkg.type

  return (
    <article className="pkg-card" data-testid={`pkg-card-${pkg.slug}`}>
      <span className="pkg-card-badge">{typeLabel}</span>
      <h3 className="pkg-card-title">{title}</h3>
      <p className="pkg-card-summary">{summary}</p>
      <button
        type="button"
        className="pkg-card-open"
        aria-label={`开始探索 ${title}`}
        onClick={() => onOpen(pkg.slug)}
      >
        开始探索 →
      </button>
    </article>
  )
}
