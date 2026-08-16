import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactElement } from 'react'
import { LocaleProvider } from '../data/locale'
import EntityExplorationGuide from '../components/EntityExplorationGuide'
import { resolveEntityStarters, DEFAULT_ENTITY_STARTERS } from '../data/explorationStarters'

const render = (el: ReactElement) =>
  renderToStaticMarkup(<LocaleProvider>{el}</LocaleProvider>)

// M5-A-5 Entity Exploration Guide tests (A4 重构: 一行轻量认知提示).
// No new test dependency: render with renderToStaticMarkup and assert on the
// static markup, matching the project's M2-002 / M5-A-3 / M5-A-4 convention.
// Clickability is verified structurally (a real <button> carrying the target
// global_id via data-starter + aria-label) — actual click dispatch is covered
// end-to-end by the backend integration tests.

describe('EntityExplorationGuide — one-line lightweight cognitive hint (A4)', () => {
  const starters = resolveEntityStarters('roman_empire:civ-roman')

  it('renders a one-line hint with one inline chip per starter (no big card)', () => {
    const html = render(
      <EntityExplorationGuide
        entityId="roman_empire:civ-roman"
        starters={starters}
        onStarterClick={() => {}}
      />,
    )
    expect(html).toContain('he-guide') // root present
    expect(html).toContain('he-guide--lite') // A4 one-line variant
    expect(html).toContain('接下来可以了解') // A4 hint copy (discover.nextCanExplore)
    expect(html).toContain('he-guide-lite-chip') // inline chip, not .he-guide-card
    expect(html).not.toContain('he-guide-intro') // A4: no more big intro block
    expect(html).not.toContain('he-guide-heading') // A4: no more heading
    // Three REAL entity starters as clickable chips
    expect(html).toContain('data-starter="roman_empire:event-roman-empire-established"')
    expect(html).toContain('data-starter="roman_empire:loc-rome"')
    expect(html).toContain('data-starter="hellenistic_world:civ-greek"')
    expect(html).toContain('aria-label="探索 罗马帝国建立"')
    expect(html).toContain('aria-label="探索 罗马"')
    expect(html).toContain('aria-label="探索 古希腊文明"')
    expect(html).toContain('罗马帝国建立')
    expect(html).toContain('罗马')
  })

  it('renders the dismiss control inside the one-line hint', () => {
    const html = render(
      <EntityExplorationGuide
        entityId="roman_empire:civ-roman"
        starters={starters}
        onStarterClick={() => {}}
      />,
    )
    expect(html).toContain('he-guide-dismiss')
    expect(html).toContain('aria-label="关闭引导"')
  })

  it('renders NOTHING when starters is empty (silent per P4 / ADR-0025)', () => {
    const html = render(
      <EntityExplorationGuide
        entityId="some:unknown-entity"
        starters={[]}
        onStarterClick={() => {}}
      />,
    )
    expect(html).toBe('') // A4: 无 starters 整卡不渲染
  })

  it('resolveEntityStarters returns the curated list for a mapped entity and the empty default for an unmapped one', () => {
    expect(resolveEntityStarters('roman_empire:civ-roman')).toHaveLength(3)
    expect(resolveEntityStarters('definitely_not_an_entity')).toBe(DEFAULT_ENTITY_STARTERS)
  })
})
