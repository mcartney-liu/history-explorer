import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import App from '../App'

// Smoke test: the app boots and renders its entry surface without crashing.
// No backend required — this only exercises the initial (pre-fetch) render.
describe('App smoke test', () => {
  it('renders the hero, search box and explore button', () => {
    const html = renderToStaticMarkup(<App />)

    // Hero title
    expect(html).toContain('History Explorer')

    // Tagline (proves the hero section mounted)
    expect(html).toContain('Explore History. Discover Civilization.')

    // Search entry: the SearchBox input placeholder is present
    expect(html).toContain('Enter a historical topic')

    // Exploration trigger: the Explore button is rendered
    expect(html).toContain('Explore')
  })
})
