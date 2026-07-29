import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactElement } from 'react'
import { LocaleProvider } from '../data/locale'
import FeaturedTopics from '../components/FeaturedTopics'
import type { TopicSummary } from '../components/LandingPage'

const render = (el: ReactElement) =>
  renderToStaticMarkup(<LocaleProvider>{el}</LocaleProvider>)

// M5-A-3 featured "start here" strip tests.
// No new test dependency: render with renderToStaticMarkup and assert on the
// static markup, matching the project's M2-002 convention (SearchResults /
// RelationshipView / LandingPage prove click surfaces the same way).

const SAMPLE: TopicSummary[] = [
  { topic: 'roman_empire', title: 'Roman Empire', summary: 'From republic to empire across the Mediterranean.' },
  { topic: 'greek_philosophy', title: 'Greek Philosophy', summary: 'Reason, virtue, and the examined life.' },
  { topic: 'persian_empire', title: 'Persian Empire', summary: 'The first great transcontinental empire.' },
]

describe('FeaturedTopics — start here strip', () => {
  it('renders the "Start here" heading and one button per topic', () => {
    const html = render(
      <FeaturedTopics topics={SAMPLE} onTopicClick={() => {}} />,
    )
    expect(html).toContain('he-featured')
    expect(html).toContain('从这里开始')
    expect(html).toContain('he-featured-grid')
    // Three topics → three clickable buttons (same card structure as the
    // normal catalog grid)
    expect(html).toContain('data-topic="roman_empire"')
    expect(html).toContain('data-topic="greek_philosophy"')
    expect(html).toContain('data-topic="persian_empire"')
    expect(html).toContain('aria-label="探索 Roman Empire"')
    expect(html).toContain('aria-label="探索 Greek Philosophy"')
    expect(html).toContain('aria-label="探索 Persian Empire"')
    // Titles + summaries surfaced
    expect(html).toContain('Roman Empire')
    expect(html).toContain('From republic to empire across the Mediterranean.')
  })

  it('renders the strip container but no topic buttons when the list is empty', () => {
    const html = render(
      <FeaturedTopics topics={[]} onTopicClick={() => {}} />,
    )
    expect(html).toContain('he-featured')
    expect(html).not.toContain('data-topic=')
  })
})
