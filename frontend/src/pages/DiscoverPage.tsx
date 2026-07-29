// Discover landing experience (M35 Phase 2 / M42 Phase 4).
//
// M35: presentational entry page with hero + featured + popular
// M42: personalized discovery using ResearchHistory, UserInterestProfile,
//      and entity-type exploration entry points.
// M44: added ProductIntro section — static capability showcase for new visitors.
// M59-002: migrated cards to <Card> component.

import { useMemo, useEffect, useState } from 'react'
import type { NavNode } from '../components/navigation'
import { TOPIC_STARTERS } from '../data/explorationStarters'
import type { StarterItem } from '../data/explorationStarters'
import { listResearch } from '../data/ResearchHistory'
import { generateUserInterestProfile } from '../data/ResearchInsights'
import type { SavedResearch } from '../data/ResearchHistory'
import { recordEvent } from '../data/UserBehaviorEvent'
import { Card } from '../components/ui/Card'
import { Icon } from '../components/ui/Icon'
import type { IconName } from '../components/ui/Icon'

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

// M44 Product Introduction — static capability showcase
const PRODUCT_CAPABILITIES = [
  {
    id: 'story',
    icon: 'book',
    title: '历史叙事',
    desc: '从一个人、一条路、一个事件出发，看它如何在历史中展开。手写叙事，不靠 AI 生成。',
  },
  {
    id: 'explore',
    icon: 'link',
    title: '关系探索',
    desc: '穿越实体之间的关联——因果关系、时间顺序、影响传播。每一步都有据可查。',
  },
  {
    id: 'research',
    icon: 'research',
    title: '深度研究',
    desc: '4 维度 AI 分析：政治、军事、经济、文化。支持多实体对比研究，结果可保存回顾。',
  },
  {
    id: 'chat',
    icon: 'chat',
    title: 'AI 历史对话',
    desc: '向 AI 历史学家提问。每个回答都有事实溯源，没有经过验证的内容不会呈现。',
  },
]

