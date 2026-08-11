// ============================================================
// MyExplorationPanel — "我的" tab 内容（P5-S4 信息架构拆分）
//
// 从 DiscoverPage 抽出（M90.5 Discover Dashboard + M69 我的探索空间）：
//   - 我的探索足迹（Historical Exhibit 足迹卡 + 关联图 + 追问维度 + 更多路径）
//   - 最近研究（RecentResearches）
//   - 我的研究收藏（ResearchLibraryEntry）
//   - 推荐探索（ResearchDiscoveryPanel）
//   - 我的探索空间（user-space 占位）
//
// 原来这些"关于我"的内容放在"了解"tab 里语义串味；拆分后"我的"tab
// 专注用户个人数据，"了解"tab 只负责浏览世界。
//
// 数据自持：mirror（行为画像）由 behavioralSignals + ResearchHistory
// 在组件内计算，props 只需回调，不依赖 DiscoverPage。
// ============================================================

import { useMemo } from 'react'
import { useLocale } from '../../data/locale'
import type { NavNode } from '../navigation'
import { TOPIC_STARTERS } from '../../data/explorationStarters'
import { listResearch, setPendingRestore } from '../../data/ResearchHistory'
import type { SavedResearch } from '../../data/ResearchHistory'
import { generateBehavioralInterestProfile } from '../../data/ResearchInsights'
import type { BehavioralSignals } from '../../data/ResearchInsights'
import { recordEvent } from '../../data/UserBehaviorEvent'
import ResearchDiscoveryPanel from '../ResearchDiscoveryPanel'
import { Icon, type IconName } from '../ui/Icon'

// Featured exploration — Design Freeze §2 default（与 DiscoverPage 同源复制，
// 保持本组件 import-light，避免反向依赖页面模块）。
const FEATURED_TOPIC = 'silk_road'

