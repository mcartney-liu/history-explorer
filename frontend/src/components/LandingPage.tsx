// M60-003 / M65 Phase 2A — Landing Page 产品化
// Product value proposition + quick starts + topic cards.
// No AI, no backend, no new capabilities.

import LoadingSkeleton from './LoadingSkeleton'
import EmptyState from './EmptyState'
import ErrorCard, { ErrorKind } from './ErrorCard'
import FeaturedTopics from './FeaturedTopics'
import RecentExplorations from './RecentExplorations'
import type { NavNode } from './navigation'
import { QuickStartChips } from './discover/QuickStartChips'
import { TopicCardGrid } from './discover/TopicCardGrid'
import type { TopicCardData } from './discover/TopicCard'

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
}

const QUICK_STARTS = [
  '凯撒为什么重要？',
  '秦始皇统一六国以后发生了什么？',
  '罗马为什么灭亡？',
  '丝绸之路改变了什么？',
]

export const LANDING_HERO = '探索历史文明，形成你自己的理解'
export const LANDING_SUB =
  '从人物、国家、战争、文明之间的联系出发，看见历史为什么会这样发生。'

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
}: LandingPageProps) {
  return (
    <section className="he-landing" aria-label="探索历史">
      {/* Hero */}
      <div className="he-hero">
        <h1 className="he-hero-title">{LANDING_HERO}</h1>
        <p className="he-hero-sub">{LANDING_SUB}</p>
      </div>

      {/* M89 — Understanding Mode 入口 */}
      {onQuickStart && (
        <div className="he-understanding-entry" onClick={() => onQuickStart('法国大革命为什么发生？')}>
          <div className="he-understanding-entry-badge">新 · 理解模式</div>
          <div className="he-understanding-entry-question">法国大革命为什么发生？</div>
          <div className="he-understanding-entry-desc">不只是回答，而是带你一步步理解历史为什么会这样发生</div>
        </div>
      )}

      {/* Quick starts */}
      {onQuickStart && (
        <QuickStartChips questions={QUICK_STARTS} onSelect={onQuickStart} />
      )}

      {/* Topics */}
      {loading && <LoadingSkeleton label="加载中…" />}

      {!loading && error && <ErrorCard kind={error} />}

      {!loading && !error && topics.length === 0 && (
        <EmptyState message="暂无探索主题。" />
      )}

      {!loading && !error && topics.length > 0 && (
        <>
          {featured && featured.length > 0 && (
            <FeaturedTopics topics={featured} onTopicClick={onTopicClick} />
          )}
          <TopicCardGrid
            cards={topics.map((t): TopicCardData => ({ slug: t.topic, label: t.title, desc: t.summary }))}
            onCardClick={onTopicClick}
            maxCards={8}
          />
        </>
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
