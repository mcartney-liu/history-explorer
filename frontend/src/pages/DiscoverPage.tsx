// Discover landing experience (M35 Phase 2).
//
// A purely presentational entry page that answers "why would I explore
// history here?" before the visitor picks a topic. It renders:
//   - Hero: the FIXED copy 「原来历史还能这样探索。」 (Design Freeze §2 — verbatim,
//     never generated).
//   - Featured exploration: the Silk Road topic (FEATURED_TOPIC), with its
//     curated starters from the EXISTING data/explorationStarters.ts mapping.
//   - Popular explorations: one card per TOPIC_STARTERS key. No new topic
//     data is created here — every slug/label/target is read verbatim from
//     the existing curated starter map.
//
// Deliberately presentational and dependency-free (mirrors FirstExplorationGuide):
//   - No fetch, no localStorage, no AI/LLM, no navigation logic of its own.
//   - Clicking a topic calls onTopicClick(slug); clicking a starter calls
//     onStarterClick(item.target). App wires BOTH to the same navigateTo the
//     rest of the app uses — one navigation path, no second mechanism.

import type { NavNode } from '../components/navigation'
import { TOPIC_STARTERS } from '../data/explorationStarters'
import type { StarterItem } from '../data/explorationStarters'

// Fixed hero copy — Design Freeze §2. Do NOT reword or generate.
export const DISCOVER_HERO = '原来历史还能这样探索。'
export const DISCOVER_HERO_SUB =
  '从一个人、一条路、一个念头出发，看它如何穿过帝国、宗教与技术，把整个古代世界连成一张网。'

// Featured exploration — Design Freeze §2 default.
export const FEATURED_TOPIC = 'silk_road'

// Same display rule App.prettifyTopic uses (pure, tiny; duplicated on purpose
// so this page stays import-light and App's helper stays private).
export function prettifySlug(t: string): string {
  return t.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

type DiscoverPageProps = {
  onTopicClick: (topic: string) => void
  onStarterClick: (target: NavNode) => void
}

function StarterChips({
  starters,
  onStarterClick,
}: {
  starters: StarterItem[]
  onStarterClick: (target: NavNode) => void
}) {
  if (starters.length === 0) return null
  return (
    <ul className="discover-starter-list">
      {starters.map((s) => (
        <li key={s.id}>
          <button
            type="button"
            className="discover-starter"
            data-starter={s.id}
            aria-label={`Explore ${s.label}`}
            onClick={() => onStarterClick(s.target)}
          >
            {s.label}
          </button>
        </li>
      ))}
    </ul>
  )
}

function DiscoverPage({ onTopicClick, onStarterClick }: DiscoverPageProps) {
  const featuredStarters = TOPIC_STARTERS[FEATURED_TOPIC] ?? []
  // Popular = every curated topic in the EXISTING starter map, featured first.
  const popularSlugs = Object.keys(TOPIC_STARTERS).filter(
    (slug) => slug !== FEATURED_TOPIC,
  )

  return (
    <section className="discover-page" aria-label="Discover history explorations">
      <div className="discover-hero">
        <h2 className="discover-hero-title">{DISCOVER_HERO}</h2>
        <p className="discover-hero-sub">{DISCOVER_HERO_SUB}</p>
      </div>

      <div className="discover-featured" data-topic={FEATURED_TOPIC}>
        <h3 className="discover-section-heading">精选探索 · Featured</h3>
        <button
          type="button"
          className="discover-featured-card"
          aria-label={`Explore ${prettifySlug(FEATURED_TOPIC)}`}
          onClick={() => onTopicClick(FEATURED_TOPIC)}
        >
          <span className="discover-featured-title">{prettifySlug(FEATURED_TOPIC)}</span>
          <span className="discover-featured-desc">
            一条路，连起罗马、波斯、印度与汉朝。从丝绸之路出发，看货物、信仰与技术如何跨越大陆。
          </span>
        </button>
        <StarterChips starters={featuredStarters} onStarterClick={onStarterClick} />
      </div>

      <div className="discover-popular">
        <h3 className="discover-section-heading">热门探索 · Popular</h3>
        <ul className="discover-topic-list">
          {popularSlugs.map((slug) => (
            <li key={slug}>
              <button
                type="button"
                className="discover-topic-card"
                data-topic={slug}
                aria-label={`Explore ${prettifySlug(slug)}`}
                onClick={() => onTopicClick(slug)}
              >
                {prettifySlug(slug)}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export default DiscoverPage