function ProductIntro() {
  return (
    <div className="discover-intro">
      <h3 className="discover-section-heading">History Explorer 能做什么</h3>
      <div className="discover-intro-grid">
        {PRODUCT_CAPABILITIES.map((cap) => (
          <Card key={cap.id} variant="default" className="discover-intro-card">
            <div className="discover-intro-icon">
              <Icon name={cap.icon as IconName} size={24} />
            </div>
            <h4 className="discover-intro-title">{cap.title}</h4>
            <p className="discover-intro-desc">{cap.desc}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}

function RecentResearches({ researches }: { researches: SavedResearch[] }) {
  if (researches.length === 0) {
    return (
      <div className="discover-recent discover-recent--empty">
        <h3 className="discover-section-heading">最近研究</h3>
        <p className="discover-empty-text">你还没有开始探索。</p>
        <div className="discover-empty-actions">
          <p>试试：</p>
          <ul>
            <li>搜索一个历史主题（如"罗马""丝绸之路"）</li>
            <li>点击下方精选探索开始</li>
            <li>从文明、事件、人物分类进入</li>
          </ul>
        </div>
      </div>
    )
  }
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

// M44 Phase 6 — ResearchLibrary entry on DiscoverPage
function ResearchLibraryEntry() {
  const researches = useMemo(() => listResearch().filter((r) => r.bookmarked), [])
  if (researches.length === 0) return null
  return (
    <div className="discover-library">
      <h3 className="discover-section-heading">我的研究收藏</h3>
      <p className="discover-section-sub">
        已保存 {researches.length} 项研究结果。点击可跳转到对应实体继续查看。
      </p>
      <ul className="discover-library-list">
        {researches.slice(0, 5).map((r) => (
          <li key={r.id}>
            <a href={`#/entity/${encodeURIComponent(r.entityGlobalId)}`} className="discover-library-link">
              <span className="discover-library-type">{r.entityType}</span>
              {r.entityName}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

function InterestProfile() {
  const researches = useMemo(() => listResearch(), [])
  if (researches.length < 2) {
    return (
      <div className="discover-interest discover-interest--empty">
        <h3 className="discover-section-heading">我的探索兴趣</h3>
        <p className="discover-empty-text">
          完成几次探索后，这里会生成你的历史兴趣画像。
        </p>
        <p className="discover-empty-sub">
          你探索得越多，推荐会越贴近你的兴趣方向。
        </p>
      </div>
    )
  }
  const profile = useMemo(() => generateUserInterestProfile(researches), [researches])

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

  // M45: record discovery page visit
  useEffect(() => { recordEvent({ action: 'open_discover' }) }, [])

  // M62-A: tabbed landing — understand (capability + start) / research (personal activity) / expand (roadmap)
  const [tab, setTab] = useState<'understand' | 'research' | 'expand'>('understand')

  // M45 Phase 3: wrap navigation to record click_entity
  const handleTopicClick = useMemo(() => (slug: string) => {
    recordEvent({ action: 'click_entity', entityType: slug })
    onTopicClick(slug)
  }, [onTopicClick])

  return (
    <section className="discover-page" aria-label="Discover history explorations">
      <div className="discover-hero">
        <h2 className="discover-hero-title">{DISCOVER_HERO}</h2>
        <p className="discover-hero-sub">{DISCOVER_HERO_SUB}</p>
      </div>

      {/* M62-A: tabbed landing — 了解 (capability + start) / 研究 (personal activity) / 扩展 (roadmap) */}
      <div className="discover-tabs" role="tablist" aria-label="探索分类">
        <button
          type="button"
          role="tab"
          id="tab-understand"
          aria-selected={tab === 'understand'}
          aria-controls="panel-understand"
          className={`discover-tab${tab === 'understand' ? ' active' : ''}`}
          onClick={() => setTab('understand')}
        >
          了解
        </button>
        <button
          type="button"
          role="tab"
          id="tab-research"
          aria-selected={tab === 'research'}
          aria-controls="panel-research"
          className={`discover-tab${tab === 'research' ? ' active' : ''}`}
          onClick={() => setTab('research')}
        >
          研究
        </button>
        <button
          type="button"
          role="tab"
          id="tab-expand"
          aria-selected={tab === 'expand'}
          aria-controls="panel-expand"
          className={`discover-tab${tab === 'expand' ? ' active' : ''}`}
          onClick={() => setTab('expand')}
        >
          扩展
        </button>
      </div>

      {/* 了解 — product capabilities + primary exploration entry */}
      <div
        className="discover-tab-panel"
        role="tabpanel"
        id="panel-understand"
        aria-labelledby="tab-understand"
        hidden={tab !== 'understand'}
      >
        {/* M62-A: surface the warm personalization copy + interest profile on the
            default landing tab so it is visible without switching to 研究. */}
        <InterestProfile />
        <ProductIntro />

        <div className="discover-explore-primary">
          <h3 className="discover-section-heading">开始探索</h3>
          <p className="discover-section-sub">选择一个历史主题或类型，进入交互式探索。</p>

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
                  onClick={() => handleTopicClick(card.slug)}
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
              onClick={() => handleTopicClick(FEATURED_TOPIC)}
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
                    onClick={() => handleTopicClick(slug)}
                  >
                    {prettifySlug(slug)}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* 研究 — personal research activity */}
      <div
        className="discover-tab-panel"
        role="tabpanel"
        id="panel-research"
        aria-labelledby="tab-research"
        hidden={tab !== 'research'}
      >
        <RecentResearches researches={researches} />
        <ResearchLibraryEntry />
      </div>

      {/* 扩展 — roadmap / upcoming */}
      <div
        className="discover-tab-panel"
        role="tabpanel"
        id="panel-expand"
        aria-labelledby="tab-expand"
        hidden={tab !== 'expand'}
      >
        <div className="discover-expand">
          <h3 className="discover-section-heading">扩展功能</h3>
          <p className="discover-section-sub">更多功能即将推出。包括 AI 内容创作、教育模块和社交探索。</p>
          <p className="discover-expand-soon">敬请期待</p>
        </div>
      </div>
    </section>
  )
}

export default DiscoverPage
