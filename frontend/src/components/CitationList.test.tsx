import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import CitationList from './CitationList'
import type { AICitation } from '../data/aiClient'

// M12-1: verified citations are navigable; rejected citations are ALWAYS shown
// but NEVER presented as clickable facts.
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

  it('renders rejected citations with an unverified marker', () => {
    const html = renderToStaticMarkup(
      <CitationList citations={valid} rejected_citations={rejected} />,
    )
    expect(html).toContain('未通过验证的引用（1）')
    expect(html).toContain('未通过验证')
    expect(html).toContain('cl-item-rejected')
  })

  it('never hides rejected citations even when there are no verified ones', () => {
    const html = renderToStaticMarkup(<CitationList citations={[]} rejected_citations={rejected} />)
    expect(html).toContain('a:bad')
  })

  it('renders rejected citations WITHOUT a clickable affordance', () => {
    const html = renderToStaticMarkup(<CitationList citations={[]} rejected_citations={rejected} />)
    expect(html).not.toContain('is-clickable')
    expect(html).not.toContain('role="button"')
  })
})
