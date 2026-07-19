import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import FirstExplorationGuide from '../components/FirstExplorationGuide'
import { resolveStarters, DEFAULT_STARTERS } from '../data/explorationStarters'

// M5-A-4 First Exploration Guide tests.
// No new test dependency: render with renderToStaticMarkup and assert on the
// static markup, matching the project's M2-002 / M5-A-3 convention (FeaturedTopics
// and LandingPage prove click surfaces the same way). Clickability is verified
// structurally (a real <button> carrying the target global_id via data-starter +
// aria-label) — actual click dispatch is covered end-to-end by the backend
// integration tests.

describe('FirstExplorationGuide — presentational first-explore nudge', () => {
  const starters = resolveStarters('roman_empire')

  it('renders the guide heading + intro for the given topic', () => {
    const html = renderToStaticMarkup(
      <FirstExplorationGuide topic="roman_empire" title="Roman Empire" starters={starters} onStarterClick={() => {}} />,
    )
    expect(html).toContain('he-guide')
    expect(html).toContain('Explore Roman Empire')
    expect(html).toContain('he-guide-intro')
  })

  it('renders one button per starter carrying the real global_id + label', () => {
    const html = renderToStaticMarkup(
      <FirstExplorationGuide topic="roman_empire" title="Roman Empire" starters={starters} onStarterClick={() => {}} />,
    )
    // Three REAL starters for roman_empire (global_ids from data/examples)
    expect(html).toContain('data-starter="roman_empire:person-augustus"')
    expect(html).toContain('data-starter="roman_empire:civ-roman"')
    expect(html).toContain('data-starter="roman_empire:religion-christianity"')
    expect(html).toContain('aria-label="Explore Augustus"')
    expect(html).toContain('aria-label="Explore Roman Civilization"')
    expect(html).toContain('aria-label="Explore Christianity"')
    expect(html).toContain('Augustus')
    expect(html).toContain('Roman Civilization')
  })

  it('renders the dismiss control', () => {
    const html = renderToStaticMarkup(
      <FirstExplorationGuide topic="roman_empire" title="Roman Empire" starters={starters} onStarterClick={() => {}} />,
    )
    expect(html).toContain('he-guide-dismiss')
    expect(html).toContain('aria-label="Dismiss this guide"')
  })

  it('renders the guide copy but no starter buttons when starters is empty', () => {
    const html = renderToStaticMarkup(
      <FirstExplorationGuide topic="unknown_topic" title="Unknown" starters={[]} onStarterClick={() => {}} />,
    )
    expect(html).toContain('he-guide')
    expect(html).not.toContain('data-starter=')
  })

  it('resolveStarters returns the curated list for a mapped topic and the empty default for an unmapped one', () => {
    expect(resolveStarters('greek_philosophy')).toHaveLength(3)
    expect(resolveStarters('definitely_not_a_topic')).toBe(DEFAULT_STARTERS)
  })
})
