// M60-003 / M65 Phase 2A — Landing Page 产品化
// Product value proposition + quick starts + topic cards.
// No AI, no backend, no new capabilities.
// M62.5 / ADR-0020 — UI 文案接入 i18n（useLocale/t），中英文随切换器变化。
// P5-S4 — 研究 tab 对调：8 张主题卡挪到了解 tab（DiscoverPage），
//         3 个"为什么"问题种子（UnderstandingSeeds）从了解 tab 挪入本页。

import { useLocale } from '../data/locale'
import { explorationStarters, useSiteConfigRevision } from '../data/siteConfig'
import '../styles/exploreStarters.css'
import LoadingSkeleton from './LoadingSkeleton'
import EmptyState from './EmptyState'
import ErrorCard, { ErrorKind } from './ErrorCard'
import FeaturedTopics from './FeaturedTopics'
import RecentExplorations from './RecentExplorations'
import type { NavNode } from './navigation'
import { QuickStartChips } from './discover/QuickStartChips'
import { UnderstandingSeeds } from './discover/UnderstandingSeeds'

export type TopicSummary = {
  topic: string
  title: string
  summary: string
  category?: string
}

type LandingPageProps = {
  topics: TopicSummary[]
  loading: boolean
  error: '' | ErrorKind
  onTopicClick: (topic: string) => void
  featured?: TopicSummary[]
  recent?: NavNode[]
  onRecentSelect?: (node: NavNode) => void
  onRecentClear?: () => void
  /** M60: quick start suggestion click → fill search */
  onQuickStart?: (query: string) => void
  /** P5-S4: 为什么问题种子点击 → 进入因果对象（研究 tab 对调新增） */
  onCausalObjectClick?: (objectId: string) => void
}

function LandingPage({
  topics,
  loading,
  error,
  onTopicClick,
  featured,
  recent,
  onRecentSelect,
  onRecentClear,
  onQuickStart,
  onCausalObjectClick,
}: LandingPageProps) {
  const { t } = useLocale()
  // Subscribe to runtime site-config so the curated "explore starters" strip
  // reflects admin edits without a reload (defaults keep first paint identical
  // to before this layer existed).
  useSiteConfigRevision()
  const starters = explorationStarters()
  const quickStarts = [
    t('landing.quickStart.1'),
    t('landing.quickStart.2'),
    t('landing.quickStart.3'),
    t('landing.quickStart.4'),
  ]
  return (
    <section className="he-landing" aria-label="探索历史">
      {/* Hero */}
      <div className="he-hero">
        <h1 className="he-hero-title">{t('landing.hero')}</h1>
        <p className="he-hero-sub">{t('landing.sub')}</p>
      </div>

      {/* M89 — Understanding Mode 入口 */}
      {onQuickStart && (
        <div
          className="he-understanding-entry"
          onClick={() => onQuickStart(t('landing.understandingQuestion'))}
        >
          <div className="he-understanding-entry-badge">{t('landing.understandingBadge')}</div>
          <div className="he-understanding-entry-question">{t('landing.understandingQuestion')}</div>
          <div className="he-understanding-entry-desc">{t('landing.understandingDesc')}</div>
        </div>
      )}

      {/* Quick starts */}
      {onQuickStart && (
        <QuickStartChips questions={quickStarts} onSelect={onQuickStart} />
      )}

      {/* P5-S4: 为什么问题种子（对调自了解 tab）——提问式探索入口 */}
      {onCausalObjectClick && (
        <UnderstandingSeeds onCausalObjectClick={onCausalObjectClick} />
      )}

      {/* site_config 维度4：后台可配的「推荐探索起点」建议条。每条短语即一个
          探索起点，点击填入理解模式入口（onQuickStart），无需匹配具体主题。 */}
      {starters.length > 0 && (
        <div className="he-explore-starters">
          <h2 className="he-explore-starters-title">{t('landing.exploreStartersTitle')}</h2>
          <div className="he-explore-starters-row">
            {starters.map((phrase, i) => (
              <button
                key={`${phrase}-${i}`}
                type="button"
                className="he-quick-btn"
                onClick={() => onQuickStart?.(phrase)}
              >
                {phrase}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Topics */}
      {loading && <LoadingSkeleton label={t('landing.loading')} />}

      {!loading && error && <ErrorCard kind={error} />}

      {!loading && !error && topics.length === 0 && (
        <EmptyState message={t('landing.emptyTopics')} />
      )}

      {!loading && !error && topics.length > 0 && featured && featured.length > 0 && (
        <FeaturedTopics topics={featured} onTopicClick={onTopicClick} />
      )}

      {/* Recent explorations (returning user) */}
      {recent && recent.length > 0 && (
        <RecentExplorations
          items={recent}
          onSelect={(node) => onRecentSelect?.(node)}
          onClear={onRecentClear}
        />
      )}
    </section>
  )
}

export default LandingPage
