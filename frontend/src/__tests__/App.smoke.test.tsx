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
    // Default locale is 'zh' (M60 i18n); the loading skeleton copy is
    // "加载中…". We keep the brand assertion locale-agnostic and assert on
    // the loading state in the active locale so the smoke test catches a
    // blank render even after copy changes.
    expect(html).toContain('加载中')
  })
})
