import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import EntityExplorationGuide from '../components/EntityExplorationGuide'
import { resolveEntityStarters, DEFAULT_ENTITY_STARTERS } from '../data/explorationStarters'

// M5-A-5 Entity Exploration Guide tests.
// No new test dependency: render with renderToStaticMarkup and assert on the
// static markup, matching the project's M2-002 / M5-A-3 / M5-A-4 convention
// (FeaturedTopics, LandingPage, FirstExplorationGuide prove click surfaces the
// same way). Clickability is verified structurally (a real <button> carrying
// the target global_id via data-starter + aria-label) — actual click dispatch
// is covered end-to-end by the backend integration tests.

describe('EntityExplorationGuide — presentational entity first-explore nudge', () => {
  const starters = resolveEntityStarters('roman_empire:civ-roman')

  it('renders the guide heading + intro for the given entity', () => {
    const html = renderToStaticMarkup(
      <EntityExplorationGuide
        entityId="roman_empire:civ-roman"
        entityName="Roman Civilization"
        starters={starters}
        onStarterClick={() => {}}
      />,
    )
    expect(html).toContain('he-guide')
    expect(html).toContain('Explore Roman Civilization')
    expect(html).toContain('he-guide-intro')
  })

  it('renders one button per starter carrying the real global_id + label', () => {
    const html = renderToStaticMarkup(
      <EntityExplorationGuide
        entityId="roman_empire:civ-roman"
        entityName="Roman Civilization"
        starters={starters}
        onStarterClick={() => {}}
      />,
    )
    // Three REAL entity starters (global_ids from data/examples)
    expect(html).toContain('data-starter="roman_empire:event-roman-empire-established"')
    expect(html).toContain('data-starter="roman_empire:loc-rome"')
    expect(html).toContain('data-starter="hellenistic_world:civ-greek"')
    expect(html).toContain('aria-label="Explore Roman Empire Established"')
    expect(html).toContain('aria-label="Explore Rome"')
    expect(html).toContain('aria-label="Explore Ancient Greek Civilization"')
    expect(html).toContain('Roman Empire Established')
    expect(html).toContain('Rome')
  })

  it('renders the dismiss control', () => {
    const html = renderToStaticMarkup(
      <EntityExplorationGuide
        entityId="roman_empire:civ-roman"
        entityName="Roman Civilization"
        starters={starters}
        onStarterClick={() => {}}
      />,
    )
    expect(html).toContain('he-guide-dismiss')
    expect(html).toContain('aria-label="Dismiss this guide"')
  })

  it('renders the guide copy but no starter buttons when starters is empty', () => {
    const html = renderToStaticMarkup(
      <EntityExplorationGuide
        entityId="some:unknown-entity"
        entityName="Unknown Entity"
        starters={[]}
        onStarterClick={() => {}}
      />,
    )
    expect(html).toContain('he-guide')
    expect(html).not.toContain('data-starter=')
  })

  it('resolveEntityStarters returns the curated list for a mapped entity and the empty default for an unmapped one', () => {
    expect(resolveEntityStarters('roman_empire:civ-roman')).toHaveLength(3)
    expect(resolveEntityStarters('definitely_not_an_entity')).toBe(DEFAULT_ENTITY_STARTERS)
  })
})
