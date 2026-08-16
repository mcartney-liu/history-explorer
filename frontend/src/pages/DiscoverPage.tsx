// Discover landing experience (M35 Phase 2 / M42 Phase 4).
//
// M35: presentational entry page with hero + featured + popular
// M42: personalized discovery using ResearchHistory, UserInterestProfile,
//      and entity-type exploration entry points.
// M44: added ProductIntro section — static capability showcase for new visitors.
// M59-002: migrated cards to <Card> component.
// M65 Phase 2A: entity-type cards migrated to TopicCardGrid.
// M90.5 — Dashboard redesign: top half becomes a visual "Historical Exhibit"
//          footprint card + sidebar, while keeping all existing entry points
//          below so tests and navigation remain intact.
// P5-S4 — 主题卡片墙 + 主题界面（PO 2026-08-09）：
//         探索主题区 = 6 类主题卡片墙（古代文明/历史事件/历史人物/宗教发展/
//         技术演进/地理探索）；点主题卡进入该主题界面，列出该主题下的
//         文明卡 + 探索包（探索包按 seed_topic→topic.category 归位）。
//         教材（Textbook）暂不归类、不出现在卡片墙与主题界面。

import { useMemo, useEffect, useState } from 'react'
import { useLocale } from '../data/locale'
import { lookup } from '../locales'
import type { NavNode } from '../components/navigation'
import { TOPIC_STARTERS } from '../data/explorationStarters'
import type { StarterItem } from '../data/explorationStarters'
import { getEntityIcon } from '../data/entity/entityLabels'
import { Icon } from '../components/ui/Icon'
import type { IconName } from '../components/ui/Icon'
import { recordEvent } from '../data/UserBehaviorEvent'
import { TopicCardGrid } from '../components/discover/TopicCardGrid'
import type { TopicCardData } from '../components/discover/TopicCard'
import { getPackagesByPlacement, type ExplorationPackage } from '../data/explorationPackages'
import PackageCard from '../components/package/PackageCard'

// Fixed hero copy — Design Freeze §2. Do NOT reword or generate.
export const DISCOVER_HERO = lookup('zh', 'discover.hero')
export const DISCOVER_HERO_SUB = lookup('zh', 'discover.heroSub')

// Featured exploration — Design Freeze §2 default.
export const FEATURED_TOPIC = 'silk_road'

// P5-S4: 主题卡片墙的 6 个固定分类（教材 Textbook 暂不归类）。
// 显示顺序即数组顺序；文案走 discover.cat.<Category>.label|desc。
export const THEME_CATEGORIES = [
  'Civilization',
  'Event',
  'Person',
  'Religion',
  'Technology',
  'Location',
] as const

// Category display metadata is resolved at render time via t(`discover.cat.<Category>.label|desc`)
// (ADR-0020 UI i18n) — no hardcoded zh strings here.

