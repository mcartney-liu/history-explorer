import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import App from '../App'
import { LocaleProvider } from '../data/locale'

describe('App smoke test', () => {
  it('renders the hero, search box and explore button', () => {
    const html = renderToStaticMarkup(
      <LocaleProvider><App /></LocaleProvider>
    )
    expect(html).toContain('History Explorer')
    expect(html).toContain('Load')
  })
})
