// M35 Feature E — FeedbackWidget smoke test (node env, renderToStaticMarkup).
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import FeedbackWidget from './FeedbackWidget'

describe('FeedbackWidget', () => {
  it('renders the prompt and the two sentiment buttons', () => {
    const html = renderToStaticMarkup(<FeedbackWidget />)
    expect(html).toContain('feedback-widget')
    expect(html).toContain('这个探索有用吗？')
    expect(html).toContain('data-sentiment="up"')
    expect(html).toContain('data-sentiment="down"')
    expect(html).toContain('feedback-message')
  })

  it('forwards the page prop without breaking render', () => {
    const html = renderToStaticMarkup(<FeedbackWidget page="entity" />)
    expect(html).toContain('feedback-widget')
  })
})