// Same display rule App.prettifyTopic uses（同 DiscoverPage 的复制理由）。
export function prettifySlug(t: string): string {
  return t.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function slugifyId(raw: string): string {
  return raw
    .replace(/^[^:]+:/, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase()
}

const TYPE_ICON: Partial<Record<string, IconName>> = {
  Person: 'person',
  Civilization: 'civilization',
  Event: 'event',
  Location: 'location',
  Technology: 'technology',
  Religion: 'religion',
  Idea: 'idea',
}

const REL_ICONS: IconName[] = ['civilization', 'globe', 'idea']
const DEFAULT_DIMENSIONS = ['discover.dim.curator', 'discover.dim.causal', 'discover.dim.ask']

// ---------------------------------------------------------------------------
// M44 — Recent researches（最近探索的实体；空态引导）
// ---------------------------------------------------------------------------
function RecentResearches({ researches, onOpenResearch }: { researches: SavedResearch[]; onOpenResearch?: (entityGlobalId: string, entityName: string) => void }) {
  const { t } = useLocale()
  if (researches.length === 0) {
    return (
      <div className="discover-recent discover-recent--empty">
        <h3 className="discover-section-heading">{t('discover.recentHeading')}</h3>
        <p className="discover-empty-text">{t('discover.recentEmpty')}</p>
        <div className="discover-empty-actions">
          <p>{t('discover.recentTry')}</p>
          <ul>
            <li>{t('discover.recentTrySearch')}</li>
            <li>{t('discover.recentTryStarters')}</li>
            <li>{t('discover.recentTryCategory')}</li>
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
      <h3 className="discover-section-heading">{t('discover.recentHeading')}</h3>
      <p className="discover-section-sub">{t('discover.recentSub')}</p>
      <div className="discover-recent-list">
        {recent.map((r) => (
          <button
            key={r.id}
            type="button"
            className="discover-recent-card"
            disabled={!r.entityGlobalId}
            onClick={() => {
              if (!r.entityGlobalId) return
              recordEvent({ action: 'restore_research', entityGlobalId: r.entityGlobalId })
              // 2026-08-11 (PO 方案B): 记住要恢复的研究，跳实体页后自动打开
              setPendingRestore(r.id)
              onOpenResearch?.(r.entityGlobalId, r.entityName)
            }}
          >
            <span className="discover-recent-type">{r.entityType}</span>
            <span className="discover-recent-name">{r.entityName}</span>
            {r.bookmarked && <Icon name="star" size={16} className="discover-recent-star" filled />}
          </button>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// M44 Phase 6 — ResearchLibrary entry（我的研究收藏）
// ---------------------------------------------------------------------------
function ResearchLibraryEntry({
  onOpenResearch,
}: {
  onOpenResearch?: (entityGlobalId: string, entityName: string) => void
}) {
  const { t } = useLocale()
  const researches = useMemo(() => listResearch().filter((r) => r.bookmarked), [])
  if (researches.length === 0) return null
  return (
    <div className="discover-library">
      <h3 className="discover-section-heading">{t('discover.libraryHeading')}</h3>
      <p className="discover-section-sub">
        {t('discover.libraryCount', { n: String(researches.length) })}
      </p>
      <ul className="discover-library-list">
        {researches.slice(0, 5).map((r) => (
          <li key={r.id}>
            <button
              type="button"
              className="discover-library-link"
              disabled={!r.entityGlobalId}
              aria-label={t('discover.openResearchAria', { name: r.entityName })}
              onClick={() => {
                if (!r.entityGlobalId) return
                recordEvent({ action: 'restore_research', entityGlobalId: r.entityGlobalId })
                // 2026-08-11 (PO 方案B): 记住要恢复的研究，跳实体页后自动打开
                setPendingRestore(r.id)
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

// ---------------------------------------------------------------------------
// DashboardGraph — 足迹关联图（SVG）
// ---------------------------------------------------------------------------
function DashboardGraph({
  focusName,
  focusType,
  nodes,
  onNodeClick,
}: {
  focusName: string
  focusType: string
  nodes: { name: string; icon: IconName }[]
  onNodeClick?: (name: string) => void
}) {
  const { t } = useLocale()
  const positions = [
    { x: 196, y: 42 },
    { x: 244, y: 90 },
    { x: 196, y: 138 },
  ]

  return (
    <svg className="dash-graph" viewBox="0 0 300 180" role="img" aria-label={t('discover.dashboardFocusGraphAria', { name: focusName })}>
      <defs>
        <marker id="dash-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 L2,4 Z" fill="var(--color-accent)" />
        </marker>
      </defs>
      {/* connection lines */}
      {positions.map((p, i) => (
        <line
          key={i}
          x1={78}
          y1={90}
          x2={p.x - 22}
          y2={p.y}
          stroke="var(--color-accent)"
          strokeWidth="1.2"
          strokeOpacity="0.55"
          markerEnd="url(#dash-arrow)"
        />
      ))}
      {/* center node */}
      <g className="dash-node dash-node--center">
        <circle cx="60" cy="90" r="28" fill="var(--color-accent)" />
        <foreignObject x="36" y="66" width="48" height="48">
          <div className="dash-node-icon-wrap">
            <Icon name={TYPE_ICON[focusType] ?? 'book'} size={20} />
          </div>
        </foreignObject>
        <text x="60" y="132" textAnchor="middle" className="dash-node-label dash-node-label--center">
          {focusName.slice(0, 10)}
        </text>
      </g>
      {/* satellite nodes */}
      {nodes.slice(0, 3).map((n, i) => {
        const p = positions[i]
        return (
          <g
            key={n.name + i}
            className="dash-node dash-node--sat"
            transform={`translate(${p.x}, ${p.y})`}
            onClick={() => onNodeClick?.(n.name)}
            role="button"
            tabIndex={0}
          >
            <circle r="22" />
            <foreignObject x="-12" y="-12" width="24" height="24">
              <div className="dash-node-icon-wrap">
                <Icon name={n.icon} size={16} />
              </div>
            </foreignObject>
            <text y="34" textAnchor="middle" className="dash-node-label">
              {n.name.slice(0, 8)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ---------------------------------------------------------------------------
// MyExplorationPanel — 我的探索足迹（主卡）+ 侧栏（最近研究/收藏/推荐探索）
// + 我的探索空间（占位）
// ---------------------------------------------------------------------------
export function MyExplorationPanel({
  behavioralSignals,
  onTopicClick,
  onStarterClick,
  onOpenResearch,
}: {
  behavioralSignals?: BehavioralSignals
  onTopicClick: (topic: string) => void
  onStarterClick?: (target: NavNode) => void
  onOpenResearch?: (entityGlobalId: string, entityName: string) => void
}) {
  const { t } = useLocale()

  // 数据自持：最近研究 + 行为画像（原来是 DiscoverPage 算好传入）。
  const recentResearches = useMemo(() => listResearch(), [])
  const mirrorSignals = useMemo<BehavioralSignals>(
    () => ({ ...(behavioralSignals ?? {}), researches: recentResearches }),
    [behavioralSignals, recentResearches],
  )
  const mirror = useMemo(
    () => generateBehavioralInterestProfile(mirrorSignals),
    [mirrorSignals],
  )

  const featuredStarters = TOPIC_STARTERS[FEATURED_TOPIC] ?? []
  const popularSlugs = Object.keys(TOPIC_STARTERS).filter(
    (slug) => slug !== FEATURED_TOPIC,
  )

  // Focus entity: prefer the most recent saved research, then top behavioral subject, then featured topic.
  const recent = useMemo(
    () =>
      [...recentResearches].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [recentResearches],
  )
  const focusResearch = recent[0]
  const focusName = focusResearch?.entityName ?? mirror.topSubjects[0]?.subject ?? prettifySlug(FEATURED_TOPIC)
  const focusType = focusResearch?.entityType ?? 'Topic'
  const focusGlobalId = focusResearch?.entityGlobalId ?? mirror.topSubjects[0]?.subject ?? FEATURED_TOPIC
  const focusId = slugifyId(focusGlobalId)

  // Related nodes: behavioral subjects first, then featured starters, then popular topics.
  const relatedNodes = useMemo(() => {
    const names: string[] = []
    for (const s of mirror.topSubjects.slice(1, 4)) {
      if (s.subject && s.subject !== focusName) names.push(s.subject)
    }
    if (names.length < 3) {
      for (const s of featuredStarters) {
        if (!names.includes(s.label)) names.push(s.label)
        if (names.length >= 3) break
      }
    }
    if (names.length < 3) {
      for (const slug of popularSlugs) {
        const label = prettifySlug(slug)
        if (!names.includes(label)) names.push(label)
        if (names.length >= 3) break
      }
    }
    return names.slice(0, 3).map((name, i) => ({ name, icon: REL_ICONS[i % REL_ICONS.length] }))
  }, [mirror.topSubjects, focusName, featuredStarters, popularSlugs])

  // Dimensions: reflect the user's actual cognitive moves, fallback to the canonical three.
  const dimensions = mirror.topDimensions.length
    ? mirror.topDimensions.slice(0, 3).map((d) => d.dimension)
    : DEFAULT_DIMENSIONS

  // More paths: top behavioral subjects or popular topics.
  const morePaths = useMemo(() => {
    const paths: string[] = []
    for (const s of mirror.topSubjects.slice(1, 3)) {
      if (s.subject && s.subject !== focusName) paths.push(s.subject)
    }
    if (paths.length < 2) {
      for (const slug of popularSlugs) {
        const label = prettifySlug(slug)
        if (!paths.includes(label) && label !== focusName) paths.push(label)
        if (paths.length >= 2) break
      }
    }
    return paths.slice(0, 2)
  }, [mirror.topSubjects, focusName, popularSlugs])

  return (
    <div className="my-exploration-panel">
      <section className="discover-dashboard" aria-label={t('discover.dashboardTitle')}>
        <div className="discover-dashboard-main">
          <h2 className="discover-section-heading dash-title">{t('discover.dashboardTitle')}</h2>

          <div className="dash-exhibit-card">
            {/* Left: historical exhibit card */}
            <div className="dash-exhibit">
              <span className="dash-exhibit-label">Historical Exhibit</span>
              <span className="dash-exhibit-type">{focusType}: {focusName}</span>
              <span className="dash-exhibit-id">{focusId}</span>
              <div className="dash-exhibit-portrait">
                <Icon name={TYPE_ICON[focusType] ?? 'book'} size={24} />
              </div>
            </div>

            {/* Middle: bridge icon */}
            <div className="dash-bridge" aria-hidden="true">
              <div className="dash-bridge-line" />
              <div className="dash-bridge-icon">
                <Icon name="book" size={24} />
              </div>
              <div className="dash-bridge-line" />
            </div>

            {/* Right: relationship graph */}
            <div className="dash-graph-wrap">
              <DashboardGraph
                focusName={focusName}
                focusType={focusType}
                nodes={relatedNodes}
                onNodeClick={(name) => {
                  // Best-effort navigation: try starter targets, then topic match.
                  const starter = featuredStarters.find((s) => s.label === name)
                  if (starter) {
                    onStarterClick?.(starter.target)
                    return
                  }
                  const slug = popularSlugs.find((s) => prettifySlug(s) === name)
                  if (slug) onTopicClick(slug)
                }}
              />
            </div>
          </div>

          <div className="dash-actions">
            <span className="dash-actions-prefix">{t('discover.dashboardAskPrefix', { name: focusName })}</span>
            {dimensions.map((d, i) => (
              <span key={d} className="dash-action-pill">
                {t(d)}
                {i < dimensions.length - 1 && <span className="dash-action-sep">|</span>}
              </span>
            ))}
          </div>

          <div className="dash-more">
            <span className="dash-more-label">{t('discover.dashboardMorePaths')}</span>
            {morePaths.map((p) => (
              <button
                key={p}
                type="button"
                className="dash-more-tag"
                onClick={() => {
                  const slug = popularSlugs.find((s) => prettifySlug(s) === p)
                  if (slug) onTopicClick(slug)
                }}
              >
                {p}
              </button>
            ))}
            {morePaths.length === 0 && (
              <span className="dash-more-placeholder">
                {prettifySlug(FEATURED_TOPIC)}
              </span>
            )}
          </div>

          {/* Hidden textual mirror for tests & screen readers */}
          {mirror.topThemes.length > 0 && (
            <span className="dash-hidden-themes" aria-hidden="true">
              {mirror.topThemes.join('、')}
            </span>
          )}
        </div>

        <aside className="discover-dashboard-sidebar">
          <RecentResearches researches={recentResearches} onOpenResearch={onOpenResearch} />
          <ResearchLibraryEntry onOpenResearch={onOpenResearch} />
          <ResearchDiscoveryPanel
            currentEntity={{
              globalId: focusGlobalId,
              name: focusName,
              type: focusType,
            }}
            relationships={[]}
            onExplore={(gid) => {
              if (!gid) return
              onOpenResearch?.(gid, gid)
            }}
          />
        </aside>
      </section>

      {/* M69 — 我的探索空间（占位，不实现生成/存储/社区） */}
      <div className="discover-user-space">
        <h3 className="discover-section-heading">{t('discover.mySpaceHeading')}</h3>
        <p className="discover-section-sub">{t('discover.mySpaceSub')}</p>
        <div className="discover-user-space-card discover-user-space-card--locked">
          <span className="discover-user-space-lock">{t('discover.mySpaceLock')}</span>
          <p>{t('discover.mySpaceNote')}</p>
        </div>
      </div>
    </div>
  )
}

export default MyExplorationPanel
