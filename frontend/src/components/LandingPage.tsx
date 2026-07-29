// M60-003 — Landing Page 产品化
// Product value proposition + quick starts + topic cards.
// No AI, no backend, no new capabilities.

import LoadingSkeleton from './LoadingSkeleton'
import EmptyState from './EmptyState'
import ErrorCard, { ErrorKind } from './ErrorCard'
import FeaturedTopics from './FeaturedTopics'
import RecentExplorations from './RecentExplorations'
import type { NavNode } from './navigation'

export type TopicSummary = {
  topic: string
  title: string
  summary: string
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

export const LANDING_HERO = '用 AI 探索历史文明'
export const LANDING_SUB =
  '探索人物、国家、战争、文明之间的联系，理解历史为什么会这样发生。'

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

      {/* Quick starts */}
      {onQuickStart && (
        <div className="he-quick">
          <span className="he-quick-label">试试：</span>
          {QUICK_STARTS.map((q) => (
            <button
              key={q}
              type="button"
              className="he-quick-btn"
              onClick={() => onQuickStart(q)}
            >
              {q}
            </button>
          ))}
        </div>
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
          <div className="he-grid">
            {topics.slice(0, 8).map((t) => (
              <button
                key={t.topic}
                type="button"
                className="he-card"
                data-topic={t.topic}
                aria-label={`探索 ${t.title}`}
                onClick={() => onTopicClick(t.topic)}
              >
                <span className="he-card-title">{t.title}</span>
                {t.summary && (
                  <span className="he-card-summary">{t.summary}</span>
                )}
                <span className="he-card-cta">开始探索 →</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Recent explorations (returning user) */}
      {recent && recent.length > 0 && (
        <RecentExplorations
          items={recent}
          onSelect={onRecentSelect}
          onClear={onRecentClear}
        />)
      )}
    </section>
  )
}

export default LandingPage
