import { useMemo, useRef } from 'react'
import { useLocale } from '../data/locale'
import { getPackageBySlug, type ExplorationPackage } from '../data/explorationPackages'
import { visitedFromEvents } from '../data/explorationGuide'
import { getEvents, recordEvent } from '../data/UserBehaviorEvent'
import PackageJourney from '../components/package/PackageJourney'
import GuidePanel from '../components/guide/GuidePanel'
import ExplorationSuggestions from '../components/ai/ExplorationSuggestions'
import { AI_SUGGESTIONS_ENABLED } from '../data/aiFeatureFlag'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import '../styles/package.css'

interface ExplorationPackagePageProps {
  slug: string
  onEntityClick: (gid: string) => void
  onOpenPackage: (slug: string) => void
  onBack: () => void
}

// ExplorationPackagePage — a curated EXPLORATION JOURNEY, not an encyclopedia
// detail page. First screen: title + summary + exploration_goals (the "why").
// Second layer: Exploration Guide (deterministic navigation) + PackageJourney
// (traceable path through time, relationships, and sources). Clicking a journey
// node drills into the Knowledge Graph.
export default function ExplorationPackagePage({
  slug,
  onEntityClick,
  onOpenPackage,
  onBack,
}: ExplorationPackagePageProps) {
  const { locale } = useLocale()
  const journeyRef = useRef<HTMLDivElement>(null)
  const pkg: ExplorationPackage | undefined = getPackageBySlug(slug)

  // M70 — visited-entity trail from the behavior event stream (localStorage).
  // Reuses the SAME UserBehaviorEvent stream that powers the deterministic
  // ProductUsageAnalysis — consume-only, no new state source. Falls back to
  // an empty trail when storage is unavailable (e.g. SSR / tests).
  const visited = useMemo<string[]>(() => {
    try {
      return visitedFromEvents(getEvents())
    } catch {
      return []
    }
  }, [])

  if (!pkg) {
    return (
      <section className="package-page package-page--missing" aria-label="探索包未找到">
        <EmptyState title={`未找到探索包：${slug}`} description="请返回首页重新选择一个官方探索包。" />
        <Button variant="ghost" className="package-back" onClick={onBack}>
          ← 返回探索
        </Button>
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
      <Button variant="ghost" className="package-back" onClick={onBack}>
        ← 返回探索
      </Button>

      <header className="package-hero">
        <span className="package-badge">{typeLabel}</span>
        <h1 className="package-title">{title}</h1>
        <p className="package-summary">{summary}</p>

        <div className="package-goals">
          <h2 className="package-goals-title">探索目标</h2>
          <p className="package-goals-text">{goals}</p>
        </div>

        <Button variant="gold" className="package-start" onClick={scrollToJourney}>
          开始探索 ↓
        </Button>
      </header>

      <div ref={journeyRef}>
        {/* M70 — Exploration Guide: deterministic navigation (position / next / reason / coverage).
            M71 — click_guide_next telemetry wired at the page layer (behavior-analysis only;
            view_source / complete_package contract reserved but NOT emitted yet — PO deferral). */}
        <GuidePanel
          pkg={pkg}
          visited={visited}
          locale={locale}
          onEntityClick={onEntityClick}
          onNextClick={(to) => recordEvent({ action: 'click_guide_next', entityGlobalId: to })}
        />

        {/* M74-003 (C3-2) — AI Exploration Suggestions (T1): evidence-bound
            exploration touchpoint, an ENHANCEMENT LAYER beside (never replacing)
            the deterministic Guide. Flag-gated at the parent so OFF = zero
            render + zero requests (M73 byte-identical). Anchor = first package
            entity reference; every fact comes from the backend response. */}
        {AI_SUGGESTIONS_ENABLED && pkg.entity_references[0] && (
          <ExplorationSuggestions
            anchorGlobalId={pkg.entity_references[0]}
            onEntityClick={onEntityClick}
          />
        )}

        <PackageJourney
          pkg={pkg}
          locale={locale}
          onEntityClick={onEntityClick}
          onOpenPackage={onOpenPackage}
          onSourceClick={(sourceId) =>
            recordEvent({ action: 'view_source', sourceId })
          }
        />
      </div>
    </section>
  )
}
