// Curated Landing Page (M5-A-2), extended with a Featured strip (M5-A-3).
// Replaces the previous empty first-visit screen (a bare, often-empty
// "Recent Explorations" list) with an immediate entry point: a topic catalog
// fetched from GET /topics, plus loading / empty / error states.
//
// Deliberately additive and architecture-preserving:
//  - It is a pure presentational component. All I/O (fetching the catalog,
//    loading/error state, and the click→explore wiring) lives in App.
//  - Clicking a topic calls `onTopicClick(topic)`, which App wires to the
//    SAME `navigateTo` the rest of the app uses (SearchResults,
//    CrossTopicTopicList, FeaturedTopics). No second navigation mechanism,
//    no duplicated explore logic.
//  - It reuses the unified LoadingSkeleton / EmptyState / ErrorCard and the
//    existing RecentExplorations chip list (shown only for returning users
//    who have history), so no capability is lost.

import LoadingSkeleton from './LoadingSkeleton'
import EmptyState from './EmptyState'
import ErrorCard, { ErrorKind } from './ErrorCard'
import RecentExplorations from './RecentExplorations'
import FeaturedTopics from './FeaturedTopics'
import { NavNode } from './navigation'

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
  // Curated "start here" subset (M5-A-3). Optional: when present and
  // non-empty it renders a highlighted FeaturedTopics strip above the full
  // catalog. Purely additive — when omitted the landing page behaves exactly
  // as M5-A-2 did.
  featured?: TopicSummary[]
  // Returning-user quick links. Optional: only rendered when present and non-empty,
  // so the first-visit experience stays focused on the catalog.
  recent?: NavNode[]
  onRecentSelect?: (node: NavNode) => void
  onRecentClear?: () => void
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
}: LandingPageProps) {
  return (
    <section className="he-landing" aria-label="Explore a topic">
      <div className="he-landing-head">
        <h2 className="he-landing-heading">Pick a topic to begin</h2>
        <p className="he-landing-intro">
          Start with any civilization below, or use the search above to dive into
          a specific person, place, or event.
        </p>
      </div>

      {loading && <LoadingSkeleton label="Loading topics…" />}

      {!loading && error && <ErrorCard kind={error} />}

      {!loading && !error && topics.length === 0 && (
        <EmptyState message="No topics available yet." />
      )}

      {!loading && !error && topics.length > 0 && (
        <>
          {featured && featured.length > 0 && (
            <FeaturedTopics topics={featured} onTopicClick={onTopicClick} />
          )}
          <ul className="he-topic-grid">
            {topics.map((t) => (
              <li key={t.topic}>
                <button
                  type="button"
                  className="he-topic-card"
                  data-topic={t.topic}
                  aria-label={`Explore ${t.title}`}
                  onClick={() => onTopicClick(t.topic)}
                >
                  <span className="he-topic-title">{t.title}</span>
                  {t.summary ? (
                    <span className="he-topic-summary">{t.summary}</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {recent && recent.length > 0 && onRecentSelect ? (
        <RecentExplorations items={recent} onSelect={onRecentSelect} onClear={onRecentClear} />
      ) : null}
    </section>
  )
}

export default LandingPage
