import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactElement } from 'react'
import { LocaleProvider } from '../data/locale'
import FirstExplorationGuide from '../components/FirstExplorationGuide'
import { resolveStarters, DEFAULT_STARTERS } from '../data/explorationStarters'

const render = (el: ReactElement) =>
  renderToStaticMarkup(<LocaleProvider>{el}</LocaleProvider>)

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
    const html = render(
      <FirstExplorationGuide topic="roman_empire" title="Roman Empire" starters={starters} onStarterClick={() => {}} />,
    )
    expect(html).toContain('he-guide')
    expect(html).toContain('探索 Roman Empire')
    expect(html).toContain('he-guide-intro')
  })

  it('renders one button per starter carrying the real global_id + label', () => {
    const html = render(
      <FirstExplorationGuide topic="roman_empire" title="Roman Empire" starters={starters} onStarterClick={() => {}} />,
    )
    // Three REAL starters for roman_empire (global_ids from data/examples)
    expect(html).toContain('data-starter="roman_empire:person-augustus"')
    expect(html).toContain('data-starter="roman_empire:civ-roman"')
    expect(html).toContain('data-starter="roman_empire:religion-christianity"')
    expect(html).toContain('aria-label="探索 奥古斯都"')
    expect(html).toContain('aria-label="探索 罗马文明"')
    expect(html).toContain('aria-label="探索 基督教"')
    expect(html).toContain('奥古斯都')
    expect(html).toContain('罗马文明')
  })

  it('renders the dismiss control', () => {
    const html = render(
      <FirstExplorationGuide topic="roman_empire" title="Roman Empire" starters={starters} onStarterClick={() => {}} />,
    )
    expect(html).toContain('he-guide-dismiss')
    expect(html).toContain('aria-label="关闭引导"')
  })

  it('renders the guide copy but no starter buttons when starters is empty', () => {
    const html = render(
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
