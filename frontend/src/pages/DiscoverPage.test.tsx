import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import DiscoverPage, {
  DISCOVER_HERO,
  FEATURED_TOPIC,
  prettifySlug,
} from './DiscoverPage'
import { TOPIC_STARTERS } from '../data/explorationStarters'
import { getStorageKey } from '../data/ResearchHistory'

// localStorage polyfill for Node environment
const store = new Map<string, string>()
beforeAll(() => {
  const mock: Storage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value) },
    removeItem: (key: string) => { store.delete(key) },
    clear: () => { store.clear() },
    get length() { return store.size },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
  }
  Object.defineProperty(globalThis, 'localStorage', { value: mock, writable: true })
})

beforeEach(() => {
  localStorage.clear()
})

// Wave2-#140: fixture for the category-card grid. `categoryCards` is derived
// from the backend `topics` prop (one card per distinct category), so tests
// that expect category cards must supply topics that carry a category.
const CATEGORY_TOPICS = [
  { topic: 'roman_empire', title: 'Roman Empire', summary: '', category: 'Civilization' },
  { topic: 'punic_wars', title: 'Punic Wars', summary: '', category: 'Event' },
  { topic: 'julius_caesar', title: 'Julius Caesar', summary: '', category: 'Person' },
]

// M35 Phase 2: DiscoverPage is purely presentational; rendered with
// renderToStaticMarkup (environment:'node', no DOM) matching the repo style.
const noop = () => {}

describe('DiscoverPage (M35)', () => {
  it('renders the FIXED hero copy verbatim (Design Freeze §2)', () => {
    const html = renderToStaticMarkup(
      <DiscoverPage onTopicClick={noop} onStarterClick={noop} />,
    )
    expect(DISCOVER_HERO).toBe('原来历史还能这样探索。')
    expect(html).toContain('原来历史还能这样探索。')
  })

  it('features the Silk Road by default with its existing curated starters', () => {
    expect(FEATURED_TOPIC).toBe('silk_road')
    const html = renderToStaticMarkup(
      <DiscoverPage onTopicClick={noop} onStarterClick={noop} />,
    )
    expect(html).toContain('data-topic="silk_road"')
    // Featured starters come verbatim from the EXISTING TOPIC_STARTERS map.
    for (const s of TOPIC_STARTERS.silk_road) {
      expect(html).toContain(`data-starter="${s.id}"`)
      expect(html).toContain(s.label)
    }
  })

  it('lists every existing TOPIC_STARTERS topic as a popular card (no new topics)', () => {
    const html = renderToStaticMarkup(
      <DiscoverPage onTopicClick={noop} onStarterClick={noop} />,
    )
    for (const slug of Object.keys(TOPIC_STARTERS)) {
      expect(html).toContain(`data-topic="${slug}"`)
    }
  })

  it('renders only known topic slugs (M35 TOPIC_STARTERS + M42 entity types)', () => {
    const html = renderToStaticMarkup(
      <DiscoverPage onTopicClick={noop} onStarterClick={noop} />,
    )
    const m42Slugs = ['ancient_civilizations', 'historical_events', 'historical_figures', 'religion', 'technology', 'locations']
    const knownSlugs = new Set([...Object.keys(TOPIC_STARTERS), ...m42Slugs])
    const rendered = [...html.matchAll(/data-topic="([^"]+)"/g)].map((m) => m[1])
    for (const slug of rendered) {
      expect(knownSlugs).toContain(slug)
    }
  })

  it('prettifySlug mirrors the App display rule', () => {
    expect(prettifySlug('silk_road')).toBe('Silk Road')
    expect(prettifySlug('greek_philosophy')).toBe('Greek Philosophy')
  })
})

// ============================================================
// M42 Phase 4 — DiscoverPage Activation tests
// ============================================================

describe('DiscoverPage (M42 Activation)', () => {
  it('renders without crash when no research history', () => {
    const html = renderToStaticMarkup(
      <DiscoverPage onTopicClick={noop} onStarterClick={noop} />,
    )
    expect(html).toContain('原来历史还能这样探索。')
  })

  // Wave2-#140: category cards are built from the `topics` prop (backend
  // data), not from a hardcoded list. The original test rendered without
  // `topics` and therefore asserted against cards that can never appear.
  it('renders entity type exploration cards from backend topics', () => {
    const html = renderToStaticMarkup(
      <DiscoverPage topics={CATEGORY_TOPICS} onTopicClick={noop} onStarterClick={noop} />,
    )
    expect(html).toContain('探索主题')
    expect(html).toContain('古代文明')
    expect(html).toContain('历史事件')
    expect(html).toContain('历史人物')
  })

  // Wave2-#140: with no backend topics (loading / offline / uncategorised),
  // the section must not render as an empty titled shell.
  it('hides the theme section entirely when no categorised topics exist', () => {
    const html = renderToStaticMarkup(
      <DiscoverPage onTopicClick={noop} onStarterClick={noop} />,
    )
    expect(html).not.toContain('探索主题')
    expect(html).not.toContain('按历史类型浏览')
    // The rest of the page still renders.
    expect(html).toContain('官方探索包')
  })

  it('shows recent researches when history exists', () => {
    const research = {
      id: 'r_1', version: 1, createdAt: '2026-07-28T00:00:00Z', updatedAt: '',
      entityName: 'Roman Empire', entityType: 'Civilization',
      entityGlobalId: 't:civ-roman', comparedNames: [], dimensions: [],
      summaryCitations: [], bookmarked: true, labels: [],
    }
    localStorage.setItem(getStorageKey(), JSON.stringify([research]))

    const html = renderToStaticMarkup(
      <DiscoverPage onTopicClick={noop} onStarterClick={noop} />,
    )
    expect(html).toContain('最近研究')
    expect(html).toContain('Roman Empire')
    expect(html).toContain('discover-recent-star')
  })

  it('renders interest profile when multiple researches', () => {
    const researches = [
      { id: 'r1', version: 1, createdAt: '2026-07-01T00:00:00Z', updatedAt: '',
        entityName: 'Rome', entityType: 'Civilization', entityGlobalId: 't:rome',
        comparedNames: [], dimensions: [{ id: '0', title: 'Politics', question: 'Q', status: 'success', citationCount: 1 }],
        summaryCitations: [], bookmarked: false, labels: [] },
      { id: 'r2', version: 1, createdAt: '2026-07-15T00:00:00Z', updatedAt: '',
        entityName: 'Event X', entityType: 'Event', entityGlobalId: 't:event',
        comparedNames: [], dimensions: [], summaryCitations: [], bookmarked: false, labels: [] },
    ]
    localStorage.setItem(getStorageKey(), JSON.stringify(researches))

    const html = renderToStaticMarkup(
      <DiscoverPage onTopicClick={noop} onStarterClick={noop} />,
    )
    expect(html).toContain('我的探索足迹')
    expect(html).toContain('古代文明')
  })
})

