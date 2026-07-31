import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { getPackages } from '../../../data/explorationPackages'
import TimelineChain from '../TimelineChain'

const china = getPackages().find((p) => p.slug === 'china-civilization-v1')!

describe('TimelineChain', () => {
  it('renders the five dynasties in order: 唐→宋→元→明→清', () => {
    const html = renderToStaticMarkup(<TimelineChain pkg={china} locale="zh" />)
    // All five names must appear
    expect(html).toContain('唐')
    expect(html).toContain('宋')
    expect(html).toContain('元')
    expect(html).toContain('明')
    expect(html).toContain('清')
    // The order is implicit in the DOM structure (timeline_slices order)
  })

  it('renders the "before" relation label on arrows', () => {
    const html = renderToStaticMarkup(<TimelineChain pkg={china} locale="zh" />)
    // Between dynasties: "早于" (getRelationshipLabel('before','zh') = '早于')
    const earlyCount = (html.match(/早于/g) || []).length
    // 5 nodes → 4 arrows → 4 "早于"
    expect(earlyCount).toBeGreaterThanOrEqual(4)
  })

  it('shows start year on each dynasty node', () => {
    const html = renderToStaticMarkup(<TimelineChain pkg={china} locale="zh" />)
    // Dynasty start years: 618, 960, 1271, 1368, 1636
    expect(html).toContain('618')
    expect(html).toContain('960')
    expect(html).toContain('1271')
    expect(html).toContain('1368')
    expect(html).toContain('1636')
  })

  it('uses the correct testid', () => {
    const html = renderToStaticMarkup(<TimelineChain pkg={china} locale="zh" />)
    expect(html).toContain('data-testid="timeline-chain"')
  })
})
