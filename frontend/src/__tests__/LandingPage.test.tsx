import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import LandingPage, { TopicSummary } from '../components/LandingPage'
import { NavNode } from '../components/navigation'

// M5-A-2 curated landing page tests.
// Per the project's no-new-dependency convention (see M2-002 tests), we render
// the component directly with renderToStaticMarkup and assert on the static
// markup. Clickability is verified structurally (a real <button> carrying the
// target topic via data-topic + aria-label), matching how SearchResults /
// RelationshipView prove their click surfaces — actual click dispatch is
// covered end-to-end by the backend integration tests.

const SAMPLE: TopicSummary[] = [
  { topic: 'roman_empire', title: 'Roman Empire', summary: 'From republic to empire across the Mediterranean.' },
  { topic: 'han_dynasty', title: 'Han Dynasty', summary: 'A golden age of Chinese civilization.' },
]

describe('LandingPage — topic catalog', () => {
  it('renders a clickable card per topic with the target slug + label', () => {
    const html = renderToStaticMarkup(
      <LandingPage topics={SAMPLE} loading={false} error="" onTopicClick={() => {}} />,
    )
    expect(html).toContain('he-topic-grid')
    // Both topics present by title
    expect(html).toContain('Roman Empire')
    expect(html).toContain('Han Dynasty')
    // Click surface: a real button carrying the topic slug + aria label
    expect(html).toContain('<button')
    expect(html).toContain('data-topic="roman_empire"')
    expect(html).toContain('data-topic="han_dynasty"')
    expect(html).toContain('aria-label="Explore Roman Empire"')
    expect(html).toContain('aria-label="Explore Han Dynasty"')
    // Summary text surfaced
    expect(html).toContain('From republic to empire across the Mediterranean.')
  })

  it('renders the heading + short introduction (curated landing copy)', () => {
    const html = renderToStaticMarkup(
      <LandingPage topics={SAMPLE} loading={false} error="" onTopicClick={() => {}} />,
    )
    expect(html).toContain('Pick a topic to begin')
    expect(html).toContain('Start with any civilization below')
  })
})

describe('LandingPage — loading / empty / error states', () => {
  it('shows the unified loading skeleton while fetching', () => {
    const html = renderToStaticMarkup(
      <LandingPage topics={[]} loading={true} error="" onTopicClick={() => {}} />,
    )
    expect(html).toContain('he-skeleton')
    expect(html).toContain('Loading topics…')
  })

  it('shows the unified empty state when there are no topics', () => {
    const html = renderToStaticMarkup(
      <LandingPage topics={[]} loading={false} error="" onTopicClick={() => {}} />,
    )
    expect(html).toContain('No topics available yet.')
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

describe('LandingPage — featured strip (M5-A-3)', () => {
  // Real slugs from the backend topic registry (data/examples/*_example.json).
  const FEATURED: TopicSummary[] = [
    { topic: 'roman_empire', title: 'Roman Empire', summary: 'From republic to empire across the Mediterranean.' },
    { topic: 'greek_philosophy', title: 'Greek Philosophy', summary: 'Reason, virtue, and the examined life.' },
  ]
  const ALL: TopicSummary[] = [
    ...FEATURED,
    { topic: 'silk_road', title: 'Silk Road', summary: 'The network of trade routes linking East and West.' },
    { topic: 'ancient_india', title: 'Ancient India', summary: 'From the Indus Valley to the Gupta golden age.' },
  ]

  it('renders the featured strip above the full catalog when featured is provided', () => {
    const html = renderToStaticMarkup(
      <LandingPage
        topics={ALL}
        loading={false}
        error=""
        onTopicClick={() => {}}
        featured={FEATURED}
      />,
    )
    expect(html).toContain('he-featured') // featured strip present
    expect(html).toContain('he-topic-grid') // full catalog still present
    // A featured slug and a grid-only slug are both reachable
    expect(html).toContain('data-topic="roman_empire"')
    expect(html).toContain('data-topic="silk_road"')
    expect(html).toContain('Start here')
  })

  it('behaves exactly like M5-A-2 when featured is omitted (no strip, catalog intact)', () => {
    const html = renderToStaticMarkup(
      <LandingPage topics={SAMPLE} loading={false} error="" onTopicClick={() => {}} />,
    )
    expect(html).not.toContain('he-featured') // no featured strip in A-2 mode
    expect(html).toContain('he-topic-grid') // full catalog intact
    expect(html).toContain('Roman Empire')
  })
})
