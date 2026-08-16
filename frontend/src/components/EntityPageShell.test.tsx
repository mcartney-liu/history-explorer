import { describe, it, expect, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { EntityPageShellView, type EntityTab, type TabConfig } from './EntityPageShell'

const TEST_TABS: TabConfig[] = [
  { id: 'info', label: '了解', ariaLabel: '了解标签' },
  { id: 'explore', label: '探索', ariaLabel: '探索标签' },
  { id: 'research', label: '研究', ariaLabel: '研究标签' },
  { id: 'analyze', label: '分析', ariaLabel: '分析标签' },
  { id: 'ai', label: 'AI', ariaLabel: 'AI标签' },
]

describe('EntityPageShellView', () => {
  it('renders all tab buttons', () => {
    const html = renderToStaticMarkup(
      <EntityPageShellView activeTab="info" tabs={TEST_TABS} />,
    )
    expect(html).toContain('了解')
    expect(html).toContain('探索')
    expect(html).toContain('研究')
    expect(html).toContain('分析')
    expect(html).toContain('AI')
  })

  it('marks active tab as selected', () => {
    const html = renderToStaticMarkup(
      <EntityPageShellView activeTab="explore" tabs={TEST_TABS} />,
    )
    expect(html).toContain('aria-selected="true"')
  })

  it('renders content for active tab via renderTab', () => {
    const html = renderToStaticMarkup(
      <EntityPageShellView
        activeTab="research"
        tabs={TEST_TABS}
        renderTab={(tab: EntityTab) =>
          tab === 'research' ? '研究面板内容' : null
        }
      />,
    )
    expect(html).toContain('研究面板内容')
  })

  it('renders children when no renderTab provided', () => {
    const html = renderToStaticMarkup(
      <EntityPageShellView activeTab="info" tabs={TEST_TABS}>
        静态子内容
      </EntityPageShellView>,
    )
    expect(html).toContain('静态子内容')
  })

  it('includes aria roles for accessibility', () => {
    const html = renderToStaticMarkup(
      <EntityPageShellView activeTab="info" tabs={TEST_TABS} />,
    )
    expect(html).toContain('role="tablist"')
    expect(html).toContain('role="tab"')
    expect(html).toContain('role="tabpanel"')
  })

  it('renders all five tabs with correct labels', () => {
    const html = renderToStaticMarkup(
      <EntityPageShellView activeTab="ai" tabs={TEST_TABS} />,
    )
    // Verify all labels are present
    expect(html).toContain('了解')
    expect(html).toContain('探索')
    expect(html).toContain('研究')
    expect(html).toContain('分析')
    expect(html).toContain('AI')
  })

  // M44 Tab Guidance
  it('renders guidance for active tab', () => {
    const html = renderToStaticMarkup(
      <EntityPageShellView activeTab="explore" tabs={TEST_TABS} />,
    )
    expect(html).toContain('探索历史关系')
    expect(html).toContain('AI 历史学家')
  })

  it('renders guidance for research tab', () => {
    const html = renderToStaticMarkup(
      <EntityPageShellView activeTab="research" tabs={TEST_TABS} />,
    )
    expect(html).toContain('深入研究')
    expect(html).toContain('启动 4 维度分析')
  })
})
