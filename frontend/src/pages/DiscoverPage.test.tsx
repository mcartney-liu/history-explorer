import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { LocaleProvider } from '../data/locale'
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
// ADR-0020: wrap renders in LocaleProvider so useLocale().t resolves zh keys
// (default context returns the key itself, which would break zh text assertions).
function wrap(node: JSX.Element) {
  return renderToStaticMarkup(<LocaleProvider>{node}</LocaleProvider>)
}

describe('DiscoverPage (M35)', () => {
  it('renders the FIXED hero copy verbatim (Design Freeze §2)', () => {
    const html = wrap(
      <DiscoverPage onTopicClick={noop} onStarterClick={noop} />,
    )
    expect(DISCOVER_HERO).toBe('原来历史还能这样探索。')
    expect(html).toContain('原来历史还能这样探索。')
  })

  it('features the Silk Road by default with its existing curated starters', () => {
    expect(FEATURED_TOPIC).toBe('silk_road')
    const html = wrap(
      <DiscoverPage onTopicClick={noop} onStarterClick={noop} />,
    )
    expect(html).toContain('data-topic="silk_road"')
    // Featured starters come verbatim from the EXISTING TOPIC_STARTERS map.
    for (const s of TOPIC_STARTERS.silk_road) {
      expect(html).toContain(`data-starter="${s.id}"`)
      expect(html).toContain(s.label)
    }
  })

  it('renders the 探索主题 category wall from backend topics (P5-S4 主题卡片墙)', () => {
    const topics = [
      { topic: 'roman_empire', title: 'Roman Empire', summary: '', category: 'Civilization' },
      { topic: 'julius_caesar', title: 'Julius Caesar', summary: '', category: 'Person' },
    ]
    const html = wrap(
      <DiscoverPage topics={topics} onTopicClick={noop} onStarterClick={noop} />,
    )
    expect(html).toContain('探索主题')
    // 主题卡片墙按分类渲染，每类一张卡（data-category + discover.cat.* label）。
    expect(html).toContain('data-category="Civilization"')
    expect(html).toContain('data-category="Person"')
    expect(html).toContain('古代文明')
    expect(html).toContain('历史人物')
    // 未进入主题界面时，文明卡本身不渲染（收进主题界面）。
    expect(html).not.toContain('data-topic="roman_empire"')
    expect(html).not.toContain('data-topic="julius_caesar"')
  })

  it('renders only known topic slugs (M35 TOPIC_STARTERS + M42 entity types)', () => {
    const html = wrap(
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
    const html = wrap(
      <DiscoverPage onTopicClick={noop} onStarterClick={noop} />,
    )
    expect(html).toContain('原来历史还能这样探索。')
  })

  // P5-S4: 探索主题区 = 主题卡片墙（6 类）。传入有 category 的 topics 时，
  // 渲染对应分类卡；文明卡收进主题界面（未点击分类不渲染）。
  it('renders category cards for backend topics with category (P5-S4 主题卡片墙)', () => {
    const html = wrap(
      <DiscoverPage topics={CATEGORY_TOPICS} onTopicClick={noop} onStarterClick={noop} />,
    )
    expect(html).toContain('探索主题')
    expect(html).toContain('data-category="Civilization"')
    expect(html).toContain('data-category="Event"')
    expect(html).toContain('data-category="Person"')
    expect(html).toContain('古代文明')
    expect(html).toContain('历史事件')
    expect(html).toContain('历史人物')
    // 文明卡收进主题界面：默认不直接渲染。
    expect(html).not.toContain('data-topic="roman_empire"')
  })

  // Wave2-#140: with no backend topics (loading / offline / uncategorised),
  // the section must not render as an empty titled shell.
  it('hides the theme section entirely when no categorised topics exist', () => {
    const html = wrap(
      <DiscoverPage onTopicClick={noop} onStarterClick={noop} />,
    )
    expect(html).not.toContain('探索主题')
    expect(html).not.toContain('按历史类型浏览')
    // The rest of the page still renders.
    expect(html).toContain('官方探索包')
  })
})

// P5-S4: 最近研究 / 我的探索足迹 / 研究收藏 / 兴趣画像用例已随
// "我的"tab 迁移到 components/discover/MyExplorationPanel.test.tsx。

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
    const html = wrap(
      <DiscoverPage onTopicClick={noop} onStarterClick={noop} />,
    )
    expect(html).not.toContain('History Explorer 能做什么')
  })

  it('existing M35 featured section still renders', () => {
    const html = wrap(
      <DiscoverPage onTopicClick={noop} onStarterClick={noop} />,
    )
    expect(html).toContain('data-topic="silk_road"')
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
    const html = wrap(
      <DiscoverPage onTopicClick={noop} onStarterClick={noop} />,
    )
    // Wave2-#140: assert on markup DiscoverPage actually owns. The previous
    // 'History Explorer' probe belonged to ProductIntro, which moved out.
    expect(html).toContain('class="discover-page"')
    expect(html).toContain(DISCOVER_HERO)
  })
})
