// ============================================================
// ProductIntro tests — Wave2-#140 (test-drift alignment)
//
// Background: these assertions used to live in DiscoverPage.test.tsx
// (M44 "Guidance" block). In M90.3 the capability showcase was
// extracted out of DiscoverPage into components/shell/ProductIntro
// and re-mounted at App level, but the tests were left behind in
// DiscoverPage.test.tsx where they could no longer pass (OD-08).
//
// Rather than delete the stale assertions (which would silently drop
// coverage), they are moved here, onto the component that actually
// owns the markup, and refreshed against the shipped copy.
// ============================================================

import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ProductIntro } from './ProductIntro'

describe('ProductIntro (M90.3, ex-DiscoverPage M44)', () => {
  it('renders the product introduction heading', () => {
    const html = renderToStaticMarkup(<ProductIntro />)
    expect(html).toContain('History Explorer 能做什么')
  })

  it('showcases all four capabilities', () => {
    const html = renderToStaticMarkup(<ProductIntro />)
    expect(html).toContain('历史叙事')
    expect(html).toContain('关系探索')
    expect(html).toContain('深度研究')
    // NOTE: shipped copy is 「AI 历史学家」. The old DiscoverPage test
    // asserted 「AI 历史对话」, which drifted out of sync long ago.
    expect(html).toContain('AI 历史学家')
  })

  it('renders one card per capability with an icon', () => {
    const html = renderToStaticMarkup(<ProductIntro />)
    const cards = html.match(/discover-intro-card/g) ?? []
    expect(cards.length).toBe(4)
    const icons = html.match(/discover-intro-icon/g) ?? []
    expect(icons.length).toBe(4)
  })

  it('uses SVG icons only — no emoji glyphs (P0-1 guard)', () => {
    const html = renderToStaticMarkup(<ProductIntro />)
    const emoji =
      /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE0F}]/u
    expect(emoji.test(html)).toBe(false)
    expect(html).toContain('<svg')
  })
})
