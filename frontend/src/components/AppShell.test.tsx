import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import AppShell from './AppShell'
import { LocaleProvider } from '../data/locale'

// M34-A1 (Exploration UX Hardening): AppShell extracted from App.tsx monolith.
// Smoke tests validate the presentational shell renders expected landmark text.
// Keep assertions stable — downstream tests (SearchEntity.smoke, etc.) depend on
// specific strings in the rendered output.  Use renderToStaticMarkup for a pure
// test style — no new test dependency.
describe('AppShell (M34-A1)', () => {
  it('renders the hero copy the smoke tests depend on', () => {
    const html = renderToStaticMarkup(
      <LocaleProvider><AppShell /></LocaleProvider>
    )
    expect(html).toContain('History Explorer')
    expect(html).toContain('探索历史')
    // The explorer container is present.
    expect(html).toContain('class="explorer"')
  })

  it('renders the search and children slots', () => {
    const html = renderToStaticMarkup(
      <LocaleProvider>
        <AppShell search={<span id="search-slot" />}>
          <span id="child-slot" />
        </AppShell>
      </LocaleProvider>
    )
    expect(html).toContain('id="search-slot"')
    expect(html).toContain('id="child-slot"')
  })
})
