// Featured Topics (M5-A-3).
// A curated "Start here" highlight strip shown above the full topic catalog
// on the landing page. Its job is purely to surface a small, editorially
// chosen set of entry points so a first-time visitor has a clear starting
// point rather than eight undifferentiated cards.
//
// Deliberately presentational and dependency-free:
//  - No fetch, no localStorage, no navigation, no local state, no effect.
//  - Receives the already-filtered featured subset and an onTopicClick handler.
//  - Clicking a card calls onTopicClick(topic), which App wires to the SAME
//    navigateTo the rest of the app uses (LandingPage's own grid,
//    SearchResults, CrossTopicTopicList). One navigation path, no duplicate
//    explore logic.
//  - TopicSummary is the shared shape already exported by LandingPage, so the
//    card structure here stays identical to the normal catalog cards.

import type { TopicSummary } from './LandingPage'

type FeaturedTopicsProps = {
  topics: TopicSummary[]
  onTopicClick: (topic: string) => void
}

function FeaturedTopics({ topics, onTopicClick }: FeaturedTopicsProps) {
  return (
    <section className="he-featured" aria-label="Start here">
      <h3 className="he-featured-heading">Start here</h3>
      <ul className="he-featured-grid">
        {topics.map((t) => (
          <li key={t.topic}>
            <button
              type="button"
              className="he-featured-card"
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
    </section>
  )
}

export default FeaturedTopics
