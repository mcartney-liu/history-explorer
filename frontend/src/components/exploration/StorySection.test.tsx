// M35 — StorySection smoke test (no DOM; renderToStaticMarkup).
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import StorySection from './StorySection'
import { NARRATIVE } from '../../data/narrative'

describe('StorySection', () => {
  it('renders the story copy for a covered narrativeKey', () => {
    const key = 'ancient_india:religion-buddhism'
    const html = renderToStaticMarkup(<StorySection narrativeKey={key} />)
    expect(html).toContain('story-section')
    expect(html).toContain(`data-narrative-key="${key}"`)
    // content must come verbatim from narrative.ts (no AI generation)
    const snippet = (NARRATIVE[key].story ?? '').slice(0, 12)
    expect(html).toContain(snippet)
  })

  it('renders nothing for an unknown key', () => {
    const html = renderToStaticMarkup(<StorySection narrativeKey="no-such-key" />)
    expect(html).toBe('')
  })

  it('renders the story section for a topic key (silk_road)', () => {
    const key = 'silk_road'
    const html = renderToStaticMarkup(<StorySection narrativeKey={key} />)
    expect(html).toContain('story-section')
    expect(html).toContain(`data-narrative-key="${key}"`)
    const snippet = (NARRATIVE[key].story ?? '').slice(0, 12)
    expect(html).toContain(snippet)
  })
})
