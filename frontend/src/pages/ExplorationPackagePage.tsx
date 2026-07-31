import { useRef } from 'react'
import { useLocale } from '../data/locale'
import { getPackageBySlug, type ExplorationPackage } from '../data/explorationPackages'
import PackageJourney from '../components/package/PackageJourney'
import '../styles/package.css'

interface ExplorationPackagePageProps {
  slug: string
  onEntityClick: (gid: string) => void
  onOpenPackage: (slug: string) => void
  onBack: () => void
}

// ExplorationPackagePage — a curated EXPLORATION JOURNEY, not an encyclopedia
// detail page. First screen: title + summary + exploration_goals (the "why").
// Second layer (PackageJourney): the traceable path through time, relationships,
// and sources. Clicking a journey node drills into the Knowledge Graph.
export default function ExplorationPackagePage({
  slug,
  onEntityClick,
  onOpenPackage,
  onBack,
}: ExplorationPackagePageProps) {
  const { locale } = useLocale()
  const journeyRef = useRef<HTMLDivElement>(null)
  const pkg: ExplorationPackage | undefined = getPackageBySlug(slug)

  if (!pkg) {
    return (
      <section className="package-page package-page--missing" aria-label="探索包未找到">
        <p className="package-missing-text">未找到探索包：{slug}</p>
        <button type="button" className="package-back" onClick={onBack}>
          ← 返回探索
        </button>
      </section>
    )
  }

  const title = pkg.title[locale] ?? pkg.title.zh
  const summary = pkg.summary[locale] ?? pkg.summary.zh
  const goals = pkg.exploration_goals[locale] ?? pkg.exploration_goals.zh
  const typeLabel = pkg.type === 'official' ? '官方探索包' : pkg.type

  const scrollToJourney = () => {
    journeyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <section className="package-page" aria-label={`探索包 ${title}`}>
      <button type="button" className="package-back" onClick={onBack}>
        ← 返回探索
      </button>

      <header className="package-hero">
        <span className="package-badge">{typeLabel}</span>
        <h1 className="package-title">{title}</h1>
        <p className="package-summary">{summary}</p>

        <div className="package-goals">
          <h2 className="package-goals-title">探索目标</h2>
          <p className="package-goals-text">{goals}</p>
        </div>

        <button type="button" className="package-start" onClick={scrollToJourney}>
          开始探索 ↓
        </button>
      </header>

      <div ref={journeyRef}>
        <PackageJourney
          pkg={pkg}
          locale={locale}
          onEntityClick={onEntityClick}
          onOpenPackage={onOpenPackage}
        />
      </div>
    </section>
  )
}
