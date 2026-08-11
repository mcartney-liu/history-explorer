import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import CitationList from './CitationList'
import type { AICitation } from '../data/aiClient'

// M12-1: verified citations are navigable; rejected citations are NEVER made
// clickable and are COLLAPSED by default to save space.
describe('CitationList', () => {
  const valid: AICitation[] = [
    { global_id: 'a:b', kind: 'entity', label: 'B' },
    { global_id: 'a:c', kind: 'relationship', label: 'C' },
  ]
  const rejected: AICitation[] = [{ global_id: 'a:bad', kind: 'entity', label: 'Bad' }]

  it('renders verified citations as clickable sources', () => {
    const html = renderToStaticMarkup(<CitationList citations={valid} />)
    expect(html).toContain('事实引用（2）')
    expect(html).toContain('a:b')
    expect(html).toContain('a:c')
    expect(html).toContain('is-clickable')
    expect(html).toContain('role="button"')
  })

  it('shows rejected section toggle collapsed by default', () => {
    const html = renderToStaticMarkup(
      <CitationList citations={valid} rejected_citations={rejected} />,
    )
    expect(html).toContain('未通过验证的引用（1）')
    expect(html).toContain('cl-rejected-toggle')
    expect(html).toContain('aria-expanded="false"')
    // Rejected items are hidden by default to save space.
    expect(html).not.toContain('a:bad')
    expect(html).not.toContain('cl-item-rejected')
  })

  it('never removes rejected toggle even when there are no verified ones', () => {
    const html = renderToStaticMarkup(<CitationList citations={[]} rejected_citations={rejected} />)
    expect(html).toContain('未通过验证的引用（1）')
    expect(html).toContain('cl-rejected-toggle')
  })

  it('renders rejected citations WITHOUT a clickable affordance', () => {
    const html = renderToStaticMarkup(<CitationList citations={[]} rejected_citations={rejected} />)
    expect(html).not.toContain('is-clickable')
    expect(html).not.toContain('role="button"')
  })

  // M12-2 anti-deadlink guard: a timeline citation carries a SYNTHETIC
  // global_id (`topic:timeline:<label>`) that GlobalGraph cannot resolve, so
  // even when a host handler is supplied it MUST NOT be presented as clickable.
  it('renders timeline citations WITHOUT a clickable affordance (M12-2)', () => {
    const timelineCitations: AICitation[] = [
      { global_id: 'topic:timeline:foo', kind: 'timeline', label: 'Foo' },
    ]
    const html = renderToStaticMarkup(
      <CitationList citations={timelineCitations} onCitationClick={() => {}} />,
    )
    expect(html).not.toContain('is-clickable')
    expect(html).not.toContain('role="button"')
    // still rendered as a visible reference
    expect(html).toContain('topic:timeline:foo')
    expect(html).toContain('时间线')
  })
})
