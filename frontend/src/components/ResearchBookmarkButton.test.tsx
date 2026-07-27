import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ResearchBookmarkView } from './ResearchBookmarkButton'

describe('ResearchBookmarkView', () => {
  it('renders unbookmarked state', () => {
    const html = renderToStaticMarkup(
      <ResearchBookmarkView researchId="r_1" bookmarked={false} />,
    )
    expect(html).toContain('☆ 收藏研究')
    expect(html).not.toContain('已收藏')
  })

  it('renders bookmarked state', () => {
    const html = renderToStaticMarkup(
      <ResearchBookmarkView researchId="r_1" bookmarked={true} />,
    )
    expect(html).toContain('★ 已收藏')
  })

  it('renders labels when present', () => {
    const html = renderToStaticMarkup(
      <ResearchBookmarkView researchId="r_1" bookmarked={true} labels={['重要', '历史']} />,
    )
    expect(html).toContain('重要')
    expect(html).toContain('历史')
  })

  it('renders no labels when empty', () => {
    const html = renderToStaticMarkup(
      <ResearchBookmarkView researchId="r_1" bookmarked={true} labels={[]} />,
    )
    expect(html).not.toContain('rbk-labels')
  })

  it('has appropriate aria labels', () => {
    const html = renderToStaticMarkup(
      <ResearchBookmarkView researchId="r_1" bookmarked={false} />,
    )
    expect(html).toContain('点击收藏该研究')
  })
})
