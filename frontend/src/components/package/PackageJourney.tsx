import type { ExplorationPackage, Locale } from '../../data/explorationPackages'
import TimelineChain from './TimelineChain'
import RelationshipChain from './RelationshipChain'
import SourceChain from './SourceChain'
import RecommendedNext from './RecommendedNext'

interface PackageJourneyProps {
  pkg: ExplorationPackage
  locale?: Locale
  onEntityClick?: (gid: string) => void
  onOpenPackage?: (slug: string) => void
  /** M72 Line2 — view_source passthrough to SourceChain (telemetry wiring in page). */
  onSourceClick?: (sourceId: string) => void
}

// The second layer of ExplorationPackagePage: the actual Exploration Journey.
// Ordered as Timeline → Relationship → Source → Recommended Next, so the reader
// moves from "when" to "how it evolved" to "what proves it" to "where next".
export default function PackageJourney({
  pkg,
  locale = 'zh',
  onEntityClick,
  onOpenPackage,
  onSourceClick,
}: PackageJourneyProps) {
  return (
    <div className="package-journey" id="package-journey">
      <section className="journey-section">
        <h2 className="journey-section-title">时间旅程</h2>
        <p className="journey-section-sub">
          沿时间顺序理解历史演化：一个时代如何走向下一个时代。
        </p>
        <TimelineChain pkg={pkg} locale={locale} onEntityClick={onEntityClick} />
      </section>

      <section className="journey-section">
        <h2 className="journey-section-title">关系旅程</h2>
        <p className="journey-section-sub">
          理解制度如何被继承与塑造：一个观念如何演化出下一个观念。
        </p>
        <RelationshipChain pkg={pkg} locale={locale} onEntityClick={onEntityClick} />
      </section>

      <section className="journey-section">
        <h2 className="journey-section-title">来源与证据</h2>
        <p className="journey-section-sub">
          每一步都有据可查：关系背后的证据与来源。
        </p>
        <SourceChain pkg={pkg} locale={locale} onSourceClick={onSourceClick} />
      </section>

      <section className="journey-section">
        <h2 className="journey-section-title">推荐下一步探索</h2>
        <p className="journey-section-sub">沿探索包的网络，继续深入相关主题。</p>
        <RecommendedNext
          pkg={pkg}
          locale={locale}
          onOpenPackage={onOpenPackage}
          onEntityClick={onEntityClick}
        />
      </section>
    </div>
  )
}
