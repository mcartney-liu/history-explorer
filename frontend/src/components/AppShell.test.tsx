import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import AppShell from './AppShell'

// M34-A1: AppShell is the presentational chrome + navigation shell. These tests
// render with renderToStaticMarkup (no DOM), matching the repo's environment:'node'
// test style — no new test dependency.
describe('AppShell (M34-A1)', () => {
  it('renders the hero copy the smoke tests depend on', () => {
    const html = renderToStaticMarkup(<AppShell />)
    expect(html).toContain('History Explorer')
    expect(html).toContain('Explore History. Discover Civilization.')
    expect(html).toContain('A data-driven global history exploration platform.')
    // The explorer container is present.
    expect(html).toContain('class="explorer"')
  })

  it('renders the search and children slots', () => {
    const html = renderToStaticMarkup(
      <AppShell search={<div>SEARCH_SLOT</div>}>
        <div>CONTENT_SLOT</div>
      </AppShell>,
    )
    expect(html).toContain('SEARCH_SLOT')
    expect(html).toContain('CONTENT_SLOT')
  })

  it('wraps the nav cluster in a semantic navigation shell when provided', () => {
    const html = renderToStaticMarkup(
      <AppShell nav={<div>NAV_SLOT</div>}>
        <div>body</div>
      </AppShell>,
    )
    expect(html).toContain('<nav')
    expect(html).toContain('class="nav-shell"')
    expect(html).toContain('aria-label="Exploration navigation"')
    expect(html).toContain('NAV_SLOT')
  })

  it('renders workspace when provided', () => {
    const html = renderToStaticMarkup(
      <AppShell workspace={<div>WORKSPACE_SLOT</div>}>
        <div>body</div>
      </AppShell>,
    )
    expect(html).toContain('WORKSPACE_SLOT')
  })
})
