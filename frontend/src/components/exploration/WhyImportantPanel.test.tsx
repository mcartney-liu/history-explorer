// M35 — WhyImportantPanel smoke test (no DOM; renderToStaticMarkup).
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import WhyImportantPanel from './WhyImportantPanel'
import { NARRATIVE } from '../../data/narrative'

describe('WhyImportantPanel', () => {
  it('renders the whyImportant copy for a covered narrativeKey', () => {
    const key = 'roman_empire:civ-roman'
    const html = renderToStaticMarkup(<WhyImportantPanel narrativeKey={key} />)
    expect(html).toContain('why-important-panel')
    expect(html).toContain(`data-narrative-key="${key}"`)
    // content must come verbatim from narrative.ts (no AI generation)
    const snippet = (NARRATIVE[key].whyImportant ?? '').slice(0, 12)
    expect(html).toContain(snippet)
  })

  it('renders nothing for an unknown key', () => {
    const html = renderToStaticMarkup(<WhyImportantPanel narrativeKey="no-such-key" />)
    expect(html).toBe('')
  })

  it('renders the panel for silk_road (topic key)', () => {
    const key = 'silk_road'
    const html = renderToStaticMarkup(<WhyImportantPanel narrativeKey={key} />)
    expect(html).toContain('why-important-panel')
    expect(html).toContain(`data-narrative-key="${key}"`)
  })
})
