import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { EmptyState } from '../EmptyState'

describe('ui/EmptyState (DS Lite)', () => {
  it('renders title + description', () => {
    const html = renderToStaticMarkup(
      <EmptyState title="未找到探索包" description="请返回首页重新选择。" />,
    )
    expect(html).toContain('class="empty-state"')
    expect(html).toContain('未找到探索包')
    expect(html).toContain('请返回首页重新选择。')
  })

  it('renders children and merges className', () => {
    const html = renderToStaticMarkup(
      <EmptyState title="空" className="package-page--missing">
        <button type="button">返回</button>
      </EmptyState>,
    )
    expect(html).toContain('class="empty-state package-page--missing"')
    expect(html).toContain('>返回</button>')
  })
})
