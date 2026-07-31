import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { getPackages } from '../../../data/explorationPackages'
import RecommendedNext from '../RecommendedNext'

const china = getPackages().find((p) => p.slug === 'china-civilization-v1')!
const noop = () => {}

describe('RecommendedNext', () => {
  it('renders entity recommendations with labels', () => {
    const html = renderToStaticMarkup(
      <RecommendedNext pkg={china} locale="zh" onEntityClick={noop} />,
    )
    // pointer.label.zh values from package data
    expect(html).toContain('宋代理学')
    expect(html).toContain('明代航海技术')
    // kind badge
    expect(html).toContain('实体')
  })

  it('renders package recommendations', () => {
    const html = renderToStaticMarkup(
      <RecommendedNext pkg={china} locale="zh" onOpenPackage={noop} />,
    )
    expect(html).toContain('宋代文化繁荣探索包（规划中）')
    // kind badge
    expect(html).toContain('探索包')
  })

  it('uses the correct testid', () => {
    const html = renderToStaticMarkup(<RecommendedNext pkg={china} locale="zh" />)
    expect(html).toContain('data-testid="recommended-next"')
  })
})
