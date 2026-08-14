import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ResearchDimensionCardView, type ResearchDimension } from './ResearchDimensionCard'

function dim(overrides: Partial<ResearchDimension> = {}): ResearchDimension {
  return {
    id: 'dim-0',
    title: '政治制度',
    question: '政治制度如何影响？',
    status: 'idle',
    ...overrides,
  }
}

describe('ResearchDimensionCardView', () => {
  it('renders idle state', () => {
    const html = renderToStaticMarkup(<ResearchDimensionCardView dimension={dim()} />)
    expect(html).toContain('政治制度')
    expect(html).toContain('等待研究开始')
  })

  it('renders loading state', () => {
    const html = renderToStaticMarkup(
      <ResearchDimensionCardView dimension={dim({ status: 'loading' })} />,
    )
    expect(html).toContain('正在分析')
  })

  it('renders success state with grounded answer', () => {
    const html = renderToStaticMarkup(
      <ResearchDimensionCardView
        dimension={dim({
          status: 'success',
          answer: 'This civilization had a strong political system.',
          citations: [{ global_id: 'a:b', kind: 'entity', label: 'B' }],
          grounded: true,
        })}
        externalExpand={true}
      />,
    )
    expect(html).toContain('This civilization had a strong political system.')
    expect(html).toContain('已通过事实溯源验证')
  })

  it('renders error state', () => {
    const html = renderToStaticMarkup(
      <ResearchDimensionCardView
        dimension={dim({ status: 'error', error: 'Network timeout' })}
      />,
    )
    expect(html).toContain('分析失败')
    expect(html).toContain('Network timeout')
  })

  it('renders citations on success', () => {
    const html = renderToStaticMarkup(
      <ResearchDimensionCardView
        dimension={dim({
          status: 'success',
          answer: 'Answer.',
          citations: [{ global_id: 'a:b', kind: 'entity', label: 'B' }],
          grounded: false,
        })}
        externalExpand={true}
      />,
    )
    expect(html).toContain('a:b')
  })

  // --- M38 Phase 2: UX enhancements ---

  it('shows grounded badge when verified', () => {
    const html = renderToStaticMarkup(
      <ResearchDimensionCardView
        dimension={dim({
          status: 'success', answer: 'Answer.',
          grounded: true,
          citations: [{ global_id: 'x', kind: 'entity', label: 'X' }],
        })}
      />,
    )
    expect(html).toContain('已验证')
  })

  it('shows citation count', () => {
    const html = renderToStaticMarkup(
      <ResearchDimensionCardView
        dimension={dim({
          status: 'success', answer: 'Answer.',
          grounded: true,
          citations: [
            { global_id: 'a', kind: 'entity', label: 'A' },
            { global_id: 'b', kind: 'entity', label: 'B' },
          ],
        })}
      />,
    )
    expect(html).toContain('2 条引用')
  })

  // --- 2026-08-13 (P-U03 / P-U04 纠偏 / P-U09 / P-U10) ---

  it('shows 查看报告 (modal trigger) and 重研 button when onResearch provided (success)', () => {
    const html = renderToStaticMarkup(
      <ResearchDimensionCardView
        dimension={dim({
          status: 'success',
          answer: 'Answer.',
          citations: [{ global_id: 'x', kind: 'entity', label: 'X' }],
          grounded: true,
        })}
        dimKey="politics"
        onResearch={() => {}}
        externalExpand={true}
      />,
    )
    expect(html).toContain('查看报告')
    expect(html).toContain('重研')
    // P-U09：externalExpand 受控内联展开正文（否则仅弹 modal，正文不进 DOM）
    expect(html).toContain('Answer.')
  })

  it('renders admin artwork when artSrc provided (P-U10)', () => {
    const html = renderToStaticMarkup(
      <ResearchDimensionCardView
        dimension={dim({ status: 'success', answer: 'Answer.', grounded: true, citations: [] })}
        dimKey="politics"
        artSrc="/api/v1/content/media/politics_admin.png"
      />,
    )
    expect(html).toContain('/api/v1/content/media/politics_admin.png')
    expect(html).toContain('has-art')
  })

  it('shows 研究 button for idle dimension when onResearch provided', () => {
    const html = renderToStaticMarkup(
      <ResearchDimensionCardView
        dimension={dim({ status: 'idle' })}
        dimKey="politics"
        onResearch={() => {}}
      />,
    )
    expect(html).toContain('研究')
    expect(html).not.toContain('等待研究开始')
  })

  it('does not show 重研 button when onResearch not provided', () => {
    const html = renderToStaticMarkup(
      <ResearchDimensionCardView
        dimension={dim({ status: 'success', answer: 'Answer.', grounded: true, citations: [] })}
      />,
    )
    expect(html).not.toContain('重研')
  })
})
