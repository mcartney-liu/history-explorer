import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import LandingPage, { TopicSummary, LANDING_HERO } from '../components/LandingPage'
import { NavNode } from '../components/navigation'

const SAMPLE: TopicSummary[] = [
  { topic: 'roman_empire', title: 'Roman Empire', summary: 'From republic to empire across the Mediterranean.' },
  { topic: 'han_dynasty', title: 'Han Dynasty', summary: 'A golden age of Chinese civilization.' },
]

describe('LandingPage — topic catalog', () => {
  it('renders a clickable card per topic with the target slug + label', () => {
    const html = renderToStaticMarkup(
      <LandingPage topics={SAMPLE} loading={false} error="" onTopicClick={() => {}} />,
    )
    expect(html).toContain('he-grid')
    expect(html).toContain('Roman Empire')
    expect(html).toContain('Han Dynasty')
    expect(html).toContain('<button')
    expect(html).toContain('data-topic="roman_empire"')
    expect(html).toContain('data-topic="han_dynasty"')
    expect(html).toContain('aria-label="探索 Roman Empire"')
    expect(html).toContain('aria-label="探索 Han Dynasty"')
    expect(html).toContain('From republic to empire across the Mediterranean.')
  })

  it('renders the M60 product hero + intro', () => {
    const html = renderToStaticMarkup(
      <LandingPage topics={SAMPLE} loading={false} error="" onTopicClick={() => {}} />,
    )
    expect(html).toContain(LANDING_HERO)
    expect(html).toContain('探索人物')
  })
})

describe('LandingPage — loading / empty / error states', () => {
  it('shows the unified loading skeleton while fetching', () => {
    const html = renderToStaticMarkup(
      <LandingPage topics={[]} loading={true} error="" onTopicClick={() => {}} />,
    )
    expect(html).toContain('he-skeleton')
    expect(html).toContain('加载中…')
  })

  it('shows the unified empty state when there are no topics', () => {
    const html = renderToStaticMarkup(
      <LandingPage topics={[]} loading={false} error="" onTopicClick={() => {}} />,
    )
    expect(html).toContain('暂无探索主题')
  })

  it('shows the unified error card on a fetch failure', () => {
    const html = renderToStaticMarkup(
      <LandingPage topics={[]} loading={false} error="network" onTopicClick={() => {}} />,
    )
    expect(html).toContain('Connection problem')
  })
})

describe('LandingPage — returning-user recent explorations', () => {
  const recent: NavNode[] = [
    { type: 'topic', topic: 'roman_empire', title: 'Roman Empire' },
  ]

  it('renders the recent chip list when history exists', () => {
    const html = renderToStaticMarkup(
      <LandingPage
        topics={SAMPLE}
        loading={false}
        error=""
        onTopicClick={() => {}}
        recent={recent}
        onRecentSelect={() => {}}
      />,
    )
    expect(html).toContain('Recent Explorations')
    expect(html).toContain('he-recent-chip')
  })

  it('hides recent explorations on a first visit (empty history)', () => {
    const html = renderToStaticMarkup(
      <LandingPage topics={SAMPLE} loading={false} error="" onTopicClick={() => {}} />,
    )
    expect(html).not.toContain('Recent Explorations')
  })
})

describe('LandingPage — quick starts (M60-003)', () => {
  it('renders quick start suggestion buttons when callback is provided', () => {
    let called = ''
    const html = renderToStaticMarkup(
      <LandingPage topics={SAMPLE} loading={false} error="" onTopicClick={() => {}} onQuickStart={(q) => { called = q }} />,
    )
    expect(html).toContain('试试')
    expect(html).toContain('凯撒为什么重要？')
    expect(html).toContain('罗马为什么灭亡？')
  })
})
