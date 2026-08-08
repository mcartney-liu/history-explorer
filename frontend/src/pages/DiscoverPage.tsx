// Discover landing experience (M35 Phase 2 / M42 Phase 4).
//
// M35: presentational entry page with hero + featured + popular
// M42: personalized discovery using ResearchHistory, UserInterestProfile,
//      and entity-type exploration entry points.
// M44: added ProductIntro section — static capability showcase for new visitors.
// M59-002: migrated cards to <Card> component.
// M65 Phase 2A: entity-type cards migrated to TopicCardGrid.

import { useMemo, useEffect } from 'react'
import type { NavNode } from '../components/navigation'
import { TOPIC_STARTERS } from '../data/explorationStarters'
import type { StarterItem } from '../data/explorationStarters'
import { listResearch } from '../data/ResearchHistory'
import type { SavedResearch } from '../data/ResearchHistory'
import { generateBehavioralInterestProfile } from '../data/ResearchInsights'
import type { BehavioralSignals } from '../data/ResearchInsights'
import { recordEvent } from '../data/UserBehaviorEvent'
import ResearchDiscoveryPanel from '../components/ResearchDiscoveryPanel'
import { Icon } from '../components/ui/Icon'
import { TopicCardGrid } from '../components/discover/TopicCardGrid'
import type { TopicCardData } from '../components/discover/TopicCard'
import { getPackages } from '../data/explorationPackages'
import PackageCard from '../components/package/PackageCard'

// Fixed hero copy — Design Freeze §2. Do NOT reword or generate.
export const DISCOVER_HERO = '原来历史还能这样探索。'
export const DISCOVER_HERO_SUB =
  '从一个人、一条路、一个念头出发，看它如何穿过帝国、宗教与技术，把整个古代世界连成一张网。'

// Featured exploration — Design Freeze §2 default.
export const FEATURED_TOPIC = 'silk_road'

// Category display metadata. The mapping from category enum to user-facing label
// and description. Used to build entity type cards from backend topic data.
const CATEGORY_META: Record<string, { label: string; desc: string }> = {
  Civilization: { label: '古代文明', desc: '罗马、汉朝、波斯…帝国兴衰的背后' },
  Event:        { label: '历史事件', desc: '关键转折点：战争、革命、变革' },
  Person:       { label: '历史人物', desc: '恺撒、亚里士多德、释迦牟尼' },
  Religion:     { label: '宗教发展', desc: '佛教、基督教、伊斯兰教的传播' },
  Technology:   { label: '技术演进', desc: '冶铁、造纸、航海技术' },
  Location:     { label: '地理探索', desc: '丝绸之路、地中海、恒河流域' },
}