// Same display rule App.prettifyTopic uses (pure, tiny; duplicated on purpose
// so this page stays import-light and App's helper stays private).
export function prettifySlug(t: string): string {
  return t.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

type DiscoverPageProps = {
  /** All available topics from the backend (with category). Used to build category cards dynamically. */
  topics?: { topic: string; title: string; summary: string; category?: string }[]
  onTopicClick: (topic: string) => void
  onStarterClick?: (target: NavNode) => void
  onPackageClick?: (slug: string) => void
}

// 从 global_id 推断实体子类型 → 取对应类型图标（StarterChips 图标化用）。
// global_id 形如 <topic>:<local>，local 前缀 person-/religion-/tech-/event-/loc-/idea-，
// 裸或 civ- 前缀归为 Civilization（与 EntityType 枚举一致）。
function entityTypeFromGlobalId(gid: string): string {
  const local = gid.split(':')[1] ?? ''
  if (local.startsWith('person-')) return 'Person'
  if (local.startsWith('religion-')) return 'Religion'
  if (local.startsWith('tech-')) return 'Technology'
  if (local.startsWith('event-')) return 'Event'
  if (local.startsWith('loc-')) return 'Location'
  if (local.startsWith('idea-')) return 'Idea'
  return 'Civilization'
}

function StarterChips({
  starters,
  onStarterClick,
}: {
  starters: StarterItem[]
  onStarterClick?: (target: NavNode) => void
}) {
  if (starters.length === 0) return null
  return (
    <ul className="discover-starter-list">
      {starters.map((s) => {
        const gid = s.target.type === 'entity' ? s.target.id : ''
        const stype = entityTypeFromGlobalId(gid)
        return (
          <li key={s.id}>
            <button
              type="button"
              className="discover-starter"
              data-starter={s.id}
              aria-label={`Explore ${s.label}`}
              onClick={() => onStarterClick?.(s.target)}
            >
              <Icon name={getEntityIcon(stype) as IconName} size={16} className="discover-starter-icon" />
              {s.label}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

// P5-S4: 探索包 → 主题归属。探索包的 pkg.category 字段不可靠（多个包
// 误标 Civilization），以 M69 稳定指针 seed_topic → backend topic.category
// 为准。seed_topic 可能是字符串或 {zh} 对象，统一取字符串形式。
function packageCategory(pkg: ExplorationPackage): string {
  const seed = typeof pkg.seed_topic === 'string'
    ? pkg.seed_topic
    : (pkg.seed_topic as { zh?: string } | undefined)?.zh ?? ''
  return seed
}

function DiscoverPage({ topics = [], onTopicClick, onStarterClick, onPackageClick = () => {} }: DiscoverPageProps) {
  const { t } = useLocale()
  const featuredStarters = TOPIC_STARTERS[FEATURED_TOPIC] ?? []

  // P5-S4: 当前激活的主题分类（null = 展示主题卡片墙）。
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  // P5-S4: 主题卡片墙 = 6 个固定分类，每类一张卡（文案走 discover.cat.*）。
  // 仅当该分类下确实有 backend topic 时才显示，避免空壳。
  const categoryCards = useMemo(() => {
    const present = new Set(topics.map((tp) => tp.category).filter(Boolean) as string[])
    return THEME_CATEGORIES.filter((cat) => present.has(cat)).map((cat) => ({
      slug: cat,
      label: t(`discover.cat.${cat}.label`),
      desc: t(`discover.cat.${cat}.desc`),
    }))
  }, [topics, t])

  // P5-S4: 激活主题下的文明卡（backend topics 按 category 过滤）。
  const themeCards = useMemo(
    () =>
      topics
        .filter((tp) => tp.category === activeCategory)
        .map((topic): TopicCardData => ({
          slug: topic.topic,
          label: topic.title,
          desc: topic.summary,
        })),
    [topics, activeCategory],
  )

  // P5-S4: 激活主题下的探索包（seed_topic → topic.category 归位）。
  const themePackages = useMemo(() => {
    if (!activeCategory) return []
    const topicBySeed = new Map(topics.map((tp) => [tp.topic, tp.category]))
    return getPackagesByPlacement('understand').filter((pkg) => {
      const seed = packageCategory(pkg)
      return topicBySeed.get(seed) === activeCategory
    })
  }, [topics, activeCategory])

  // M45: record discovery page visit
  useEffect(() => { recordEvent({ action: 'open_discover' }) }, [])

  // M45 Phase 3: wrap navigation to record click_entity
  const handleTopicClick = useMemo(() => (slug: string) => {
    recordEvent({ action: 'click_entity', entityType: slug })
    onTopicClick(slug)
  }, [onTopicClick])

  // P5-S4: 主题卡片墙 → 点主题卡进入主题界面。
  const handleCategoryClick = (category: string) => {
    setActiveCategory(category)
    recordEvent({ action: 'switch_tab', tab: category })
  }

  return (
    <section className="discover-page" aria-label="Discover history explorations">
      <div className="discover-hero">
        <h2 className="discover-hero-title">{t('discover.hero')}</h2>
        <p className="discover-hero-sub">{t('discover.heroSub')}</p>
      </div>

      {/* 下半区：探索主题与官方探索包 */}
      <div className="discover-lower">
        <div className="discover-lower-main">
          <div className="discover-explore-primary">
        {/* P5-S4: 探索主题 = 主题卡片墙（6 类）→ 点进主题界面。
            教材（Textbook）不归类，不出现在卡片墙。 */}
        {categoryCards.length > 0 && (
          <div className="discover-themes">
            <h3 className="discover-section-heading">{t('discover.exploreTopicsHeading')}</h3>
            <p className="discover-section-sub">{t('discover.exploreTopicsSub')}</p>

            {!activeCategory ? (
              <div className="discover-theme-grid">
                {categoryCards.map((c) => (
                  <button
                    key={c.slug}
                    type="button"
                    className="discover-theme-card"
                    data-category={c.slug}
                    aria-label={t('discover.themeOpenAria', { label: c.label })}
                    onClick={() => handleCategoryClick(c.slug)}
                  >
                    <span className="discover-theme-label">{c.label}</span>
                    <span className="discover-theme-desc">{c.desc}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="discover-theme-detail">
                <div className="discover-theme-detail-head">
                  <button
                    type="button"
                    className="discover-theme-back"
                    onClick={() => setActiveCategory(null)}
                  >
                    {t('discover.themeBack')}
                  </button>
                  <h3 className="discover-section-heading">
                    {t(`discover.cat.${activeCategory}.label`)}
                  </h3>
                </div>

                {themeCards.length > 0 && (
                  <TopicCardGrid
                    variant="entity"
                    cards={themeCards}
                    onCardClick={handleTopicClick}
                    maxCards={8}
                  />
                )}

                {themePackages.length > 0 && (
                  <div className="discover-package-grid">
                    {themePackages.map((p) => (
                      <PackageCard key={p.slug} pkg={p} onOpen={(slug) => onPackageClick(slug)} />
                    ))}
                  </div>
                )}

                {themeCards.length === 0 && themePackages.length === 0 && (
                  <p className="discover-empty-text">{t('discover.themeEmpty')}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* M69 — 官方探索包（核心产品对象）：按 placement 驱动，understand → 了解 tab */}
        <div className="discover-packages">
          <h3 className="discover-section-heading">{t('discover.packagesHeading')}</h3>
          <p className="discover-section-sub">{t('discover.packagesSub')}</p>
          <div className="discover-package-grid">
            {getPackagesByPlacement('understand').map((p) => (
              <PackageCard key={p.slug} pkg={p} onOpen={(slug) => onPackageClick(slug)} />
            ))}
          </div>
        </div>

        {/* 系统精选：编辑策展入口 + 起始线索（"我的探索空间"已随"我的"tab 迁移） */}
        <div className="discover-featured" data-topic={FEATURED_TOPIC}>
          <h3 className="discover-section-heading">{t('discover.editorHeading')}</h3>
          <button
            type="button"
            className="discover-featured-card"
            aria-label={`Explore ${prettifySlug(FEATURED_TOPIC)}`}
            onClick={() => handleTopicClick(FEATURED_TOPIC)}
          >
            <span className="discover-featured-title">{prettifySlug(FEATURED_TOPIC)}</span>
            <span className="discover-featured-desc">
              {t('discover.editorDesc')}
            </span>
          </button>
          <StarterChips starters={featuredStarters} onStarterClick={onStarterClick} />
        </div>
      </div>
      </div>
    </div>
    </section>
  )
}

export default DiscoverPage
