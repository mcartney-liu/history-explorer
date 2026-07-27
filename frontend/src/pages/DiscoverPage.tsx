// Discover landing experience (M35 Phase 2 / M42 Phase 4).
//
// M35: presentational entry page with hero + featured + popular
// M42: personalized discovery using ResearchHistory, UserInterestProfile,
//      and entity-type exploration entry points.

import { useMemo } from 'react'
import type { NavNode } from '../components/navigation'
import { TOPIC_STARTERS } from '../data/explorationStarters'
import type { StarterItem } from '../data/explorationStarters'
import { listResearch } from '../data/ResearchHistory'
import { generateUserInterestProfile, insightSummary } from '../data/ResearchInsights'
import type { SavedResearch } from '../data/ResearchHistory'

// Fixed hero copy — Design Freeze §2. Do NOT reword or generate.
export const DISCOVER_HERO = '原来历史还能这样探索。'
export const DISCOVER_HERO_SUB =
  '从一个人、一条路、一个念头出发，看它如何穿过帝国、宗教与技术，把整个古代世界连成一张网。'

// Featured exploration — Design Freeze §2 default.
export const FEATURED_TOPIC = 'silk_road'

// Entity type exploration entry points (M42)
const ENTITY_TYPE_CARDS = [
  { type: 'Civilization', label: '古代文明', slug: 'ancient_civilizations', desc: '罗马、汉朝、波斯…帝国兴衰的背后' },
  { type: 'Event', label: '历史事件', slug: 'historical_events', desc: '关键转折点：战争、革命、变革' },
  { type: 'Person', label: '历史人物', slug: 'historical_figures', desc: '恺撒、亚里士多德、释迦牟尼' },
  { type: 'Religion', label: '宗教发展', slug: 'religion', desc: '佛教、基督教、伊斯兰教的传播' },
  { type: 'Technology', label: '技术演进', slug: 'technology', desc: '冶铁、造纸、航海技术' },
  { type: 'Location', label: '地理探索', slug: 'locations', desc: '丝绸之路、地中海、恒河流域' },
]

function RecentResearches({ researches }: { researches: SavedResearch[] }) {
  if (researches.length === 0) return null
  const recent = [...researches]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3)
  return (
    <div className="discover-recent">
      <h3 className="discover-section-heading">最近研究</h3>
      <p className="discover-section-sub">继续未完成的探索，或从收藏中快速进入。</p>
      <div className="discover-recent-list">
        {recent.map((r) => (
          <a key={r.id} href={`#/entity/${encodeURIComponent(r.entityGlobalId)}`} className="discover-recent-card">
            <span className="discover-recent-type">{r.entityType}</span>
            <span className="discover-recent-name">{r.entityName}</span>
            {r.bookmarked && <span className="discover-recent-star">★</span>}
          </a>
        ))}
      </div>
    </div>
  )
}

function InterestProfile() {
  const researches = useMemo(() => listResearch(), [])
  if (researches.length < 2) return null
  const profile = useMemo(() => generateUserInterestProfile(researches), [researches])
  const summary = useMemo(() => insightSummary({ researchCount: profile.activeExplorationDays + 1, favoriteEntityTypes: profile.topEntityTypes.map((t) => t.type), favoriteDimensions: profile.topDimensions.map((d) => d.dimension), exploredRelationships: [], frequentThemes: profile.topThemes } as any), [profile])

  return (
    <div className="discover-interest">
      <h3 className="discover-section-heading">我的探索兴趣</h3>
      {profile.topThemes.length > 0 && (
        <div className="discover-interest-themes">
          {profile.topThemes.slice(0, 4).map((theme) => (
            <span key={theme} className="discover-interest-tag">{theme}</span>
          ))}
        </div>
      )}
      {profile.topDimensions.length > 0 && (
        <p className="discover-interest-dims">
          常研究维度：{profile.topDimensions.slice(0, 4).map((d) => d.dimension).join('、')}
        </p>
      )}
    </div>
  )
}

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
  const popularSlugs = Object.keys(TOPIC_STARTERS).filter(
    (slug) => slug !== FEATURED_TOPIC,
  )
  const researches = useMemo(() => listResearch(), [])

  return (
    <section className="discover-page" aria-label="Discover history explorations">
      <div className="discover-hero">
        <h2 className="discover-hero-title">{DISCOVER_HERO}</h2>
        <p className="discover-hero-sub">{DISCOVER_HERO_SUB}</p>
      </div>

      {/* M42: Recent researches */}
      <RecentResearches researches={researches} />

      {/* M42: Interest profile */}
      <InterestProfile />

      {/* M42: Entity type exploration */}
      <div className="discover-themes">
        <h3 className="discover-section-heading">探索主题</h3>
        <p className="discover-section-sub">按历史类型浏览，发现你的兴趣方向。</p>
        <div className="discover-theme-grid">
          {ENTITY_TYPE_CARDS.map((card) => (
            <button
              key={card.slug}
              type="button"
              className="discover-theme-card"
              data-topic={card.slug}
              aria-label={`探索 ${card.label}`}
              onClick={() => onTopicClick(card.slug)}
            >
              <span className="discover-theme-label">{card.label}</span>
              <span className="discover-theme-desc">{card.desc}</span>
            </button>
          ))}
        </div>
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
