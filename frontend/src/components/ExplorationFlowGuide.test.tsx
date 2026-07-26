import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import ExplorationFlowGuide from './ExplorationFlowGuide'

describe('ExplorationFlowGuide', () => {
  it('renders the four-step exploration flow without any interactive state', () => {
    const html = renderToStaticMarkup(<ExplorationFlowGuide />)
    expect(html).toContain('Relationship')
    expect(html).toContain('Evidence')
    expect(html).toContain('Source')
    expect(html).toContain('Historical Context')
    // Stateless: the guide must expose no buttons / inputs / controls.
    expect(html).not.toContain('<button')
    expect(html).not.toContain('<input')
  })
})