// T2 — Cognitive Mirror. Reads REAL behavioral signals (events / navigation /
// recent / growth graph), not ResearchHistory (which stays empty until the
// user saves). It reflects the user's own trajectory back at them and is
// never used to rank or recommend anything.
function InterestProfile({ signals }: { signals?: BehavioralSignals }) {
  const profile = useMemo(
    () => generateBehavioralInterestProfile(signals ?? {}),
    [signals],
  )

  // A brand-new user with zero signals: keep the onboarding copy.
  if (profile.interactionCount < 1) {
    return (
      <div className="discover-interest discover-interest--empty">
        <h3 className="discover-section-heading">我的探索足迹</h3>
        <p className="discover-empty-text">
          开始探索后，这里会映照出你自己的追问轨迹。
        </p>
        <p className="discover-empty-sub">
          它只反映你走过的路径，不替你决定下一步。
        </p>
      </div>
    )
  }

  const thin = profile.topSubjects.length < 2

  return (
    <div className="discover-interest">
      <h3 className="discover-section-heading">我的探索足迹</h3>

      {profile.reflection && (
        <p className="discover-interest-reflection">{profile.reflection}</p>
      )}

      {/* Graceful degradation: too thin for a pattern — still reflect the
          recent trajectory instead of hiding the whole shelf. */}
      {thin ? (
        <>
          <p className="discover-interest-dims">你最近的探索</p>
          {profile.recentlyExplored.length > 0 && (
            <div className="discover-interest-themes">
              {profile.recentlyExplored.slice(0, 4).map((s) => (
                <span key={s} className="discover-interest-tag">{s}</span>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="discover-interest-themes">
          {profile.topSubjects.slice(0, 4).map((s) => (
            <span key={s.subject} className="discover-interest-tag">{s.subject}</span>
          ))}
        </div>
      )}

      {profile.topThemes.length > 0 && (
        <div className="discover-interest-themes">
          {profile.topThemes.slice(0, 4).map((theme) => (
            <span key={theme} className="discover-interest-tag">{theme}</span>
          ))}
        </div>
      )}

      {profile.topDimensions.length > 0 && (
        <p className="discover-interest-dims">
          你的追问方式：{profile.topDimensions.slice(0, 4).map((d) => d.dimension).join('、')}
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
  /** All available topics from the backend (with category). Used to build category cards dynamically. */
  topics?: { topic: string; title: string; summary: string; category?: string }[]
  onTopicClick: (topic: string) => void
  onStarterClick?: (target: NavNode) => void
  onPackageClick?: (slug: string) => void
  onCausalObjectClick?: (objectId: string) => void
  /** P5-S3 ②: 兴趣前置——点击「我想研究…」跳到研究 tab（由 App 接管切换）。 */
  onResearchStart?: () => void
  /** T1: open a bookmarked research on its entity's research tab. */
  onOpenResearch?: (entityGlobalId: string, entityName: string) => void
  /** T2: real behavioral signals owned by App (navigation / recent / growth). */
  behavioralSignals?: BehavioralSignals
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
      {starters.map((s) => (
        <li key={s.id}>
          <button
            type="button"
            className="discover-starter"
            data-starter={s.id}
            aria-label={`Explore ${s.label}`}
            onClick={() => onStarterClick?.(s.target)}
          >
            {s.label}
          </button>
        </li>
      ))}
    </ul>
  )
}

// M44 — Recent researches（最近探索的实体；空态引导）。M60 恢复：该组件
// 的渲染调用曾在重构中丢失（DiscoverPage 未挂载它），但 DiscoverPage.test
// 的 M44 Empty States 用例与 UIAudit 注册表均要求它存在，故补回渲染而非删除。
function RecentResearches({ researches }: { researches: SavedResearch[] }) {
  if (researches.length === 0) {
    return (
      <div className="discover-recent discover-recent--empty">
        <h3 className="discover-section-heading">最近研究</h3>
        <p className="discover-empty-text">你还没有开始探索。</p>
        <div className="discover-empty-actions">
          <p>试试：</p>
          <ul>
            <li>搜索一个历史主题（如“罗马”“丝绸之路”）</li>
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
          <div key={r.id} className="discover-recent-card">
            <span className="discover-recent-type">{r.entityType}</span>
            <span className="discover-recent-name">{r.entityName}</span>
            {r.bookmarked && <Icon name="star" size={16} className="discover-recent-star" filled />}
          </div>
        ))}
      </div>
    </div>
  )
}

// M44 Phase 6 — ResearchLibrary entry on DiscoverPage（与 RecentResearches 同因恢复）
// T1: the items were dead <span>s that claimed "点击可跳转". They are now real
// buttons that open the entity straight on its research tab.
function ResearchLibraryEntry({
  onOpenResearch,
}: {
  onOpenResearch?: (entityGlobalId: string, entityName: string) => void
}) {
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
            <button
              type="button"
              className="discover-library-link"
              disabled={!r.entityGlobalId}
              aria-label={`打开 ${r.entityName} 的研究`}
              onClick={() => {
                if (!r.entityGlobalId) return
                recordEvent({ action: 'restore_research', entityGlobalId: r.entityGlobalId })
                onOpenResearch?.(r.entityGlobalId, r.entityName)
              }}
            >
              <span className="discover-library-type">{r.entityType}</span>
              {r.entityName}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

// M85.9 — Civilization Understanding Seeds（文明问题入口）
const UNDERSTANDING_SEEDS = [
  {
    id: 'institutional_evolution',
    question: '一个庞大的国家，如何解决治理千万人的问题？',
    relationLabel: '制度演化',
    path: '秦制 → 科举 → 三省六部',
    entryObjectId: 'co-004',
  },
  {
    id: 'civilization_contrast',
    question: '为什么有些文明选择法律治理，而另一些选择官僚治理？',
    relationLabel: '文明对比',
    path: '罗马法 → 秦制',
    entryObjectId: 'co-009',
  },
  {
    id: 'technological_chain',
    question: '人类如何保存和传播知识，让文明延续千年？',
    relationLabel: '技术链',
    path: '造纸术 → 印刷术 → 知识传播',
    entryObjectId: 'co-008',
  },
]

function UnderstandingSeeds({
  onCausalObjectClick,
}: {
  onCausalObjectClick: (objectId: string) => void
}) {
  return (
    <div className="discover-understanding-seeds">
      <h3 className="discover-section-heading">开始一次文明理解</h3>
      <p className="discover-section-sub">
        选择一个你感兴趣的文明问题，开始理解之旅。
      </p>
      <div className="discover-seeds-grid">
        {UNDERSTANDING_SEEDS.map((seed) => (
          <button
            key={seed.id}
            type="button"
            className="discover-seed-card"
            onClick={() => onCausalObjectClick(seed.entryObjectId)}
          >
            <span className="discover-seed-question">{seed.question}</span>
            <span className="discover-seed-relation">{seed.relationLabel}</span>
            <span className="discover-seed-path">{seed.path}</span>
            <span className="discover-seed-cta">开始理解 →</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function DiscoverPage({ topics = [], onTopicClick, onStarterClick, onPackageClick = () => {}, onCausalObjectClick = () => {}, onResearchStart, onOpenResearch, behavioralSignals }: DiscoverPageProps) {
  const featuredStarters = TOPIC_STARTERS[FEATURED_TOPIC] ?? []
  const popularSlugs = Object.keys(TOPIC_STARTERS).filter(
    (slug) => slug !== FEATURED_TOPIC,
  )
  // M60: RecentResearches 的数据源（listResearch 读取本地 ResearchHistory）。
  const recentResearches = useMemo(() => listResearch(), [])

  // Build category cards dynamically from backend topics that have a category.
  // One card per category — picks the first topic in that category as the target.
  const categoryCards = useMemo(() => {
    const seen = new Set<string>()
    const cards: { slug: string; label: string; desc: string }[] = []
    for (const t of topics) {
      const cat = t.category
      if (!cat || seen.has(cat)) continue
      const meta = CATEGORY_META[cat]
      if (!meta) continue
      seen.add(cat)
      cards.push({ slug: t.topic, label: meta.label, desc: meta.desc })
    }
    return cards
  }, [topics])

  // M45: record discovery page visit
  useEffect(() => { recordEvent({ action: 'open_discover' }) }, [])

  // M45 Phase 3: wrap navigation to record click_entity
  const handleTopicClick = useMemo(() => (slug: string) => {
    recordEvent({ action: 'click_entity', entityType: slug })
    onTopicClick(slug)
  }, [onTopicClick])

  // T2/T3: merge App-owned signals with the saved researches so the mirror
  // sees everything the user has actually done.
  const mirrorSignals = useMemo<BehavioralSignals>(
    () => ({ ...(behavioralSignals ?? {}), researches: recentResearches }),
    [behavioralSignals, recentResearches],
  )
  const mirror = useMemo(
    () => generateBehavioralInterestProfile(mirrorSignals),
    [mirrorSignals],
  )

  // T3 first-mile: a brand-new user (no signals, no researches, no bookmarks)
  // should see ONE primary CTA — the hero + a seed question. The personal
  // shelves are still rendered, but folded away instead of shouting "empty".
  const bookmarkedCount = recentResearches.filter((r) => r.bookmarked).length
  const isFirstMile =
    mirror.interactionCount < 1 && recentResearches.length === 0 && bookmarkedCount === 0

  const personalShelves = (
    <>
      <InterestProfile signals={mirrorSignals} />
      <RecentResearches researches={recentResearches} />
      <ResearchLibraryEntry onOpenResearch={onOpenResearch} />
    </>
  )

  return (
    <section className="discover-page" aria-label="Discover history explorations">
      <div className="discover-hero">
        <h2 className="discover-hero-title">{DISCOVER_HERO}</h2>
        <p className="discover-hero-sub">{DISCOVER_HERO_SUB}</p>
      </div>

      {/* P5-S3 ②: 兴趣前置——进场第一屏先问「你想研究什么」，预设主题降为次级。 */}
      <div className="discover-research-cta">
        <div className="discover-research-cta-text">
          <h3 className="discover-research-cta-title">我想研究…</h3>
          <p className="discover-research-cta-sub">
            先说你想钻的问题，再去翻事实。点这里进入研究模式，就任何历史主题追问「为什么」。
          </p>
        </div>
        <button
          type="button"
          className="discover-research-cta-btn"
          onClick={() => onResearchStart?.()}
        >
          开始研究 →
        </button>
      </div>

      {/* M62-A / T2 — Cognitive Mirror + M44 recent/library shelves.
          T3 first-mile: folded for a brand-new user so the hero stays the
          single primary CTA; expanded as soon as there is any real signal. */}
      {isFirstMile ? (
        <details className="discover-first-mile-fold">
          <summary className="discover-first-mile-summary">我的探索足迹（还没有记录）</summary>
          {personalShelves}
        </details>
      ) : (
        personalShelves
      )}

      {/* T2 — interest discovery, previously built but never mounted. */}
      {!isFirstMile && (
        <ResearchDiscoveryPanel
          currentEntity={{
            globalId: mirror.topSubjects[0]?.subject ?? '',
            name: mirror.topSubjects[0]?.subject ?? '',
            type: 'Civilization',
          }}
          relationships={[]}
          onExplore={(gid) => onOpenResearch?.(gid, gid)}
        />
      )}

      {/* M85.8 — Civilization Understanding Seeds — 文明理解入口 */}
      <UnderstandingSeeds onCausalObjectClick={onCausalObjectClick} />

      <div className="discover-explore-primary">
        <h3 className="discover-section-heading">开始探索</h3>
        <p className="discover-section-sub">选择一个历史主题或类型，进入交互式探索。</p>

        {/* M42 / M65 Phase 2A: Entity type exploration.
            Wave2-#140: categoryCards is derived from backend topics. When the
            backend is loading / unreachable / returns uncategorised topics the
            grid is empty — render nothing rather than a titled empty shell. */}
        {categoryCards.length > 0 && (
          <div className="discover-themes">
            <h3 className="discover-section-heading">探索主题</h3>
            <p className="discover-section-sub">按历史类型浏览，发现你的兴趣方向。</p>
            <TopicCardGrid
              variant="entity"
              cards={categoryCards.map((c): TopicCardData => ({ slug: c.slug, label: c.label, desc: c.desc }))}
              onCardClick={handleTopicClick}
              maxCards={6}
            />
          </div>
        )}

        {/* M69 — 官方探索包（核心产品对象），与 6 固定主题并列，不替代 */}
        <div className="discover-packages">
          <h3 className="discover-section-heading">官方探索包 · Exploration Packages</h3>
          <p className="discover-section-sub">由编辑策展的历史探索旅程：可溯源、沿时间与关系展开。</p>
          <div className="discover-package-grid">
            {getPackages().map((p) => (
              <PackageCard key={p.slug} pkg={p} onOpen={(slug) => onPackageClick(slug)} />
            ))}
          </div>
        </div>

        {/* M69 — 未来用户探索空间（占位，不实现生成/存储/社区） */}
        <div className="discover-user-space">
          <h3 className="discover-section-heading">我的探索空间 · My Exploration</h3>
          <p className="discover-section-sub">未来你将能创建自己的探索路径、保存视角与学习轨迹。（规划中）</p>
          <div className="discover-user-space-card discover-user-space-card--locked">
            <span className="discover-user-space-lock">即将推出</span>
            <p>用户探索包、社区精选探索功能正在规划中。</p>
          </div>
        </div>

        <div className="discover-featured" data-topic={FEATURED_TOPIC}>
          <h3 className="discover-section-heading">系统精选 · 编辑策展</h3>
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
          <h3 className="discover-section-heading">大家都在探索</h3>
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
    </section>
  )
}

export default DiscoverPage
