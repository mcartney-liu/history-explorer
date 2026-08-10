import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import LandingPage, { TopicSummary } from '../components/LandingPage'
import { LocaleProvider } from '../data/locale'
import { lookup } from '../locales'
import { NavNode } from '../components/navigation'

const SAMPLE: TopicSummary[] = [
  { topic: 'roman_empire', title: 'Roman Empire', summary: 'From republic to empire across the Mediterranean.' },
  { topic: 'han_dynasty', title: 'Han Dynasty', summary: 'A golden age of Chinese civilization.' },
]

// 所有渲染必须包 LocaleProvider，否则 useLocale 走默认 context 的 t=(k)=>k
// fallback，t('landing.hero') 会返回 key 原文而非文案。
const render = (el: React.ReactElement) =>
  renderToStaticMarkup(<LocaleProvider>{el}</LocaleProvider>)

describe('LandingPage — topic catalog', () => {
  it('renders featured topics (P5-S4 对调后研究 tab 保留的精选主题)', () => {
    const html = render(
      <LandingPage
        topics={SAMPLE}
        loading={false}
        error=""
        onTopicClick={() => {}}
        featured={SAMPLE}
      />,
    )
    expect(html).toContain('he-featured')
    expect(html).toContain('data-topic="roman_empire"')
    expect(html).toContain('data-topic="han_dynasty"')
    expect(html).toContain('Roman Empire')
    expect(html).toContain('Han Dynasty')
  })

  it('renders the M60 product hero + intro (zh)', () => {
    const html = render(
      <LandingPage topics={SAMPLE} loading={false} error="" onTopicClick={() => {}} />,
    )
    expect(html).toContain('探索历史文明，形成你自己的理解')
    expect(html).toContain('从人物、国家、战争')
  })

  it('renders the 为什么 question seeds when onCausalObjectClick is provided (P5-S4 对调)', () => {
    const html = render(
      <LandingPage
        topics={SAMPLE}
        loading={false}
        error=""
        onTopicClick={() => {}}
        onCausalObjectClick={() => {}}
      />,
    )
    expect(html).toContain('开始一次文明理解')
    expect(html).toContain('一个庞大的国家，如何解决治理千万人的问题？')
    expect(html).toContain('为什么有些文明选择法律治理，而另一些选择官僚治理？')
    expect(html).toContain('人类如何保存和传播知识，让文明延续千年？')
  })
})

describe('LandingPage — loading / empty / error states', () => {
  it('shows the unified loading skeleton while fetching', () => {
    const html = render(
      <LandingPage topics={[]} loading={true} error="" onTopicClick={() => {}} />,
    )
    expect(html).toContain('he-skeleton')
    expect(html).toContain('加载中…')
  })

  it('shows the unified empty state when there are no topics', () => {
    const html = render(
      <LandingPage topics={[]} loading={false} error="" onTopicClick={() => {}} />,
    )
    expect(html).toContain('暂无探索主题')
  })

  it('shows the unified error card on a fetch failure', () => {
    const html = render(
      <LandingPage topics={[]} loading={false} error="network" onTopicClick={() => {}} />,
    )
    expect(html).toContain('连接问题')
  })
})

describe('LandingPage — returning-user recent explorations', () => {
  const recent: NavNode[] = [
    { type: 'topic', topic: 'roman_empire', title: 'Roman Empire' },
  ]

  it('renders the recent chip list when history exists', () => {
    const html = render(
      <LandingPage
        topics={SAMPLE}
        loading={false}
        error=""
        onTopicClick={() => {}}
        recent={recent}
        onRecentSelect={() => {}}
      />,
    )
    expect(html).toContain('最近浏览')
    expect(html).toContain('he-recent-chip')
  })

  it('hides recent explorations on a first visit (empty history)', () => {
    const html = render(
      <LandingPage topics={SAMPLE} loading={false} error="" onTopicClick={() => {}} />,
    )
    expect(html).not.toContain('最近浏览')
  })
})

describe('LandingPage — quick starts (M60-003)', () => {
  it('renders quick start suggestion buttons when callback is provided', () => {
    let called = ''
    const html = render(
      <LandingPage topics={SAMPLE} loading={false} error="" onTopicClick={() => {}} onQuickStart={(q) => { called = q }} />,
    )
    expect(html).toContain('试试')
    expect(html).toContain('凯撒为什么重要？')
    expect(html).toContain('罗马为什么灭亡？')
  })
})

describe('LandingPage — i18n (ADR-0020): English copy parity', () => {
  it('exposes English landing copy via locale lookup', () => {
    expect(lookup('en', 'landing.hero')).toBe(
      'Explore historical civilizations and form your own understanding',
    )
    expect(lookup('en', 'landing.sub')).toContain(
      'connections between people, states, wars, and civilizations',
    )
    expect(lookup('en', 'landing.quickStart.1')).toBe('Why does Caesar matter?')
    expect(lookup('en', 'landing.quickStart.4')).toBe('What did the Silk Road change?')
    expect(lookup('en', 'landing.emptyTopics')).toBe('No exploration topics yet.')
  })

  it('exposes Japanese landing copy (fallback-safe)', () => {
    expect(lookup('ja', 'landing.hero')).toBe(
      'Explore historical civilizations and form your own understanding',
    )
  })
})