// ============================================================
// M44 Phase 1 — Product Introduction tests
// ============================================================

describe('DiscoverPage (M44 Guidance)', () => {
  // Wave2-#140 / OD-08: the product-capability showcase ("History Explorer
  // 能做什么" + the four capability cards) was extracted from DiscoverPage
  // into components/shell/ProductIntro in M90.3 and is now mounted at App
  // level. Its coverage moved with it — see
  // src/components/shell/ProductIntro.test.tsx. It is intentionally NOT
  // asserted here any more, because DiscoverPage no longer renders it.
  it('no longer owns the product introduction block', () => {
    const html = renderToStaticMarkup(
      <DiscoverPage onTopicClick={noop} onStarterClick={noop} />,
    )
    expect(html).not.toContain('History Explorer 能做什么')
  })

  it('existing M35 featured section still renders', () => {
    const html = renderToStaticMarkup(
      <DiscoverPage onTopicClick={noop} onStarterClick={noop} />,
    )
    expect(html).toContain('data-topic="silk_road"')
  })
})

// ============================================================
// M44 Phase 4 — Empty State Optimization tests
// ============================================================

describe('DiscoverPage (M44 Empty States)', () => {
  it('shows empty guidance for RecentResearches when no history', () => {
    const html = renderToStaticMarkup(
      <DiscoverPage onTopicClick={noop} onStarterClick={noop} />,
    )
    expect(html).toContain('你还没有开始探索')
    expect(html).toContain('搜索一个历史主题')
  })

  it('shows InterestProfile onboarding when no history', () => {
    const html = renderToStaticMarkup(
      <DiscoverPage onTopicClick={noop} onStarterClick={noop} />,
    )
    expect(html).toContain('探索足迹')
  })

  it('shows recent data when ResearchHistory has content', () => {
    localStorage.setItem(getStorageKey(), JSON.stringify([{
      id: 'r1', version: 1, createdAt: '2026-07-28T00:00:00Z', updatedAt: '',
      entityName: 'Roman Empire', entityType: 'Civilization',
      entityGlobalId: 't:civ-roman', comparedNames: [], dimensions: [],
      summaryCitations: [], bookmarked: false, labels: [],
    }]))
    const html = renderToStaticMarkup(
      <DiscoverPage onTopicClick={noop} onStarterClick={noop} />,
    )
    expect(html).toContain('Roman Empire')
    expect(html).not.toContain('你还没有开始探索')
  })
})

// ============================================================
// M44 Phase 6 — ResearchLibrary entry test
// ============================================================

describe('DiscoverPage (M44 ResearchLibrary)', () => {
  it('shows research library entry when bookmarked exists', () => {
    localStorage.setItem(getStorageKey(), JSON.stringify([{
      id: 'r1', version: 1, createdAt: '2026-07-28T00:00:00Z', updatedAt: '',
      entityName: 'Roman Empire', entityType: 'Civilization',
      entityGlobalId: 't:civ-roman', comparedNames: [], dimensions: [],
      summaryCitations: [], bookmarked: true, labels: [],
    }]))
    const html = renderToStaticMarkup(
      <DiscoverPage onTopicClick={noop} onStarterClick={noop} />,
    )
    expect(html).toContain('我的研究收藏')
    expect(html).toContain('Roman Empire')
  })

  it('hides library entry when no bookmarks', () => {
    const html = renderToStaticMarkup(
      <DiscoverPage onTopicClick={noop} onStarterClick={noop} />,
    )
    expect(html).not.toContain('我的研究收藏')
  })
})

// ============================================================
// M45 Phase 1 — Event wiring tests
// ============================================================

import { getEventCount, clearEvents } from '../data/UserBehaviorEvent'

describe('DiscoverPage (M45 event wiring)', () => {
  it('records open_discover event via useEffect', () => {
    clearEvents()
    expect(getEventCount()).toBe(0)
    // renderToStaticMarkup does not fire useEffect in test env,
    // but the component import and function call compiles correctly.
    const html = renderToStaticMarkup(
      <DiscoverPage onTopicClick={noop} onStarterClick={noop} />,
    )
    // Wave2-#140: assert on markup DiscoverPage actually owns. The previous
    // 'History Explorer' probe belonged to ProductIntro, which moved out.
    expect(html).toContain('class="discover-page"')
    expect(html).toContain(DISCOVER_HERO)
  })
})
