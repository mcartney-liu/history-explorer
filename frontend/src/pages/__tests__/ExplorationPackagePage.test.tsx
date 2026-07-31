import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { LocaleProvider } from '../../data/locale'
import ExplorationPackagePage from '../ExplorationPackagePage'

const noop = () => {}

describe('ExplorationPackagePage', () => {
  it('renders the China package first screen (title, summary, goals)', () => {
    const html = renderToStaticMarkup(
      <LocaleProvider>
        <ExplorationPackagePage
          slug="china-civilization-v1"
          onEntityClick={noop}
          onOpenPackage={noop}
          onBack={noop}
        />
      </LocaleProvider>,
    )
    expect(html).toContain('中国文明演化探索包 V1')
    expect(html).toContain('官方探索包')
    expect(html).toContain('探索目标')
    expect(html).toContain('科举')
  })

  it('renders the Exploration Guide (deterministic navigation)', () => {
    const html = renderToStaticMarkup(
      <LocaleProvider>
        <ExplorationPackagePage
          slug="china-civilization-v1"
          onEntityClick={noop}
          onOpenPackage={noop}
          onBack={noop}
        />
      </LocaleProvider>,
    )
    expect(html).toContain('探索向导')
    expect(html).toContain('你现在在')
    expect(html).toContain('下一步可以探索')
    expect(html).toContain('已探索')
  })

  it('renders a different official package (silk road) with its own journey', () => {
    const html = renderToStaticMarkup(
      <LocaleProvider>
        <ExplorationPackagePage
          slug="silk-road-exploration"
          onEntityClick={noop}
          onOpenPackage={noop}
          onBack={noop}
        />
      </LocaleProvider>,
    )
    expect(html).toContain('丝绸之路探索包 V1')
    expect(html).toContain('探索向导')
  })

  it('renders the Timeline Chain (five dynasties)', () => {
    const html = renderToStaticMarkup(
      <LocaleProvider>
        <ExplorationPackagePage
          slug="china-civilization-v1"
          onEntityClick={noop}
          onOpenPackage={noop}
          onBack={noop}
        />
      </LocaleProvider>,
    )
    expect(html).toContain('唐')
    expect(html).toContain('宋')
    expect(html).toContain('元')
    expect(html).toContain('明')
    expect(html).toContain('清')
    expect(html).toContain('早于')
  })

  it('renders the Relationship Chain (科举→文官→内阁)', () => {
    const html = renderToStaticMarkup(
      <LocaleProvider>
        <ExplorationPackagePage
          slug="china-civilization-v1"
          onEntityClick={noop}
          onOpenPackage={noop}
          onBack={noop}
        />
      </LocaleProvider>,
    )
    expect(html).toContain('科举制度')
    expect(html).toContain('文官体系')
    expect(html).toContain('内阁制度')
    expect(html).toContain('继承为')
  })

  it('renders the Source Chain with evidence and sources', () => {
    const html = renderToStaticMarkup(
      <LocaleProvider>
        <ExplorationPackagePage
          slug="china-civilization-v1"
          onEntityClick={noop}
          onOpenPackage={noop}
          onBack={noop}
        />
      </LocaleProvider>,
    )
    // Evidence claims: looking for claim text from ec-cn-001
    expect(html).toContain('科举制度')
    // Sources
    expect(html).toContain('中国历史（义务教育教科书）')
    // Section heading
    expect(html).toContain('来源与证据')
  })

  it('renders Recommended Next section', () => {
    const html = renderToStaticMarkup(
      <LocaleProvider>
        <ExplorationPackagePage
          slug="china-civilization-v1"
          onEntityClick={noop}
          onOpenPackage={noop}
          onBack={noop}
        />
      </LocaleProvider>,
    )
    expect(html).toContain('推荐下一步探索')
    expect(html).toContain('宋代理学')
    expect(html).toContain('明代航海技术')
  })

  it('renders the back button', () => {
    const html = renderToStaticMarkup(
      <LocaleProvider>
        <ExplorationPackagePage
          slug="china-civilization-v1"
          onEntityClick={noop}
          onOpenPackage={noop}
          onBack={noop}
        />
      </LocaleProvider>,
    )
    expect(html).toContain('返回探索')
  })

  it('shows an error for a missing package slug', () => {
    const html = renderToStaticMarkup(
      <LocaleProvider>
        <ExplorationPackagePage
          slug="does-not-exist"
          onEntityClick={noop}
          onOpenPackage={noop}
          onBack={noop}
        />
      </LocaleProvider>,
    )
    expect(html).toContain('未找到探索包')
    expect(html).toContain('does-not-exist')
  })
})
