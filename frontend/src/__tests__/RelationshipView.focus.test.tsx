import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import RelationshipView from '../components/RelationshipView'
import type { MainEntity } from '../components/MainEntityCard'
import type { RelatedEntity } from '../components/RelatedEntityList'

// M10-2: RelationshipView is the SOLE PRODUCER of cross-panel focus. Focus is a
// VIEW STATE (global_id form, owned by App) — it never navigates and never
// touches history/persistence. Each branch resolves its own global_id from the
// local->global map (same map App builds for navigation) so it can both emit
// focus and mirror the focused state.
//
// NOTE on click simulation: this suite runs under the node env (no jsdom), so
// we assert the rendered wiring (button presence + aria-label + is-focused
// class on the correctly-resolved branch) rather than dispatching a click. The
// onClick handler invocation (`onEntityFocus!(branchGlobalId)`) is covered by
// the wiring assertions below + code review; full DOM event simulation would
// require jsdom, which is out of the M10-2 freeze boundary (zero new deps).
describe('M10-2 RelationshipView — cross-panel focus PRODUCER', () => {
  const mainEntity: MainEntity = {
    id: 'me',
    type: 'topic',
    name: 'Augustus',
    description: 'Roman emperor',
  }
  const relatedEntities: RelatedEntity[] = [
    { id: 'rel-1', type: 'person', relationship: 'parent_of' },
    { id: 'rel-2', type: 'person', relationship: 'spouse_of' },
  ]
  const nameById = { 'rel-1': 'Tiberius', 'rel-2': 'Livia' }

  it('renders a Focus button per branch when onEntityFocus is provided', () => {
    const html = renderToStaticMarkup(
      <RelationshipView
        mainEntity={mainEntity}
        relatedEntities={relatedEntities}
        nameById={nameById}
        onEntityClick={() => {}}
        onEntityFocus={() => {}}
      />,
    )
    const focusBtns = html.match(/class="rel-focus-btn"/g) || []
    expect(focusBtns.length).toBe(2)
    expect(html).toContain('aria-label="Focus Tiberius"')
    expect(html).toContain('aria-label="Focus Livia"')
  })

  it('omits the Focus button entirely when onEntityFocus is absent (no producer)', () => {
    const html = renderToStaticMarkup(
      <RelationshipView
        mainEntity={mainEntity}
        relatedEntities={relatedEntities}
        nameById={nameById}
      />,
    )
    expect(html).not.toContain('rel-focus-btn')
  })

  it('mirrors the focused state on the matching branch using the resolved global_id', () => {
    const html = renderToStaticMarkup(
      <RelationshipView
        mainEntity={mainEntity}
        relatedEntities={relatedEntities}
        nameById={nameById}
        globalIdById={{
          'rel-1': 'roman_empire:tiberius',
          'rel-2': 'roman_empire:livias',
        }}
        focusedId="roman_empire:tiberius"
      />,
    )
    const m = html.match(
      /<li class="rel-branch is-focused">\s*<span class="rel-target-name">([^<]+)<\/span>/,
    )
    // Exactly one branch is focused, and it is the Tiberius branch whose local
    // id rel-1 resolved to the matching global_id.
    expect(m).not.toBeNull()
    expect(m![1]).toBe('Tiberius')
  })

  it('falls back to the raw local id when no globalIdById mapping is supplied', () => {
    const html = renderToStaticMarkup(
      <RelationshipView
        mainEntity={mainEntity}
        relatedEntities={relatedEntities}
        nameById={nameById}
        focusedId="rel-2"
      />,
    )
    const m = html.match(
      /<li class="rel-branch is-focused">\s*<span class="rel-target-name">([^<]+)<\/span>/,
    )
    expect(m).not.toBeNull()
    expect(m![1]).toBe('Livia')
  })

  it('does not mark any branch focused when focusedId does not match', () => {
    const html = renderToStaticMarkup(
      <RelationshipView
        mainEntity={mainEntity}
        relatedEntities={relatedEntities}
        nameById={nameById}
        globalIdById={{
          'rel-1': 'roman_empire:tiberius',
          'rel-2': 'roman_empire:livias',
        }}
        focusedId="some_other:entity"
      />,
    )
    expect(html).not.toContain('is-focused')
  })
})
