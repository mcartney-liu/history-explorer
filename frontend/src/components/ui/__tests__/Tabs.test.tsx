import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { Tabs } from '../Tabs'

const items = [
  { id: 'understand', label: '了解', ariaControls: 'panel-understand' },
  { id: 'research', label: '研究' },
  { id: 'expand', label: '扩展' },
]

describe('ui/Tabs (DS Lite)', () => {
  it('renders tablist with role=tab buttons and active state', () => {
    const html = renderToStaticMarkup(
      <Tabs items={items} active="understand" onChange={() => {}} ariaLabel="探索分类" />,
    )
    expect(html).toContain('role="tablist"')
    expect(html).toContain('aria-label="探索分类"')
    expect(html).toContain('role="tab"')
    expect(html).toContain('id="tab-understand"')
    expect(html).toContain('aria-selected="true"')
    expect(html).toContain('aria-selected="false"')
  })

  it('applies active class to the selected tab', () => {
    const html = renderToStaticMarkup(
      <Tabs items={items} active="research" onChange={() => {}} tabClassName="discover-tab" />,
    )
    expect(html).toContain('class="discover-tab active"')
    expect(html).toContain('aria-controls="panel-understand"')
  })

  it('passes through container className', () => {
    const html = renderToStaticMarkup(
      <Tabs items={items} active="understand" onChange={() => {}} className="discover-tabs" />,
    )
    expect(html).toContain('class="tabs discover-tabs"')
  })
})
