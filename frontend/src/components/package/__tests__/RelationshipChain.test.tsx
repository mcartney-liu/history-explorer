import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { getPackages } from '../../../data/explorationPackages'
import RelationshipChain from '../RelationshipChain'

const china = getPackages().find((p) => p.slug === 'china-civilization-v1')!

describe('RelationshipChain', () => {
  it('renders the inherited spine: 科举制度→文官体系→内阁制度', () => {
    const html = renderToStaticMarkup(<RelationshipChain pkg={china} locale="zh" />)
    expect(html).toContain('科举制度')
    expect(html).toContain('文官体系')
    expect(html).toContain('内阁制度')
    // Relation label "继承为" (getRelationshipLabel('inherited','zh'))
    const inheritedCount = (html.match(/继承为/g) || []).length
    // 2 inherited edges → 2 arrows with "继承为"
    expect(inheritedCount).toBe(2)
  })

  it('renders side influences (靖难之役→内阁, 宋太祖→文官体系, 科举确立→科举)', () => {
    const html = renderToStaticMarkup(<RelationshipChain pkg={china} locale="zh" />)
    expect(html).toContain('靖难之役')
    expect(html).toContain('宋太祖')
    expect(html).toContain('科举确立')
    // Side labels
    expect(html).toContain('影响')
    expect(html).toContain('导致')
  })

  it('includes "同时受到" side heading', () => {
    const html = renderToStaticMarkup(<RelationshipChain pkg={china} locale="zh" />)
    expect(html).toContain('同时受到')
  })

  it('uses the correct testid', () => {
    const html = renderToStaticMarkup(<RelationshipChain pkg={china} locale="zh" />)
    expect(html).toContain('data-testid="relationship-chain"')
  })
})
