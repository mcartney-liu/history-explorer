// ============================================================
// MyExplorationPanel — "我的" tab（P5-S4 信息架构拆分）
//
// 用例从 DiscoverPage.test 迁移：M42 兴趣画像 / M44 空态 /
// M44 ResearchLibrary / 最近研究。DiscoverPage 不再渲染这些
// "我的"内容，测试跟随组件迁移到独立文件。
// ============================================================

import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { LocaleProvider } from '../../data/locale'
import { MyExplorationPanel } from './MyExplorationPanel'
import { getStorageKey } from '../../data/ResearchHistory'

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

const noop = () => {}
function wrap(node: JSX.Element) {
  return renderToStaticMarkup(<LocaleProvider>{node}</LocaleProvider>)
}

const render = () =>
  wrap(<MyExplorationPanel onTopicClick={noop} onStarterClick={noop} onOpenResearch={noop} />)

describe('MyExplorationPanel — 我的探索足迹 (M90.5 Dashboard)', () => {
  it('renders the dashboard shell even with no history', () => {
    const html = render()
    expect(html).toContain('我的探索足迹')
  })

  it('shows recent researches when history exists', () => {
    const research = {
      id: 'r_1', version: 1, createdAt: '2026-07-28T00:00:00Z', updatedAt: '',
      entityName: 'Roman Empire', entityType: 'Civilization',
      entityGlobalId: 't:civ-roman', comparedNames: [], dimensions: [],
      summaryCitations: [], bookmarked: true, labels: [],
    }
    localStorage.setItem(getStorageKey(), JSON.stringify([research]))

    const html = render()
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

    const html = render()
    expect(html).toContain('我的探索足迹')
    expect(html).toContain('古代文明')
  })
})

describe('MyExplorationPanel — M44 Empty States', () => {
  it('shows empty guidance for RecentResearches when no history', () => {
    const html = render()
    expect(html).toContain('你还没有开始探索')
    expect(html).toContain('搜索一个历史主题')
  })

  it('shows InterestProfile onboarding when no history', () => {
    const html = render()
    expect(html).toContain('探索足迹')
  })

  it('shows recent data when ResearchHistory has content', () => {
    localStorage.setItem(getStorageKey(), JSON.stringify([{
      id: 'r1', version: 1, createdAt: '2026-07-28T00:00:00Z', updatedAt: '',
      entityName: 'Roman Empire', entityType: 'Civilization',
      entityGlobalId: 't:civ-roman', comparedNames: [], dimensions: [],
      summaryCitations: [], bookmarked: false, labels: [],
    }]))
    const html = render()
    expect(html).toContain('Roman Empire')
    expect(html).not.toContain('你还没有开始探索')
  })
})

describe('MyExplorationPanel — M44 ResearchLibrary', () => {
  it('shows research library entry when bookmarked exists', () => {
    localStorage.setItem(getStorageKey(), JSON.stringify([{
      id: 'r1', version: 1, createdAt: '2026-07-28T00:00:00Z', updatedAt: '',
      entityName: 'Roman Empire', entityType: 'Civilization',
      entityGlobalId: 't:civ-roman', comparedNames: [], dimensions: [],
      summaryCitations: [], bookmarked: true, labels: [],
    }]))
    const html = render()
    expect(html).toContain('我的研究收藏')
    expect(html).toContain('Roman Empire')
  })

  it('hides library entry when no bookmarks', () => {
    const html = render()
    expect(html).not.toContain('我的研究收藏')
  })
})
