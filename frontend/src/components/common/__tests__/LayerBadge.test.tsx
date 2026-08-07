/** M82 P3 — LayerBadge unit tests. */
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import LayerBadge from '../LayerBadge'

// renderToStaticMarkup has no React Context → useLocale returns i18n keys

describe('LayerBadge', () => {
  it('renders causal label', () => {
    const html = renderToStaticMarkup(<LayerBadge layer="causal" />)
    expect(html).toContain('layer.causal')
    expect(html).toContain('layer-badge--causal')
  })

  it('renders inference label', () => {
    const html = renderToStaticMarkup(<LayerBadge layer="inference" />)
    expect(html).toContain('layer.inference')
    expect(html).toContain('layer-badge--inference')
  })

  it('renders evidence label', () => {
    const html = renderToStaticMarkup(<LayerBadge layer="evidence" />)
    expect(html).toContain('layer.evidence')
    expect(html).toContain('layer-badge--evidence')
  })

  it('has aria-label for accessibility', () => {
    const html = renderToStaticMarkup(<LayerBadge layer="causal" />)
    expect(html).toContain('aria-label="layer.causal"')
  })
})
